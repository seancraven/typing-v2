use anyhow::{Context, Result};
use serde::Deserialize;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::UserData;

// Currently DB stores all text not bad.
pub struct DB {
    pub pool: SqlitePool,
}
impl DB {
    pub async fn from_url(url: String) -> DB {
        DB {
            pool: sqlx::SqlitePool::connect(&url)
                .await
                .expect("can't connect to db"),
        }
    }
}
#[derive(Debug, Deserialize)]
pub struct User {
    username: String,
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

impl DB {
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
        let topic_id = run.topic_id as i32;

        sqlx::query!(
            r#"INSERT INTO user_runs (user_id, errors, finished, start_index, end_index, topic_id, wpm, type_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8 )"#,
            user_id,
            error_string,
            run.finished,
            0 as i32,
            150 as i32,
            topic_id,
            run.wpm,
            run.type_time_ms
        ).execute(&self.pool).await.map(|_|()).context("")
    }
    pub async fn add_user(&self, user: User) -> Result<uuid::Uuid> {
        let new_id = Uuid::new_v4();
        let id = sqlx::query_scalar!(
            r#"INSERT INTO users (id, username, user_password, email) VALUES ($1, $2, $3, $4) RETURNING id;"#,
            new_id,
            user.username,
            user.password,
            user.email
        )
        .fetch_one(&self.pool)
        .await.context("User add query failed due to:")?;
        let new_id_back =
            Uuid::parse_str(&id).context("Parsing UUID string returned from DB failed:")?;
        assert_eq!(new_id_back, new_id);
        Ok(new_id_back)
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
            .context("")
            .map(|_| ())
    }
    pub async fn ingest(&self, text_body: impl AsRef<str>, topic: String) -> Result<()> {
        let text = text_body.as_ref();
        let len = text.len() as i32;
        sqlx::query!(
            "INSERT INTO topics (topic_text, topic, text_len) VALUES ($1, $2, $3);",
            text,
            topic,
            len
        )
        .execute(&self.pool)
        .await
        .context("")
        .map(|_| ())
    }
    pub async fn text(&self, topic_id: i32) -> Result<String> {
        sqlx::query_scalar!(r#"SELECT topic_text FROM topics WHERE id = $1;"#, topic_id,)
            .fetch_one(&self.pool)
            .await
            .context("Get text failed due to:")
    }
    pub async fn random_text(&self) -> Result<(String, String)> {
        sqlx::query!(r#"SELECT topic, topic_text FROM topics ORDER BY RANDOM() LIMIT 1;"#)
            .fetch_one(&self.pool)
            .await
            .map(|b| (b.topic, b.topic_text))
            .context("Random text query failed due to:")
    }
    pub async fn user_length_pref(&self, user_id: Uuid) -> Result<usize> {
        Ok(150)
    }
    pub async fn random_topic(&self) -> Result<(i32, String)> {
        sqlx::query!(r#"SELECT id, topic FROM topics ORDER BY RANDOM() LIMIT 1"#)
            .fetch_one(&self.pool)
            .await
            .map(|row| (row.id as i32, row.topic))
            .context("During random topic query database fetch failed.")
    }
    pub async fn user_progress(&self, user_id: Uuid) -> Result<Vec<(f32, usize, String)>> {
        let rows = sqlx::query!(
            r#"SELECT p.final_idx, p.topic_id, t.topic ,t.topic_text
            FROM user_progress as p INNER JOIN topics as t on p.topic_id = t.id
            WHERE user_id = $1;"#,
            user_id
        )
        .fetch_all(&self.pool)
        .await
        .context("User progress query failed due to:")?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push((
                row.final_idx as f32 / row.topic_text.len() as f32,
                row.topic_id as usize,
                row.topic,
            ));
        }
        Ok(out)
    }
    pub async fn get_max_progress_by_topic(&self) -> Result<Vec<(f64, usize, String, uuid::Uuid)>> {
        sqlx::query!(
            r#"SELECT topic_id, CAST(final_idx as flaot) / CAST(text_len AS FLOAT) as result, topic, user_id
            FROM user_progress AS p INNER JOIN topics AS t on p.topic_id = t.id
            GROUP BY topic_id, final_idx, text_len, topic, user_id;"#
        )
        .fetch_all(&self.pool)
        .await.context("Max progress by topic query failed due to:")?
        .into_iter()
        .map(|row| {
            Ok((
                row.result ,
                row.topic_id as usize,
                row.topic,
                Uuid::parse_str(&row.user_id).context("Expect database to only have valid uuid.")?,
            ))
        })
        .collect()
    }
}
