use sqlx::postgres::PgPool;
pub struct DB {
    pool: PgPool,
}
#[derive(Debug)]
struct User {
    first_name: String,
    last_name: String,
}
impl DB {
    async fn add_user(&self, user: User) -> sqlx::error::Result<uuid::Uuid> {
        sqlx::query_scalar!(
            r#"INSERT INTO users (first_name, last_name) VALUES ($1, $2) RETURNING id;"#,
            user.first_name,
            user.last_name
        )
        .fetch_one(&self.pool)
        .await
    }
}
