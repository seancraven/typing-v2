use std::collections::HashMap;

use actix_web::{get, middleware::Logger, post, web::Json, App, Responder};
use log::info;
use serde::Deserialize;

mod store;
mod templates;

#[tokio::main]
async fn main() {
    //
    env_logger::init();
    let _ = actix_web::HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .service(index)
            .service(check_health)
            .service(data_handler)
            .service(actix_files::Files::new("/js", "assets/js"))
    })
    .bind("0.0.0.0:8080")
    .unwrap()
    .run()
    .await;
    info!("Hi");
}

#[get("/health/status")]
async fn check_health() -> &'static str {
    "Ok"
}
#[get("/")]
async fn index() -> impl Responder {
    templates::HtmlTemplate::new("Sean is a god".into())
}
#[derive(Deserialize, Debug)]
struct UserData {
    username: String,
    error_chars: HashMap<String, usize>,
    finished: bool,
    type_time_ms: f64,
}
#[post("/user/data")]
async fn data_handler(data: Json<UserData>) -> String {
    info!("Got User info: {:?}", data);
    "Okay".into()
}
