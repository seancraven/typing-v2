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
#[derive(Debug)]
pub struct User {
    first_name: String,
    last_name: String,
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
impl DB {
    pub async fn add_user(&self, user: User) -> sqlx::error::Result<uuid::Uuid> {
        sqlx::query_scalar!(
            r#"INSERT INTO users (first_name, last_name) VALUES ($1, $2) RETURNING id;"#,
            user.first_name,
            user.last_name
        )
        .fetch_one(&self.pool)
        .await
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
        sqlx::query!(
            "INSERT INTO texts (body, topic_id) VALUES ($1, $2);",
            text_body.as_ref(),
            topic_id
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
}
