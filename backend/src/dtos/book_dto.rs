use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct BookResponseDto {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub language: String,
    pub cover_url: Option<String>,
    pub total_chapters: i32,
    pub current_chapter_index: i32,
    pub progress_percentage: f32,
    pub last_read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TocItemDto {
    pub index: usize,
    pub title: String,
    pub href: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BookDetailDto {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub language: String,
    pub cover_url: Option<String>,
    pub total_chapters: i32,
    pub current_chapter_index: i32,
    pub current_cfi: Option<String>,
    pub progress_percentage: f32,
    pub table_of_contents: Vec<TocItemDto>,
    pub last_read_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

