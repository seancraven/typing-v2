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
use serde_json::json;
use std::{sync::Arc, time::Duration};
use store::{LoginErr, DB};
use text::{text_for_typing, text_generation};
use uuid::Uuid;

use crate::text::LANGUAGES;

mod llm_client;
mod store;
mod text;
mod types;

#[actix_web::main]
async fn main() {
    env_logger::init();
    info!("Booting server.");
    info!("Binding to localhost:8080");
    let db_url = std::env::var("DATABASE_URL").expect("Requires DATABASE_URL env to be set.");
    let db = DB::from_url(db_url).await;
    sqlx::migrate!().run(&db.pool).await.unwrap();
    let db = web::Data::new(db);
    let db_text = db.clone();
    let client_tls_config = Arc::new(rustls_config());
    let other_arc = client_tls_config.clone();
    tokio::join!(
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
                .service(get_progress)
                .service(get_topics)
                .service(get_langs)
                .service(login)
                .service(register)
                .service(check_health)
                .service(data_handler)
                .service(stats_handler)
                .service(goals_handler)
                .service(set_goals_handler)
        })
        .bind("0.0.0.0:8080")
        .unwrap()
        .run(),
        breakable(db_text, other_arc)
    )
    .0
    .unwrap();
}

async fn breakable(db: web::Data<DB>, config: Arc<rustls::ClientConfig>) {
    tokio::select!(
    _ = text_generation(db, config) => (),
    _ = tokio::signal::ctrl_c() => (),
    );
}

// Health Check
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
// User management endpoints
#[post("/register")]
async fn register(state: web::Data<DB>, data: Json<types::User>) -> impl Responder {
    let id = match state.add_user(&data.0).await {
        Ok(id) => id,
        Err(e) => {
            error!("While regestering user {} occured {}.", data.0.username, e);
            return HttpResponse::InternalServerError().finish();
        }
    };
    HttpResponse::Ok().json(json!({"id": id.to_string()}))
}
#[post("/login")]
async fn login(state: web::Data<DB>, data: Json<types::User>) -> impl Responder {
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
// User Endpoints
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
#[post("/{user_id}/data")]
async fn data_handler(state: web::Data<DB>, data: Json<types::UserData>) -> Result<impl Responder> {
    data.user_id
        .parse::<Uuid>()
        .map_err(ErrorUnprocessableEntity)?;
    match state.add_run(data.into_inner()).await {
        Ok(_) => Ok(HttpResponse::Ok().finish()),
        Err(e) => Err(ErrorInternalServerError(e)),
    }
}
#[get("/{user_id}/stats")]
async fn stats_handler(state: web::Data<DB>, user_id: web::Path<String>) -> Result<impl Responder> {
    let user_id: Uuid = user_id.parse().map_err(ErrorUnprocessableEntity)?;
    let d = state.get_runs(user_id).await.map_err(|e| {
        error!("Stats fetching failed id:{}:{}.", user_id, e);
        ErrorInternalServerError(e)
    })?;
    Ok(HttpResponse::Ok().json(d.collect::<Vec<_>>()))
}
#[get("/{user_id}/goals")]
async fn goals_handler(state: web::Data<DB>, user_id: web::Path<String>) -> Result<impl Responder> {
    let user_id: Uuid = user_id.parse().map_err(ErrorUnprocessableEntity)?;
    let d = state.get_user_goal(user_id).await.map_err(|e| {
        error!("Goalsfetching failed id:{}:{}.", user_id, e);
        ErrorInternalServerError(e)
    })?;
    Ok(HttpResponse::Ok().json(d))
}
#[post("/{user_id}/goals")]
async fn set_goals_handler(
    state: web::Data<DB>,
    user_id: web::Path<String>,
    data: Json<types::UserGoal>,
) -> Result<impl Responder> {
    let user_id: Uuid = user_id.parse().map_err(ErrorUnprocessableEntity)?;
    let d = state
        .set_user_goal(user_id, data.into_inner())
        .await
        .map_err(|e| {
            error!("Stats fetching failed id:{}:{}.", user_id, e);
            ErrorInternalServerError(e)
        })?;
    Ok(HttpResponse::Ok().json(d))
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
        .collect::<Vec<types::TopicProgress>>();

    progs.sort_by(|a, b| a.progress.total_cmp(&b.progress));
    Ok(HttpResponse::Ok().json(progs))
}
// Topic Endpoints
#[get("/topics")]
async fn get_topics(state: web::Data<DB>) -> actix_web::Result<impl Responder> {
    let topics = state.get_topics().await.map_err(|e| {
        error!("Getting topics failed {}.", e);
        ErrorInternalServerError(e)
    })?;
    let response = json!( {"topics": topics});
    Ok(HttpResponse::Ok().json(response))
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
#[get("/langs")]
async fn get_langs() -> impl Responder {
    let langs = LANGUAGES;
    let response = json!( {"langs": langs});
    HttpResponse::Ok().json(response)
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
