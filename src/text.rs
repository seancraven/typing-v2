use actix_web::HttpResponse;
use anyhow::{anyhow, Context, Result};
use log::{error, warn};
use rand::Rng;
use tokio::join;
use uuid::Uuid;

use crate::{llm_client, store::DB};

const P_GEN: f64 = 0.99;
const SYSTEM_PROMPT: &'static str = include_str!("system_prompt.txt");
const MAX_GENERATION_RETRY: usize = 3;
pub async fn text_for_typing(
    db: &DB,
    user_id: Uuid,
    topic: i32,
    item: usize,
) -> Result<(String, f32)> {
    let text_fut = db.get_text(topic);
    let len_fut = db.get_user_length_pref(user_id);
    let (text, len) = join!(text_fut, len_fut);
    let len = len.unwrap_or_else(|e| {
        error!("Failed to get user length preference due to {}.", e);
        150
    });
    let start_idx = len * item;
    let end_idx = len * (item + 1);
    let mut text = text.context("Failed fetching text from database.")?;
    let prog = end_idx as f32 / text.len() as f32;
    text.drain(..start_idx);
    text.drain(end_idx..);

    Ok((text, prog.max(1.0)))
}

async fn create_topic_epic(topic: String, client: &awc::Client) -> Result<CodeBlock> {
    let user_message = format!("Please help me write a correct program about {}", topic);
    for _ in 0..MAX_GENERATION_RETRY {
        let resp_result = llm_client::single_question(SYSTEM_PROMPT, &user_message, client).await;
        let mut resp = match resp_result {
            Ok(t) => t,
            Err(e) => {
                error!(
                    "LLm generation failed on topic {} because of {}.",
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

fn clean_llm_response_to_markdown(mut text: String) -> Result<CodeBlock> {
    let Some(start_idx) = text.find("```") else {
        return Err(anyhow!("Can't find opening markdown braces."));
    };
    let Some(stop_idx) = text[start_idx + 3..].find("```") else {
        return Err(anyhow!("Can't find closing markdown braces."));
    };
    let lang = match parse_md_lang(&text, start_idx) {
        Ok(l) => l,
        Err(e) => return Err(e),
    };
    text.drain(..start_idx);
    text.drain(stop_idx..);
    return Ok(CodeBlock { lang, text });
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
    return Ok(lang);
}

#[cfg(test)]
mod tests {
    use super::*;

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
