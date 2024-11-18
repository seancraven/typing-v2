use anyhow::Context;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::UserData;

// Currently DB stores all text not bad.
pub struct DB {
    pub pool: PgPool,
}
impl DB {
    pub async fn from_url(url: String) -> DB {
        DB {
            pool: PgPool::connect(&url).await.expect("can't connect to db"),
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
    Unknown(#[from] sqlx::Error),
}

impl DB {
    pub async fn add_run(&self, run: UserData) -> sqlx::error::Result<()> {
        let mut error_string = String::new();
        for (key, count) in run.error_chars {
            error_string.push_str(&format!("{}:{},", key, count));
        }

        sqlx::query!(
            r#"INSERT INTO user_runs (user_id, errors, finished, start_index, end_index, topic_id, wpm, type_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8 )"#,
            run.user_id.parse::<Uuid>().unwrap(),
            error_string,
            run.finished,
            0 as i32,
            150 as i32,
            run.topic_id as i32,
            run.wpm,
            run.type_time_ms
        ).execute(&self.pool).await.map(|_|())
    }
    pub async fn add_user(&self, user: User) -> sqlx::error::Result<uuid::Uuid> {
        sqlx::query_scalar!(
            r#"INSERT INTO users (id, username, password, email) VALUES ($1, $2, $3, $4) RETURNING id;"#,
            Uuid::new_v4(),
            user.username,
            user.password,
            user.email
        )
        .fetch_one(&self.pool)
        .await
    }
    pub async fn verify_user(&self, user: User) -> Result<uuid::Uuid, LoginErr> {
        let row = sqlx::query!(
            r#"SELECT id, password FROM users WHERE username = $1"#,
            user.username
        )
        .fetch_optional(&self.pool)
        .await?;
        match row {
            Some(r) => {
                if r.password == r.password {
                    return Ok(r.id);
                };
                Err(LoginErr::BadPassowrd)
            }
            None => Err(LoginErr::NoUser(user.username)),
        }
    }
    pub async fn ingest_user_documet(&self, text_body: impl AsRef<str>) -> sqlx::error::Result<()> {
        sqlx::query!(
            "INSERT INTO user_documents (body) VALUES ($1);",
            text_body.as_ref(),
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
    }
    pub async fn ingest(
        &self,
        text_body: impl AsRef<str>,
        topic: String,
    ) -> sqlx::error::Result<()> {
        let text = text_body.as_ref();
        sqlx::query!(
            "INSERT INTO topics (text, topic, length) VALUES ($1, $2, $3);",
            text,
            topic,
            text.len() as i32
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
    }
    pub async fn get_text(&self, topic_id: i32) -> sqlx::error::Result<String> {
        sqlx::query!(r#"SELECT text FROM topics WHERE id = $1;"#, topic_id,)
            .fetch_one(&self.pool)
            .await
            .map(|row| row.text)
    }
    pub async fn get_random_text(&self) -> sqlx::error::Result<(String, String)> {
        sqlx::query!(r#"SELECT topic, text FROM topics ORDER BY RANDOM() LIMIT 1;"#)
            .fetch_one(&self.pool)
            .await
            .map(|b| (b.topic, b.text))
    }
    pub async fn get_user_length_pref(&self, user_id: Uuid) -> sqlx::error::Result<usize> {
        Ok(150)
    }
    pub async fn get_random_topic(&self) -> sqlx::error::Result<(i32, String)> {
        sqlx::query!(r#"SELECT id, topic FROM topics ORDER BY RANDOM() LIMIT 1"#)
            .fetch_one(&self.pool)
            .await
            .map(|row| (row.id, row.topic))
    }
    pub async fn get_user_progress(
        &self,
        user_id: Uuid,
    ) -> sqlx::error::Result<Vec<(f32, usize, String)>> {
        let rows = sqlx::query!(
            r#"SELECT p.final_idx, p.topic_id, t.topic ,t.text
            FROM user_progress as p INNER JOIN topics as t on p.topic_id = t.id
            WHERE user_id = $1;"#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?;
        let mut out = Vec::with_capacity(rows.len());
        for row in rows {
            out.push((
                row.final_idx as f32 / row.text.len() as f32,
                row.topic_id as usize,
                row.topic,
            ));
        }
        Ok(out)
    }
    pub async fn get_max_progress_by_topic(&self) -> sqlx::error::Result<Vec<(f32, usize)>> {
        Ok(sqlx::query!(
            r#"SELECT topic_id, MAX(final_idx), length
            FROM user_progress as p INNER JOIN topics t on p.topic_id = t.id
            GROUP BY topic_id, final_idx, length;"#
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|row| {
            (
                row.max.unwrap_or(0) as f32 / row.length as f32,
                row.topic_id as usize,
            )
        })
        .collect())
    }
}
