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

impl DB {
    pub async fn add_topic(&self, topic: &str, body: &str, lang: &str) -> Result<i64> {
        let len = body.len() as i32;
        sqlx::query_scalar!(
            r#"INSERT INTO topics 
            (topic, topic_text, text_len, lang)
            VALUES ($1, $2, $3, $4) RETURNING id;"#,
            topic,
            body,
            len,
            lang,
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
        let topic_id = run.topic_id as i32;

        sqlx::query!(
            r#"INSERT INTO user_runs 
            (user_id, errors, finished, start_index, end_index, topic_id, wpm, type_time)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8 )"#,
            user_id,
            error_string,
            run.finished,
            0 as i32,
            150 as i32,
            topic_id,
            run.wpm,
            run.type_time_ms
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
        .context("")
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
        Ok(150)
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
    ) -> Result<impl Iterator<Item = (f32, usize, String)>> {
        Ok(sqlx::query!(
            r#"SELECT p.final_idx, p.topic_id, t.topic ,t.topic_text
            FROM user_progress as p INNER JOIN topics as t on p.topic_id = t.id
            WHERE user_id = $1;"#,
            user_id
        )
        .fetch_all(&self.pool)
        .await
        .context("User progress query failed due to:")?
        .into_iter()
        .map(|row| {
            (
                row.final_idx as f32 / row.topic_text.len() as f32,
                row.topic_id as usize,
                row.topic,
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
                row.final_idx as f64 / row.text_len.min(1) as f64,
                row.topic_id as usize,
                row.topic,
                Uuid::parse_str(&row.user_id).expect("Expect database to only have valid uuid."),
            )
        }))
    }
}
