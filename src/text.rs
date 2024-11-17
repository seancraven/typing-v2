use anyhow::{anyhow, Context, Result};
use log::{error, warn};
use rand::Rng;

use crate::{llm_client, store::DB};

const P_GEN: f64 = 0.99;
const SYSTEM_PROMPT: &'static str = include_str!("system_prompt.txt");
const MAX_GENERATION_RETRY: usize = 3;

pub async fn text_for_typing(client: &awc::Client, db: &DB) -> Result<String> {
    if rand::thread_rng().gen_bool(P_GEN) {
        let topic = db
            .get_random_topic()
            .await
            .context("Topic fetching failed.")?;
        let resp = llm_client::single_question(SYSTEM_PROMPT, topic.1, client).await?;
        db.ingest(&resp, topic.0).await?;
        return Ok(resp);
    }
    match db.get_random_text().await {
        Ok(text) => {
            return Ok(text.1);
        }
        Err(e) => {
            warn!(
                "Fetching from the database failed due to {}, generating new text",
                e
            );
            let topic = db
                .get_random_topic()
                .await
                .context("Topic fetching failed.")?;
            let resp = llm_client::single_question(SYSTEM_PROMPT, topic.1, client).await?;
            db.ingest(&resp, topic.0).await?;
            return Ok(resp);
        }
    }
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
