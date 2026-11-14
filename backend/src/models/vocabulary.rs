use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Clone)]
pub struct UserVocabulary {
    pub id: Uuid,
    pub book_id: Option<Uuid>,
    pub word: String,
    pub sentence_context: String,
    pub translation: String,
    pub ai_explanation: String,
    pub saved_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct UserVocabularyWithBook {
    pub id: Uuid,
    pub book_id: Option<Uuid>,
    pub book_title: Option<String>,
    pub word: String,
    pub sentence_context: String,
    pub translation: String,
    pub ai_explanation: String,
    pub saved_at: DateTime<Utc>,
}

