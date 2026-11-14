use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateBookmarkRequestDto {
    pub chapter_index: i32,
    pub page_number: Option<i32>,
    pub cfi: Option<String>,
    pub snippet: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BookmarkResponseDto {
    pub id: Uuid,
    pub book_id: Uuid,
    pub chapter_index: i32,
    pub page_number: i32,
    pub cfi: Option<String>,
    pub snippet: Option<String>,
    pub created_at: DateTime<Utc>,
}

