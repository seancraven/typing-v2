use actix_web::{http::StatusCode, web::Html, HttpResponse, Responder};
use log::error;

use askama::Template;
#[derive(askama::Template)]
#[template(path = "index.html")]
pub struct IndexPage {
    text: String,
}

pub struct HtmlTemplate<T>(T);
impl HtmlTemplate<IndexPage> {
    pub fn new(text: String) -> HtmlTemplate<IndexPage> {
        HtmlTemplate(IndexPage { text })
    }
}
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
