use anyhow::anyhow;
use awc::{self, Client};
use serde::{Deserialize, Serialize};
pub async fn single_question(
    system_message: impl Into<String>,
    user_message: impl Into<String>,
    client: &Client,
) -> anyhow::Result<String> {
    let endpoint: String= format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={}", dotenv::var("GOOGLE_API_KEY").unwrap());
    let req = client.post(endpoint);
    let json = GenerationRequest::new_with_contents(vec![
        Content::new_system_message(system_message),
        Content::new_user_message(user_message),
    ]);
    let mut resp = req
        .send_json(&json)
        .await
        .map_err(|e| anyhow!("During sending request this occured: {}", e))?;
    let mut out = resp.json::<Response>().await?;
    Ok(std::mem::take(&mut out.candidates[0].content.parts[0].text))
}

#[derive(Debug, Serialize, Deserialize)]
struct GenerationRequest {
    #[serde(rename = "generationConfig")]
    generation_config: TextGenerationParams,
    contents: Vec<Content>,
}
impl GenerationRequest {
    fn new_with_contents(contents: Vec<Content>) -> GenerationRequest {
        GenerationRequest {
            generation_config: TextGenerationParams::default(),
            contents,
        }
    }
}

#[derive(Debug, Deserialize)]
enum Role {
    User,
    #[serde(alias = "model")]
    AI,
    System,
}
impl Serialize for Role {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            Self::User => serializer.serialize_str("user"),
            Self::AI => serializer.serialize_str("model"),
            Self::System => serializer.serialize_str("system"),
        }
    }
}
#[derive(Debug, Serialize, Deserialize)]
struct Content {
    role: Role,
    parts: Vec<Text>,
}
impl Content {
    fn new_user_message(s: impl Into<String>) -> Content {
        Content {
            role: Role::User,
            parts: vec![Text { text: s.into() }],
        }
    }
    fn new_system_message(s: impl Into<String>) -> Content {
        Content {
            role: Role::User,
            parts: vec![Text { text: s.into() }],
        }
    }
}
#[derive(Debug, Serialize, Deserialize)]
struct Text {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TextGenerationParams {
    pub stop_sequences: Option<Vec<String>>,
    pub response_mime_type: Option<String>,
    pub candidate_count: Option<u32>,
    pub max_output_tokens: u32,
    pub temperature: f32,
    pub top_p: Option<f32>,
    pub top_k: Option<u32>,
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub response_logprobs: Option<bool>,
    pub logprobs: Option<u32>,
}
impl Default for TextGenerationParams {
    fn default() -> TextGenerationParams {
        TextGenerationParams {
            stop_sequences: None,
            response_mime_type: None,
            candidate_count: None,
            max_output_tokens: 512,
            temperature: 0.0,
            top_p: None,
            top_k: None,
            presence_penalty: None,
            frequency_penalty: None,
            response_logprobs: None,
            logprobs: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Response {
    candidates: Vec<Candidate>,
}
#[derive(Debug, Serialize, Deserialize)]
struct Candidate {
    content: Content,
}
mod test {

    use super::*;

    #[test]
    fn test_serialise() -> serde_json::Result<()> {
        let cases = vec![
            (Role::AI, "\"model\""),
            (Role::User, "\"user\""),
            (Role::System, "\"system\""),
        ];
        for (i, o) in cases {
            assert_eq!(serde_json::to_string(&i)?, o);
        }
        Ok(())
    }
    #[tokio::test]
    async fn test_send() {
        let client = awc::Client::new();
        single_question(
            "Please resposd with 5 letters.",
            "What is my name?",
            &client,
        )
        .await
        .unwrap();
    }
}
