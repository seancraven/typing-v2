use reqwest;
use serde::{Deserialize, Serialize};

struct UserMessage {
    text: String,
}
impl UserMessage {
    fn format(&self) -> String {
        todo!();
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerationRequest {
    #[serde(rename = "generationConfig")]
    generation_config: TextGenerationParams,
    contents: Vec<Contents>,
}

#[derive(Debug, Deserialize)]
pub enum Role {
    User,
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
pub struct Contents {
    role: Role,
    parts: Vec<Text>,
}
#[derive(Debug, Serialize, Deserialize)]
pub struct Text {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TextGenerationParams {
    pub stop_sequences: Option<Vec<String>>,
    pub response_mime_type: Option<String>,
    pub response_schema: Option<Schema>,
    pub candidate_count: Option<u32>,
    pub max_output_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub top_p: Option<f32>,
    pub top_k: Option<u32>,
    pub presence_penalty: Option<f32>,
    pub frequency_penalty: Option<f32>,
    pub response_logprobs: Option<bool>,
    pub logprobs: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Schema {
    // Define the structure of your Schema here
    // For example:
    // pub field_name: FieldType,
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
}
