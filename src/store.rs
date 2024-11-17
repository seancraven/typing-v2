use anyhow::Context;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use uuid::Uuid;

use crate::UserData;

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
    pub async fn add_run(&self, run: TypingRun) -> sqlx::error::Result<()> {
        sqlx::query!(
            r#"INSERT INTO typing_run (user_id, wpm, errors) VALUES ($1, $2, $3)"#,
            run.user_id,
            run.wpm,
            run.errors
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
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
        topic_id: i32,
    ) -> sqlx::error::Result<()> {
        let text = text_body.as_ref();
        sqlx::query!(
            "INSERT INTO texts (body, topic_id, length) VALUES ($1, $2, $3);",
            text,
            topic_id,
            text.len() as i32
        )
        .execute(&self.pool)
        .await
        .map(|_| ())
    }
    pub async fn get_random_text(&self) -> sqlx::error::Result<(i32, String)> {
        sqlx::query!(r#"SELECT topic_id, body FROM texts ORDER BY RANDOM() LIMIT 1;"#)
            .fetch_one(&self.pool)
            .await
            .map(|b| (b.topic_id, b.body))
    }
    pub async fn get_random_topic(&self) -> sqlx::error::Result<(i32, String)> {
        sqlx::query!(r#"SELECT id, topic FROM topics ORDER BY RANDOM() LIMIT 1"#)
            .fetch_one(&self.pool)
            .await
            .map(|row| (row.id, row.topic))
    }
    pub async fn get_max_progress_by_topic(&self) -> sqlx::error::Result<Vec<(f32, usize)>> {
        todo!()
        // sqlx::query!(r#"SELECT "#)
        //     .fetch_all(&self.pool)
        //     .await
        //     .map(|row| (row.id, row.topic))
    }
}
