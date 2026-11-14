use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SaveVocabularyRequestDto {
    pub book_id: Option<Uuid>,
    pub word: String,
    pub sentence_context: String,
    pub translation: String,
    pub ai_explanation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VocabularyResponseDto {
    pub id: Uuid,
    pub book_id: Option<Uuid>,
    pub book_title: Option<String>,
    pub word: String,
    pub sentence_context: String,
    pub translation: String,
    pub ai_explanation: String,
    pub saved_at: DateTime<Utc>,
}

