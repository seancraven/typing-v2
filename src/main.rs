use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    body::BoxBody,
    error::ErrorInternalServerError,
    get,
    middleware::Logger,
    post,
    web::{self, Json},
    App, HttpResponse, Responder, ResponseError,
};
use awc::{Client, Connector};
use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, fmt::Display, io::Read, sync::Arc, time::Duration};
use store::{LoginErr, DB};
use text::text_for_typing;

mod llm_client;
mod store;
mod text;

#[actix_web::main]
async fn main() {
    info!("Booting server.");
    info!("Binding to localhost:8080");
    let db_url = std::env::var("DATABASE_URL").expect("Requires DATABASE_URL env to be set.");
    let db = DB::from_url(db_url).await;
    sqlx::migrate!().run(&db.pool).await.unwrap();
    let db = web::Data::new(db);
    let client_tls_config = Arc::new(rustls_config());
    env_logger::init();
    actix_web::HttpServer::new(move || {
        App::new()
            .app_data(db.clone())
            .app_data(web::Data::new(
                Client::builder()
                    .connector(Connector::new().rustls_0_23(client_tls_config.clone()))
                    .timeout(Duration::from_secs(60))
                    .finish(),
            ))
            .wrap(Logger::default())
            .service(get_text)
            .service(login)
            .service(register)
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
#[get("{user_id}/text/{length}")]
async fn get_text(
    client: web::Data<Client>,
    db: web::Data<DB>,
    length: web::Path<usize>,
) -> impl Responder {
    let Ok(text) = text_for_typing(&client, &db).await.map_err(|e| {
        error!("Generation of text failed with {:?}.", e);
        e
    }) else {
        return HttpResponse::InternalServerError().body("Text generation failed.");
    };
    let serialise = serde_json::to_string(&TextResponse { text }).unwrap();
    HttpResponse::Ok().body(serialise)
}
#[post("/register")]
async fn register(state: web::Data<DB>, data: Json<store::User>) -> impl Responder {
    let id = match state.add_user(data.into_inner()).await {
        Ok(id) => id,
        Err(e) => {
            error!("While regestering user {} occured.", e);
            return HttpResponse::InternalServerError().finish();
        }
    };
    HttpResponse::Ok().json(json!({"id": id.to_string()}))
}
#[post("/login")]
async fn login(state: web::Data<DB>, data: Json<store::User>) -> impl Responder {
    let user = data.into_inner();
    match state.verify_user(user).await {
        Ok(id) => HttpResponse::Ok().json(json!({"id": id.to_string()})),
        Err(e) => match e {
            LoginErr::BadPassowrd => HttpResponse::Unauthorized().finish(),
            LoginErr::NoUser(uname) => {
                HttpResponse::BadRequest().body(format!("User with name {} doesn't exist.", uname))
            }
            LoginErr::Unknown(e) => {
                error!("During login falure occured {}", e);
                HttpResponse::InternalServerError().finish()
            }
        },
    }
}
#[derive(Deserialize, Debug)]
pub struct UserData {
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
#[post("/ingest")]
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
    match state.ingest_user_documet(string).await {
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
fn rustls_config() -> rustls::ClientConfig {
    rustls::crypto::aws_lc_rs::default_provider()
        .install_default()
        .unwrap();

    let root_store = rustls::RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.to_owned());

    rustls::ClientConfig::builder()
        .with_root_certificates(root_store)
        .with_no_client_auth()
}
#[cfg(test)]
mod tests {
    use super::*;

    #[actix_web::test]
    async fn test_send() {
        let client_tls_config = Arc::new(rustls_config());
        let client = Client::builder()
            .connector(Connector::new().rustls_0_23(client_tls_config.clone()))
            .finish();

        llm_client::single_question(
            "Please resposd with 5 letters.",
            "What is my name?",
            &client,
        )
        .await
        .unwrap();
    }
}
