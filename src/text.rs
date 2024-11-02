use anyhow::{Context, Result};
use log::error;
use rand::Rng;

use crate::{llm_client, store::DB};

const P_GEN: f64 = 0.01;
const SYSTEM_PROMP:&'static str = "You are code generation assistant. Please produce a syntactically correct program about a topic suggested by the user. It should have about 3-5 functions and or classes. The code should work, be formatted according to recommended language sytle guides. Please indicate the code by fencing it in <code> </code> xml tags.";

pub async fn text_for_typing(client: &awc::Client, db: &DB) -> Result<String> {
    if rand::thread_rng().gen_bool(P_GEN) {
        let topic = db
            .get_random_topic()
            .await
            .context("Topic fetching failed.")?;
        let resp = llm_client::single_question(SYSTEM_PROMP, topic.1, client).await?;
        db.ingest(&resp, topic.0).await?;
        return Ok(resp);
    }
    match db.get_random_text().await {
        Ok(text) => {
            return Ok(text.1);
        }
        Err(e) => {
            error!(
                "Fetching from the database failed due to {}, generating new text",
                e
            );
            let topic = db
                .get_random_topic()
                .await
                .context("Topic fetching failed.")?;
            let resp = llm_client::single_question(SYSTEM_PROMP, topic.1, client).await?;
            db.ingest(&resp, topic.0).await?;
            return Ok(resp);
        }
    }
}
