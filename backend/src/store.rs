use secrecy::{ExposeSecret, SecretString};
use std::{path::PathBuf, str::FromStr};

use anyhow::{Context, Result};
use log::{error, info};
use sqlx::{types::chrono::Utc, SqlitePool};
use std::fs::File;
use thiserror::Error;
use uuid::Uuid;

use crate::{
    authentication::{compute_password_hash, verify_password_hash, AuthError},
    text::Lang,
    types,
};

// Basic DB CRUD layer, isolate SQL queries from the rest of the code.
// Some of the response models
pub struct DB {
    pub pool: SqlitePool,
}
impl DB {
    pub async fn from_url(url: impl AsRef<str>) -> DB {
        let url = url.as_ref();
        let Some(filename) = url.strip_prefix("sqlite://") else {
            panic!("Can't setup database sqlite file prefix is wrong {}", url)
        };
        let path = PathBuf::from_str(filename).expect("Path should be valid");
        let fname = path.to_str().unwrap();
        if !path.exists() {
            info!("Making database file {}", fname);
            File::create(&path).expect("File failed to create.");
        }
        info!("Connecting to database at {}:{}", fname, url);

        let db = DB {
            pool: sqlx::SqlitePool::connect(url)
                .await
                .expect("can't connect to db"),
        };
        sqlx::migrate!("./migrations").run(&db.pool).await.unwrap();
        for i in 1..5 {
            let l = Lang::try_from(i).unwrap().to_string();
            sqlx::query!(
                "INSERT INTO langauges (id, lang) VALUES ($1, $2) ON CONFLICT DO NOTHING;",
                i,
                l
            )
            .execute(&db.pool)
            .await
            .unwrap();
        }
        db
    }
}

#[derive(thiserror::Error, Debug)]
pub enum RegisterError {
    #[error("User with name already exists.")]
    UserEmailAlreadyExists(#[source] sqlx::Error),
    #[error("User Email already exists.")]
    UserNameAlreadyExists(#[source] sqlx::Error),
    #[error(transparent)]
    UnexpectedError(#[from] anyhow::Error),
}

impl DB {
    // Goals
    pub async fn get_user_goal(&self, user_id: Uuid) -> Result<types::UserGoal> {
        let user_id = user_id.to_string();
        sqlx::query!(
            r#"SELECT accuracy, wpm, time_spent FROM user_goals WHERE user_id = $1 LIMIT 1"#,
            user_id,
        )
        .fetch_one(&self.pool)
        .await
        .map_err(|e| anyhow::anyhow!("Get user goal failed due to {}.", e))
        .map(|row| types::UserGoal {
            accuracy: row.accuracy,
            wpm: row.wpm,
            time_spent: row.time_spent,
        })
    }
    pub async fn set_user_goal(&self, user_id: Uuid, goal: types::UserGoal) -> Result<()> {
        let user_id = user_id.to_string();
        sqlx::query!(
            r#"INSERT INTO user_goals (user_id, accuracy, wpm, time_spent)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE SET accuracy = $2, wpm = $3, time_spent = $4"#,
            user_id,
            goal.accuracy,
            goal.wpm,
            goal.time_spent,
        )
        .execute(&self.pool)
        .await
        .context("Upsert user goal failed due to:")?;
        info!("Upsert user goal succeeded: {}", user_id);
        Ok(())
    }
    // Users
    pub async fn add_user(&self, user: types::User) -> Result<uuid::Uuid, RegisterError> {
        let new_id = Uuid::new_v4();
        let new_id_str = new_id.to_string();
        let password = compute_password_hash(user.password)?;
        let password = password.expose_secret();
        let created_at = Utc::now();
        let id = sqlx::query_scalar!(
            r#"INSERT INTO users (id, username, user_password, email, created_at, text_length_prefernce, active)
            VALUES ($1, $2, $3, $4, $5, 300, true)
            RETURNING id;"#,
            new_id_str,
            user.username,
            password,
            user.email,
            created_at,

        )
        .fetch_one(&self.pool)
        .await;
        match id {
            Ok(id) => {
                assert_eq!(new_id_str, id, "New user id doesn't match.");
                self.set_user_goal(new_id, types::UserGoal::new(95.0, 120.0, 300.0))
                    .await?;
                let new_id_back =
                    Uuid::parse_str(&id).context("Parsing UUID string returned from DB failed:")?;
                Ok(new_id_back)
            }
            Err(e) => {
                if e.as_database_error().map(|e| e.is_unique_violation()) == Some(true) {
                    let message = e.to_string().to_lowercase();
                    if message.contains("email") {
                        return Err(RegisterError::UserEmailAlreadyExists(e));
                    } else if message.contains("username") {
                        return Err(RegisterError::UserNameAlreadyExists(e));
                    };
                    error!("Unexpected error during user registration due to {}.", e);
                    Err(RegisterError::UnexpectedError(e.into()))
                } else {
                    Err(RegisterError::UnexpectedError(e.into()))
                }
            }
        }
    }
    pub async fn verify_user(
        &self,
        user: types::User,
    ) -> std::result::Result<uuid::Uuid, AuthError> {
        // Set a dummy hash to make timing attacks impossible.
        // Means same work is done for both success and failure.
        let mut expected_password_hash = SecretString::from(
            "$argon2id$v=19$m=15000,t=2,p=1$\
            gZiV/M1gPc22ElAH/Jh1Hw$\
            CWOrkoo7oJBQ/iyh7uJ0LO2aLEfrHwTWllSAxT0zRno"
                .to_string(),
        );
        let mut user_id = Uuid::nil();
        if let Some((id, password)) = sqlx::query!(
            r#"SELECT id, user_password FROM users WHERE username = $1"#,
            user.username
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed query user password during verification:")?
        .map(|r| (r.id, r.user_password))
        {
            // If we find the user, we update the dummy creds.
            user_id = Uuid::parse_str(&id).context("Invalid user id")?;
            expected_password_hash = SecretString::from(password);
        };

        tokio::task::spawn_blocking(move || {
            verify_password_hash(expected_password_hash, user.password)
        })
        .await
        .context("Failed to spawn blocking task.")?;
        Ok(user_id)
    }
    // Runs
    pub async fn get_runs(&self, user_id: Uuid) -> Result<impl Iterator<Item = types::TypingInfo>> {
        let user_id = user_id.to_string();
        let query_rows = sqlx::query!(
            r#"
            SELECT
                t.title,
                l.lang,
                r.wpm,
                r.errors,
                r.start_index,
                r.end_index,
                r.topic_id,
                r.type_time,
                r.created_at
            FROM user_runs as r
            INNER JOIN topics as t ON r.topic_id = t.id
            INNER JOIN langauges as l ON t.lang_id =l.id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC"#,
            user_id
        )
        .fetch_all(&self.pool)
        .await
        .context("Failed to query user_runs.")?
        .into_iter()
        .map(|row| {
            let typing_length = row.end_index - row.start_index;
            dbg!(&row.errors);
            dbg!(&row.wpm);
            let counts = parse_error_count(&row.errors);
            types::TypingInfo::new(
                row.wpm,
                typing_length as usize,
                counts as f64 / typing_length as f64,
                row.title,
                row.lang,
                row.type_time,
                row.start_index as usize,
                row.end_index as usize,
                row.topic_id as usize,
                row.created_at.and_utc(),
            )
        });
        Ok(query_rows)
    }
    pub async fn add_run(&self, run: types::UserData) -> Result<()> {
        let mut error_string = String::new();
        for (key, count) in run.error_chars {
            error_string.push_str(&format!("{}:{},", key, count));
        }

        let user_id = run
            .user_id
            .parse::<Uuid>()
            .context("Invalid user id")?
            .to_string();
        let topic_id = run.topic_id as u32;
        let start_idx = run.start_idx as u32;
        let end_idx = run.end_idx as u32;
        let cur_time = Utc::now();

        sqlx::query!(
            r#"INSERT INTO user_runs
            (user_id, errors, finished, start_index, end_index, topic_id, wpm, type_time, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)"#,
            user_id,
            error_string,
            run.finished,
            start_idx,
            end_idx,
            topic_id,
            run.wpm,
            run.type_time_ms,
            cur_time,
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
        .context("Error during inserting user run.")?;

        sqlx::query!(
            r#"INSERT INTO user_progress (user_id, final_idx, topic_id) VALUES ($1, $2, $3);"#,
            user_id,
            end_idx,
            topic_id
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
        .context("Error during inserting user progress")?;
        Ok(())
    }
    pub async fn user_length_preference(&self, user_id: Uuid) -> Result<usize> {
        sqlx::query_scalar!(
            r#"SELECT text_length_prefernce FROM users WHERE id = $1 LIMIT 1;"#,
            user_id,
        )
        .fetch_one(&self.pool)
        .await
        .context("Get user length failed due to:")
        .map(|x| x as usize)
    }
    pub async fn user_progress(
        &self,
        user_id: Uuid,
    ) -> Result<impl Iterator<Item = types::TopicProgress>> {
        let str_id = user_id.to_string();
        Ok(sqlx::query!(
            r#"SELECT MAX(p.final_idx) as final_idx, p.topic_id, l.lang, t.text_len, t.title
            FROM user_progress as p INNER JOIN topics as t on p.topic_id = t.id
            INNER JOIN langauges AS l ON t.lang_id = l.id
            WHERE p.user_id = $1 GROUP BY p.topic_id;"#,
            str_id
        )
        .fetch_all(&self.pool)
        .await
        .context("User progress query failed due to:")?
        .into_iter()
        .filter_map(|row| {
            Some(types::TopicProgress::new(
                row.topic_id? as usize,
                row.final_idx as f32 / row.text_len?.max(1) as f32,
                row.final_idx as usize,
                row.lang?,
                row.title?,
            ))
        }))
    }
    // Topics
    pub async fn add_topic(&self, topic: &str, body: &str, lang: &str, title: &str) -> Result<i64> {
        let len = body.len() as i32;
        Lang::try_from(lang)?;
        let lang_key = sqlx::query_scalar!(r#"SELECT id FROM langauges where lang = $1;"#, lang)
            .fetch_one(&self.pool)
            .await?;

        sqlx::query_scalar!(
            r#"INSERT INTO topics
            (topic, topic_text, text_len, lang_id, title)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;"#,
            topic,
            body,
            len,
            lang_key,
            title,
        )
        .fetch_one(&self.pool)
        .await
        .context("Adding topic failed due to:")
    }
    pub async fn random_topic(&self) -> Result<(i32, String)> {
        sqlx::query!(r#"SELECT id, topic FROM topics ORDER BY RANDOM() LIMIT 1"#)
            .fetch_one(&self.pool)
            .await
            .map(|row| (row.id as i32, row.topic))
            .context("During random topic query database fetch failed.")
    }
    pub async fn topic_count(&self) -> Result<u64> {
        sqlx::query_scalar!("SELECT COUNT(id) FROM topics;")
            .fetch_one(&self.pool)
            .await
            .map(|i| i as u64)
            .context("Failed to count topics.")
    }
    pub async fn max_progress_by_topic(
        &self,
    ) -> Result<impl Iterator<Item = (f64, usize, String, uuid::Uuid)>> {
        Ok(sqlx::query!(
            r#"SELECT
            topic_id,
            final_idx,
            text_len,
            topic,
            user_id
            FROM user_progress AS p INNER JOIN topics AS t on p.topic_id = t.id
            GROUP BY topic_id, final_idx, text_len, topic, user_id;"#
        )
        .fetch_all(&self.pool)
        .await
        .context("Max progress by topic query failed due to:")?
        .into_iter()
        .map(|row| {
            (
                row.final_idx as f64 / row.text_len.max(1) as f64,
                row.topic_id as usize,
                row.topic,
                Uuid::parse_str(&row.user_id).expect("Expect database to only have valid uuid."),
            )
        }))
    }
    pub async fn get_topics(&self) -> Result<Vec<types::TopicData>> {
        let rows = sqlx::query!(
            r#"SELECT title, lang, topics.id FROM topics INNER JOIN langauges ON topics.lang_id = langauges.id;"#
        )
        .fetch_all(&self.pool)
        .await
        .context("Topics query failed due to")?;
        let mut langs: Vec<types::TopicData> = vec![];
        for row in rows {
            if langs.iter().find(|l| l.lang == row.lang).is_none() {
                langs.push(types::TopicData {
                    lang: row.lang,
                    topics: vec![(row.id as i32, row.title)],
                });
            } else {
                let topics = langs
                    .iter_mut()
                    .find(|l| l.lang == row.lang)
                    .expect("We handle the case where lang exists.");
                topics.topics.push((row.id as i32, row.title));
            }
        }

        Ok(langs)
    }
    pub async fn get_topic_text(&self, topic_id: i32) -> Result<String> {
        sqlx::query_scalar!(r#"SELECT topic_text FROM topics WHERE id = $1;"#, topic_id,)
            .fetch_one(&self.pool)
            .await
            .context("Get text failed due to:")
    }
}

fn parse_error_count(errors: &str) -> usize {
    errors.split(',').fold(0, |acc, v| {
        acc + v
            .chars()
            .nth_back(0)
            .unwrap_or('0')
            .to_digit(10)
            .expect(&format!("{} is not a digit.", v)) as usize
    })
}
#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_parse_errors() {
        let errors = "a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:10,k:11,l:12,m:13,n:14,o:15,p:16,q:17,r:18,s:19,t:20,u:21,v:22,w:23,x:24,y:25,z:26,aa:27,ab:28,ac:29,ad:30,ae:31,af:32,ag:33,ah:34,ai:35,aj:36,ak:37,al:38,am:39,an:40,ao:41,ap:42";
        let out = parse_error_count(errors);
        assert_ne!(out, 0);
    }
}
