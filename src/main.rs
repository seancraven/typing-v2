use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    body::BoxBody,
    error::ErrorInternalServerError,
    get,
    middleware::Logger,
    post, put,
    web::{self, Json},
    App, HttpResponse, Responder, ResponseError,
};
use dotenv::var;
use log::info;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fmt::Display, io::Read};
use store::DB;

mod store;

#[actix_web::main]
async fn main() {
    info!("Booting server.");
    info!("Binding to localhost:8080");
    let db = web::Data::new(DB::from_url(var("DATABASE_URL").unwrap()).await);
    env_logger::init();
    actix_web::HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .wrap(Logger::default())
            .service(text)
            .service(check_health)
            .service(data_handler)
    })
    .bind("0.0.0.0:8080")
    .unwrap()
    .run()
    .await
    .unwrap();
}

#[get("/health/status")]
async fn check_health(state: web::Data<DB>) -> impl Responder {
    if sqlx::query!(r#"SELECT id FROM users LIMIT 0;"#)
        .fetch_optional(&state.pool)
        .await
        .is_ok()
    {
        HttpResponse::Ok().body("Healthy")
    } else {
        HttpResponse::InternalServerError().body("Database Error.")
    }
}
#[derive(Deserialize, Serialize, Debug)]
struct TextResponse {
    text: String,
}
#[get("/text")]
async fn text() -> impl Responder {
    HttpResponse::Ok().body(
        serde_json::json!(TextResponse {
            text: "test".into()
        })
        .to_string(),
    )
}
#[derive(Deserialize, Debug)]
pub(crate) struct UserData {
    user_id: String,
    error_chars: HashMap<String, usize>,
    finished: bool,
    wpm: f64,
    type_time_ms: f64,
}
#[post("/user/data")]
async fn data_handler(state: web::Data<DB>, data: Json<UserData>) -> impl Responder {
    if data.finished {
        info!("Run didn't finish, no data was logged.");
        return HttpResponse::Ok().finish();
    }
    let Ok(user_data) = data.into_inner().try_into() else {
        log::error!("Conversion of the user data failed.");
        return ErrorInternalServerError("Unexpected Server error.").error_response();
    };
    match state.add_run(user_data).await {
        Ok(_) => HttpResponse::Ok().finish(),
        Err(e) => SQLXError(e).error_response(),
    }
}
#[derive(MultipartForm, Debug)]
struct Upload {
    file: TempFile,
}
#[put("/ingest")]
async fn inget_handler(
    state: web::Data<DB>,
    MultipartForm(mut data): MultipartForm<Upload>,
) -> impl Responder {
    let mut string = String::new();
    match data.file.file.read_to_string(&mut string) {
        Ok(size) => log::info!("Read: {} bytes", size),
        Err(e) => {
            return HttpResponse::InternalServerError()
                .body(format!("While reading the file: {}", e));
        }
    };
    match state.ingest(string).await {
        Ok(()) => HttpResponse::Ok().finish(),
        Err(e) => SQLXError(e).error_response(),
    }
}

#[derive(Debug)]
struct SQLXError(sqlx::Error);
impl Display for SQLXError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}
impl ResponseError for SQLXError {
    fn error_response(&self) -> actix_web::HttpResponse<BoxBody> {
        log::error!("{}", self.0);
        ErrorInternalServerError("Unexpected server error.").into()
    }
}
