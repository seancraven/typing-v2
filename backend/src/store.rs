use std::{path::PathBuf, str::FromStr};

use anyhow::{Context, Result};
use log::{error, info};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::fs::File;
use uuid::Uuid;

use crate::UserData;

// Currently DB stores all text not bad.
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
        DB {
            pool: sqlx::SqlitePool::connect(url)
                .await
                .expect("can't connect to db"),
        }
    }
}
#[derive(Debug, Deserialize)]
pub struct User {
    pub username: String,
    password: String,
    email: String,
}
#[derive(Debug)]
pub struct TypingRun {
    user_id: Uuid,
    wpm: f64,
    errors: String,
}
impl TryFrom<UserData> for TypingRun {
    type Error = uuid::Error;
    fn try_from(value: UserData) -> Result<Self, Self::Error> {
        let mut error_string = String::new();
        for (key, count) in value.error_chars {
            error_string.push_str(&format!("{}:{},", key, count));
        }
        Ok(TypingRun {
            user_id: uuid::Uuid::parse_str(&value.user_id)?,
            wpm: value.wpm,
            errors: error_string,
        })
    }
}

#[derive(thiserror::Error, Debug)]
pub enum LoginErr {
    #[error("No user with username {0}")]
    NoUser(String),
    #[error("Invalid password")]
    BadPassowrd,
    #[error("unknown")]
    Unknown(#[from] anyhow::Error),
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TypingInfo {
    wpm: f64,
    typing_length: usize,
    error_rate: f64,
    title: String,
    lang: String,
}

impl DB {
    pub async fn add_topic(&self, topic: &str, body: &str, lang: &str, title: &str) -> Result<i64> {
        let len = body.len() as i32;
        sqlx::query_scalar!(
            r#"INSERT INTO topics
            (topic, topic_text, text_len, lang, title)
            VALUES ($1, $2, $3, $4, $5) RETURNING id;"#,
            topic,
            body,
            len,
            lang,
            title,
        )
        .fetch_one(&self.pool)
        .await
        .context("Adding topic failed due to:")
    }
    pub async fn add_run(&self, run: UserData) -> Result<()> {
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

        sqlx::query!(
            r#"INSERT INTO user_runs
            (user_id, errors, finished, start_index, end_index, topic_id, wpm, type_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8 )"#,
            user_id,
            error_string,
            run.finished,
            start_idx,
            end_idx,
            topic_id,
            run.wpm,
            run.type_time_ms
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
    pub async fn add_user(&self, user: &User) -> Result<uuid::Uuid> {
        let new_id = Uuid::new_v4();
        let new_id_str = new_id.to_string();
        let id = sqlx::query_scalar!(
            r#"INSERT INTO users (id, username, user_password, email)
            VALUES ($1, $2, $3, $4)
            RETURNING id;"#,
            new_id_str,
            user.username,
            user.password,
            user.email
        )
        .fetch_one(&self.pool)
        .await
        .context("User add query failed due to:")?;
        assert_eq!(new_id_str, id);
        let new_id_back =
            Uuid::parse_str(&id).context("Parsing UUID string returned from DB failed:")?;
        Ok(new_id_back)
    }
    pub async fn get_runs(&self, user_id: Uuid) -> Result<impl Iterator<Item = TypingInfo>> {
        let user_id = user_id.to_string();
        let query_rows = sqlx::query!(
            r#"
            SELECT t.title, t.lang, r.wpm, r.errors, r.start_index, r.end_index FROM user_runs as r
            INNER JOIN topics as t ON r.topic_id = t.id
            WHERE r.user_id = $1"#,
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
            let counts = row
                .errors
                .chars()
                .step_by(2)
                .fold(0, |acc, v| acc + v.to_digit(10).expect("Should be int"));
            TypingInfo {
                wpm: row.wpm,
                typing_length: typing_length as usize,
                error_rate: counts as f64 / typing_length as f64,
                lang: row.lang,
                title: row.title,
            }
        });
        Ok(query_rows)
    }
    pub async fn verify_user(&self, user: User) -> std::result::Result<uuid::Uuid, LoginErr> {
        let row = sqlx::query!(
            r#"SELECT id, user_password FROM users WHERE username = $1"#,
            user.username
        )
        .fetch_optional(&self.pool)
        .await
        .context("Failed query user password during verification:")?;
        match row {
            Some(r) => {
                if r.user_password == user.password {
                    return Ok(Uuid::parse_str(&r.id).context("")?);
                };
                Err(LoginErr::BadPassowrd)
            }
            None => Err(LoginErr::NoUser(user.username)),
        }
    }
    pub async fn ingest_user_documet(&self, text_body: impl AsRef<str>) -> Result<()> {
        let body = text_body.as_ref();
        sqlx::query!("INSERT INTO user_documents (body) VALUES ($1);", body)
            .execute(&self.pool)
            .await
            .context("Ingestion of user document failed.")
            .map(|_| ())
    }
    pub async fn text(&self, topic_id: i32) -> Result<String> {
        sqlx::query_scalar!(r#"SELECT topic_text FROM topics WHERE id = $1;"#, topic_id,)
            .fetch_one(&self.pool)
            .await
            .context("Get text failed due to:")
    }
    pub async fn user_length_pref(&self, user_id: Uuid) -> Result<usize> {
        Ok(300)
    }
    pub async fn random_topic(&self) -> Result<(i32, String)> {
        sqlx::query!(r#"SELECT id, topic FROM topics ORDER BY RANDOM() LIMIT 1"#)
            .fetch_one(&self.pool)
            .await
            .map(|row| (row.id as i32, row.topic))
            .context("During random topic query database fetch failed.")
    }
    pub async fn user_progress(
        &self,
        user_id: Uuid,
    ) -> Result<impl Iterator<Item = (f32, usize, usize, String, String)>> {
        let str_id = user_id.to_string();
        Ok(sqlx::query!(
            r#"SELECT MAX(p.final_idx) as final_idx, p.topic_id, t.lang, t.text_len, t.title
            FROM user_progress as p INNER JOIN topics as t on p.topic_id = t.id
            WHERE p.user_id = $1 GROUP BY p.topic_id;"#,
            str_id
        )
        .fetch_all(&self.pool)
        .await
        .context("User progress query failed due to:")?
        .into_iter()
        .filter_map(|row| {
            Some((
                row.final_idx,
                row.text_len?,
                row.topic_id?,
                row.lang?,
                row.title?,
            ))
        })
        .map(|row| {
            (
                row.0 as f32 / row.1 as f32,
                row.2 as usize,
                row.0 as usize,
                row.3,
                row.4,
            )
        }))
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
}

#[cfg(test)]
mod test {
    use std::{sync::Arc, time::Duration};

    use awc::{Client, Connector};
    use sqlx::query;

    use crate::{rustls_config, text::create_topic_title, UserData};

    use super::*;

    async fn make_mock_db() -> (DB, impl Fn()) {
        let f = "database.db";
        let dest = format!("test-{}.db", Uuid::new_v4().to_string());
        let cloned_dest = dest.clone();
        std::fs::copy(f, &dest).unwrap();
        let close = move || {
            std::fs::remove_file(&cloned_dest).unwrap();
            std::fs::remove_file(format!("{}-shm", &cloned_dest)).unwrap();
            std::fs::remove_file(format!("{}-wal", &cloned_dest)).unwrap();
        };
        (DB::from_url(format!("sqlite://{}", dest)).await, close)
    }

    #[tokio::test]
    async fn test_add_run() {
        env_logger::init();
        let (db, close) = make_mock_db().await;
        let (topic_id, _) = db.random_topic().await.unwrap();
        let dummy_user = User {
            username: "test".into(),
            password: "test".into(),
            email: "test".into(),
        };
        let user = db.add_user(&dummy_user).await.unwrap();
        let run = UserData {
            user_id: user.to_string(),
            end_idx: 150,
            start_idx: 0,
            topic_id: topic_id as usize,
            error_chars: vec![],
            wpm: 100.0,
            finished: false,
            type_time_ms: 10000.0,
        };
        db.add_run(run).await.unwrap();
        tokio::time::sleep(Duration::from_secs(1)).await;
        let prog = db.user_progress(user).await.unwrap().collect::<Vec<_>>();
        close();
        assert!(prog.len() == 1);
    }
    #[tokio::test]
    async fn test_max_prog() {
        let (db, close) = make_mock_db().await;
        let progs = db
            .max_progress_by_topic()
            .await
            .unwrap()
            .collect::<Vec<_>>();
        for (prog, _, _, _) in progs {
            assert!(prog <= 1.0);
            assert!(prog >= 0.0);
        }
        close();
    }

    #[actix_web::test]
    async fn test_add_topics() {
        let client_tls_config = Arc::new(rustls_config());
        let client = Client::builder()
            .connector(Connector::new().rustls_0_23(client_tls_config.clone()))
            .finish();
        let db = DB::from_url("sqlite://database.db").await;
        let query = sqlx::query!(r#"SELECT id, topic_text FROM topics;"#)
            .fetch_all(&db.pool)
            .await
            .unwrap();
        for row in query {
            let mut title = create_topic_title(&row.topic_text, &client).await.unwrap();
            let mut i = 0;
            while title.contains(".") {
                println!("Title {}:{title}", row.id);
                title = create_topic_title(&row.topic_text, &client).await.unwrap();
                if i == 3 {
                    break;
                }
                i += 1;
            }
            println!("Title {}:{title}", row.id);
            sqlx::query!("UPDATE topics SET title = $1 where id  = $2", title, row.id)
                .execute(&db.pool)
                .await
                .unwrap();
        }
    }
    // #[actix_web::test]
    async fn _add_title() {
        let client_tls_config = Arc::new(rustls_config());
        let client = Client::builder()
            .connector(Connector::new().rustls_0_23(client_tls_config.clone()))
            .finish();
        let db = DB::from_url("sqlite://database.db").await;
        let rows = sqlx::query!("SELECT id, topic, topic_text FROM topics;")
            .fetch_all(&db.pool)
            .await
            .unwrap()
            .into_iter();
        for row in rows {
            let mut title = create_topic_title(&row.topic_text, &client).await.unwrap();
            dbg!(&title);

            let mut i = 0;
            while title.contains(".") {
                title = create_topic_title(&row.topic_text, &client).await.unwrap();
                if i > 3 {
                    panic!();
                }
                i += 1;
            }
            query!("UPDATE topics SET title = $1 WHERE id = $2", title, row.id)
                .execute(&db.pool)
                .await
                .unwrap();
        }
    }
}
