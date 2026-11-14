use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: Uuid,
    pub book_id: Uuid,
    pub chapter_index: i32,
    pub page_number: i32,
    pub cfi: Option<String>,
    pub snippet: Option<String>,
    pub created_at: DateTime<Utc>,
}

