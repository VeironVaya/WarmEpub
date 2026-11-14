use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Clone)]
pub struct WordDefinitionCache {
    pub id: Uuid,
    pub word: String,
    pub context_hash: String,
    pub target_language: String,
    pub direct_translation: String,
    pub ai_context_explanation: String,
    pub provider: String,
    pub created_at: DateTime<Utc>,
}

