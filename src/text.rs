use std::{sync::Arc, time::Duration};

use actix_web::web;
use anyhow::{anyhow, Context, Result};
use awc::{Client, Connector};
use log::{debug, error, info, warn};
use rand::Rng;
use serde::Serialize;
use tokio::join;
use uuid::Uuid;

use crate::{llm_client, rustls_config, store::DB};

const P_GEN: f64 = 0.99;
const SYSTEM_PROMPT: &str = include_str!("system_prompt.txt");
const MAX_GENERATION_RETRY: usize = 3;
const NEW_TOPIC_COUNT: usize = 10;
const PROG_MIN: f64 = 0.4;
const LANGUAGES: [&str; 14] = [
    "python",
    "javascript",
    "java",
    "cpp",
    "ruby",
    "sql",
    "html",
    "css",
    "typescript",
    "swift",
    "php",
    "rust",
    "kotlin",
    "go",
];

#[derive(Serialize)]
pub struct TypingState {
    start_index: usize,
    end_index: usize,
    text: String,
    topic_id: usize,
    progress: f32,
    done: bool,
}

pub async fn text_for_typing(
    db: &DB,
    user_id: Uuid,
    topic_id: i32,
    start_index: usize,
) -> Result<TypingState> {
    let text_fut = db.text(topic_id);
    let len_fut = db.user_length_pref(user_id);
    let (text, len) = join!(text_fut, len_fut);
    let len = len.unwrap_or_else(|e| {
        error!("Failed to get user length preference due to {}.", e);
        150
    });
    let text = text.context("Failed fetching text from database.")?;
    let text_length = text.len() as f32;
    let (text, start_index, end_index) =
        get_next_chonk(text, len, start_index).ok_or(anyhow!("Invalid item"))?;
    let progress = (end_index as f32 / text_length).clamp(0.0, 1.0);
    let done = progress >= 1.0;
    Ok(TypingState {
        start_index,
        end_index,
        topic_id: topic_id as usize,
        text,
        progress,
        done,
    })
}
fn get_next_chonk(
    mut text: String,
    len: usize,
    start_idx: usize,
) -> Option<(String, usize, usize)> {
    if start_idx >= text.len() {
        return None;
    };
    text.drain(..start_idx);
    if len > text.len() {
        let tlen = text.len();
        return Some((text, start_idx, tlen));
    }
    let offset = text[len..]
        .find(['\n', '\t', ' '])
        // If garbage with no space just truncate.
        .unwrap_or(0);
    text.drain(len + offset..);
    Some((text, start_idx, start_idx + len + offset))
}
fn trim_text(mut text: String, len: usize, idx: usize) -> Option<(String, f32)> {
    let mut chunks = vec![];
    let mut chunk_start: usize = 0;
    for (i, char) in text.chars().enumerate() {
        if i - chunk_start <= len {
            continue;
        }
        if char == '\n' || char == '\t' || char == ' ' {
            chunks.push((chunk_start, i));
            chunk_start = i
        }
    }
    let olen = text.len() as f32;
    chunks.push((chunk_start, text.len()));
    let item = chunks.get(idx)?;
    text.drain(item.1..);
    text.drain(..item.0);
    let prog = item.1 as f32 / olen;
    Some((text, prog.clamp(0.0, 1.0)))
}
pub async fn loop_body(db: &DB, client: &awc::Client) -> Result<()> {
    let progress = db.max_progress_by_topic().await?.inspect(|i| {
        dbg!(i);
    });
    let (sum, len): (f64, f64) = progress
        .into_iter()
        .fold((0.0, 0.0), |acc, row| (row.0 + acc.0, acc.1 + 1.0));
    let topic_count = db.topic_count().await?;
    let mean_prog = sum / len.max(1.0);
    info!("Topic count: {}", topic_count);
    info!("Mean progress: {}", mean_prog);
    if topic_count == 0 || mean_prog > PROG_MIN {
        for _ in 0..NEW_TOPIC_COUNT {
            let topic = create_topic_type(client).await?;
            let code_block = create_topic_epic(&topic, client).await?;
            let title = create_topic_title(&code_block.text, client).await?;
            let id = code_block
                .to_database(&topic, &title, db)
                .await
                .context("Insertion of generatied code block failed.")?;
            info!(
                "Generated topic {}:{}:{} len {}",
                id,
                title,
                code_block.lang,
                code_block.text.len()
            )
        }
    }
    Ok(())
}
pub async fn text_generation(
    db: web::Data<DB>,
    tls_config: Arc<rustls::ClientConfig>,
) -> Result<()> {
    let client = Client::builder()
        .connector(Connector::new().rustls_0_23(tls_config))
        .timeout(Duration::from_secs(60))
        .finish();
    loop {
        loop_body(&db, &client)
            .await
            .map_err(|e| error!("During generation of topics {}", e))
            .ok();
        tokio::time::sleep(Duration::from_secs(10)).await;
    }
}
async fn create_topic_type(client: &awc::Client) -> Result<String> {
    let message = "You are an expert in teaching software development. Please suggest a small part of a program for a learner to write. Great exaples are 'Please write an implmentation of auto-grad in Rust', 'Please write an append only log database in python', 'Write a http request cache in Go for a webserver', the user will suggest the the language they want to write in";
    let idx = rand::thread_rng().gen_range(0..LANGUAGES.len());
    let lang = LANGUAGES[idx];
    llm_client::single_question(
        message,
        format!(
            "Please generate a topic that would be good to write in {}",
            lang
        ),
        client,
    )
    .await
}
pub async fn create_topic_title(body: impl AsRef<str>, client: &awc::Client) -> Result<String> {
    let body = body.as_ref();
    let message = "You will be given a description of a small program and the resulting program. Could you please generate a short title for the program. Only a single short title is allowed.";
    let prompt = format!("Please create a title for this program, avoid using the language name, and try keep the title tirse and informative. Here is the code:\n\n {}. Remember you must only respond with a single short title.", body);
    llm_client::single_question(message, prompt, client).await
}
async fn create_topic_epic(topic: &str, client: &awc::Client) -> Result<CodeBlock> {
    let user_message = format!("Please help me write a correct program about {}", topic);
    for _ in 0..MAX_GENERATION_RETRY {
        let resp_result = llm_client::single_question(SYSTEM_PROMPT, &user_message, client).await;
        let resp = match resp_result {
            Ok(t) => t,
            Err(e) => {
                error!(
                    "LLm generation failed on topic:\n\n {}\n because of {}.",
                    &topic, e
                );
                continue;
            }
        };
        match clean_llm_response_to_markdown(resp) {
            Ok(code) => {
                return Ok(code);
            }
            Err(e) => {
                warn!("Markdown parsing failed due to: {}", e);
            }
        };
    }
    Err(anyhow!("Failed to generate any content for {}", topic))
}

#[derive(Debug, Clone)]
struct CodeBlock {
    lang: String,
    text: String,
}
impl CodeBlock {
    async fn to_database(&self, topic: &str, title: &str, db: &DB) -> Result<i64> {
        db.add_topic(topic, &self.text, &self.lang, title).await
    }
}

fn clean_llm_response_to_markdown(mut text: String) -> Result<CodeBlock> {
    let Some(start_idx) = text.find("```") else {
        return Err(anyhow!("Can't find opening markdown braces."));
    };
    let Some(stop_idx) = text[start_idx + 3..].find("```") else {
        debug!("Text:\n{}", text);
        return Err(anyhow!("Can't find closing markdown braces."));
    };
    let lang = match parse_md_lang(&text, start_idx) {
        Ok(l) => l,
        Err(e) => return Err(e),
    };
    text.drain(..start_idx);
    text.drain(stop_idx..);
    Ok(CodeBlock { lang, text })
}

fn parse_md_lang(text: &str, start_idx: usize) -> Result<String> {
    let mut lang = String::new();
    let to_iter = text
        // Add thirty most resonable markdown language names
        // should be less than 30 chars.
        .get(start_idx..(start_idx + 30).min(text.len()))
        .expect("Block start should be less than len.");
    for c in to_iter.chars() {
        if c == '`' {
            continue;
        }
        if c.is_whitespace() {
            if lang.is_empty() {
                continue;
            }
            break;
        }
        lang.push(c)
    }
    if lang.is_empty() {
        return Err(anyhow!("Can't find language."));
    }
    Ok(lang)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_text() {
        let s = include_str!("system_prompt.txt");
        let clip_len = 150;
        let mut outs = vec![];
        let mut i = 0;
        loop {
            let text = String::from(s);
            let Some(t) = trim_text(text, clip_len, i) else {
                break;
            };
            outs.push(t);
            i += 1;
        }
        assert!(outs.len() > 1);
        for out in &outs[..outs.len() - 1] {
            assert!(out.0.len() >= clip_len, "{}:{}", out.0.len(), clip_len);
        }
        assert_eq!(
            outs.iter().map(|i| &*i.0).collect::<Vec<&str>>().join(""),
            s,
        );
    }

    #[test]
    fn test_parse_md() {
        let languages = vec![
            "python",
            "javascript",
            "java",
            "cpp",
            "ruby",
            "sql",
            "html",
            "css",
            "typescript",
            "swift",
            "php",
            "rust",
            "kotlin",
            "go",
        ];
        let test_text = String::from(include_str!("md_block_tests.md"));
        let test_cases: Vec<&str> = test_text.split("---").collect();
        for (test_case, lang) in (test_cases).into_iter().zip(languages) {
            let parsed_lang = parse_md_lang(test_case, 0).expect(test_case);
            assert_eq!(lang, parsed_lang)
        }
    }
    #[test]
    fn test_le_double_fuck() {
        let test_text = String::from(include_str!("md_block_tests.md"));
        let lang = parse_md_lang(&test_text, 0).unwrap();
        assert_eq!(&lang, "python")
    }
}
