use std::collections::HashMap;

use actix_web::{
    get,
    http::StatusCode,
    middleware::Logger,
    post,
    web::{Html, Json},
    App, HttpResponse, Responder,
};
use askama::Template;
use log::{error, info};
use serde::Deserialize;

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
    HtmlTemplate(Index {
        text: "Sean is a god".into(),
    })
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

#[derive(askama::Template)]
#[template(path = "index.html")]
struct Index {
    text: String,
}

struct HtmlTemplate<T>(T);
impl<T> Responder for HtmlTemplate<T>
where
    T: Template,
{
    type Body = String;
    fn respond_to(self, req: &actix_web::HttpRequest) -> actix_web::HttpResponse<Self::Body> {
        match self.0.render() {
            Ok(t) => Html::new(t).respond_to(req),
            Err(e) => {
                error!("While rendering templates: {:?} Error: {:?}", req.path(), e);
                HttpResponse::with_body(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    String::from("Unexpected Error"),
                )
            }
        }
    }
}
