use chrono::{DateTime, Utc};
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Debug)]
pub struct UserData {
    pub user_id: String,
    pub error_chars: Vec<(String, usize)>,
    pub topic_id: usize,
    pub end_idx: usize,
    pub start_idx: usize,
    pub wpm: f64,
    pub finished: bool,
    pub type_time_ms: f64,
}
#[derive(Debug, Serialize)]
pub struct TopicProgress {
    topic_id: usize,
    pub progress: f32,
    final_idx: usize,
    lang: String,
    title: String,
}
impl TopicProgress {
    pub fn new(
        topic_id: usize,
        progress: f32,
        final_idx: usize,
        lang: String,
        title: String,
    ) -> Self {
        Self {
            topic_id,
            progress,
            final_idx,
            lang,
            title,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct TopicData {
    pub lang: String,
    pub topics: Vec<(i32, String)>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TypingInfo {
    wpm: f64,
    typing_length: usize,
    error_rate: f64,
    title: String,
    lang: String,
    type_time_s: f64,
    start_idx: usize,
    end_idx: usize,
    topic_id: usize,
    time: DateTime<Utc>,
}
impl TypingInfo {
    pub fn new(
        wpm: f64,
        typing_length: usize,
        error_rate: f64,
        title: String,
        lang: String,
        type_time_s: f64,
        start_idx: usize,
        end_idx: usize,
        topic_id: usize,
        time: DateTime<Utc>,
    ) -> Self {
        Self {
            wpm,
            typing_length,
            error_rate,
            title,
            lang,
            type_time_s,
            start_idx,
            end_idx,
            topic_id,
            time,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct User {
    pub username: String,
    pub password: SecretString,
    pub email: String,
}
impl User {
    pub fn new(username: String, password: String, email: String) -> Self {
        Self {
            username,
            password: SecretString::from(password),
            email,
        }
    }
}
#[derive(Debug, Deserialize, Serialize)]
pub struct UserGoal {
    pub accuracy: f64,
    pub wpm: f64,
    pub time_spent: f64,
}
impl UserGoal {
    pub fn new(accuracy: f64, wpm: f64, time_spent: f64) -> Self {
        Self {
            accuracy,
            wpm,
            time_spent,
        }
    }
}
#[derive(Debug)]
pub struct TypingRun {
    user_id: Uuid,
    wpm: f64,
    errors: String,
}

impl TryFrom<UserData> for TypingRun {
    type Error = uuid::Error;
    fn try_from(value: UserData) -> Result<Self, Self::Error> {
        let mut error_string = String::new();
        for (key, count) in value.error_chars {
            error_string.push_str(&format!("{}:{},", key, count));
        }
        Ok(TypingRun {
            user_id: uuid::Uuid::parse_str(&value.user_id)?,
            wpm: value.wpm,
            errors: error_string,
        })
    }
}
