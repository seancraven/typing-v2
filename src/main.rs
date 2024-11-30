use actix_multipart::form::{tempfile::TempFile, MultipartForm};
use actix_web::{
    error::{ErrorInternalServerError, ErrorUnprocessableEntity},
    get,
    middleware::Logger,
    post,
    web::{self, Json},
    App, HttpResponse, Responder, Result,
};
use awc::{Client, Connector};
use log::{error, info};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, io::Read, sync::Arc, time::Duration};
use store::{LoginErr, DB};
use text::text_for_typing;
use uuid::Uuid;

mod llm_client;
mod store;
mod text;

#[actix_web::main]
async fn main() {
    env_logger::init();
    info!("Booting server.");
    info!("Binding to localhost:8080");
    let db_url = std::env::var("DATABASE_URL").expect("Requires DATABASE_URL env to be set.");
    let db = DB::from_url(db_url).await;
    sqlx::migrate!().run(&db.pool).await.unwrap();
    let db = web::Data::new(db);
    let client_tls_config = Arc::new(rustls_config());
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
            .service(get_random_topic)
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
#[get("/random")]
async fn get_random_topic(db: web::Data<DB>) -> impl Responder {
    let Ok((id, topic)) = db
        .random_topic()
        .await
        .map_err(|e| error!("Random topic fetching failed {}.", e))
    else {
        return HttpResponse::InternalServerError().finish();
    };
    HttpResponse::Ok().json(json! ({"topic": topic, "topic_id": id}))
}
#[get("/{user_id}/{topic_id}/{start_idx}")]
async fn get_text(db: web::Data<DB>, path_data: web::Path<(String, i32, usize)>) -> impl Responder {
    let (user_id, topic_id, item) = path_data.into_inner();
    let Ok(user_id) = uuid::Uuid::try_parse(&user_id) else {
        return HttpResponse::BadRequest().body("Invalid user id.");
    };
    let Ok(typing_state) = text_for_typing(&db, user_id, topic_id, item)
        .await
        .map_err(|e| {
            error!("Generation of text failed with {:?}.", e);
            e
        })
    else {
        return HttpResponse::InternalServerError().body("Text generation failed.");
    };
    HttpResponse::Ok().json(typing_state)
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
    topic_id: usize,
    item_id: usize,
    wpm: f64,
    type_time_ms: f64,
}
#[post("/user/data")]
async fn data_handler(state: web::Data<DB>, data: Json<UserData>) -> Result<impl Responder> {
    data.user_id
        .parse::<Uuid>()
        .map_err(ErrorUnprocessableEntity)?;
    match state.add_run(data.into_inner()).await {
        Ok(_) => Ok(HttpResponse::Ok().finish()),
        Err(e) => Err(ErrorInternalServerError(e)),
    }
}
#[derive(Debug, Serialize)]
struct TopicProgress {
    topic: String,
    topic_id: usize,
    progress: f32,
}
#[get("/{user_id}/progress")]
async fn get_progress(
    state: web::Data<DB>,
    user_id: web::Path<String>,
) -> actix_web::Result<impl Responder> {
    let user_id = user_id.parse().map_err(ErrorUnprocessableEntity)?;
    let mut progs = state
        .user_progress(user_id)
        .await
        .map_err(ErrorInternalServerError)?
        .into_iter()
        .map(|row| TopicProgress {
            topic: row.2,
            topic_id: row.1,
            progress: row.0,
        })
        .collect::<Vec<TopicProgress>>();

    progs.sort_by(|a, b| a.progress.total_cmp(&b.progress));
    Ok(HttpResponse::Ok().json(progs))
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
        Err(e) => ErrorInternalServerError(e).error_response(),
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
    #[actix_web::test]
    async fn test_get() {
        env_logger::init();
        let svc = actix_web::test::init_service(
            App::new()
                .app_data(web::Data::new(
                    DB::from_url(std::env::var("DATABASE_URL").unwrap()).await,
                ))
                .service(get_text),
        )
        .await;
        let resp = actix_web::test::call_service(
            &svc,
            actix_web::test::TestRequest::get()
                .uri("/1947a38f-596b-4974-adc6-910267976720/2/0")
                .to_request(),
        )
        .await;
        assert_eq!(resp.status(), 200, "{:?}", resp.into_body())
    }
}
