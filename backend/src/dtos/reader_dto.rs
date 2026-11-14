use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterResponseDto {
    pub book_id: Uuid,
    pub chapter_index: usize,
    pub title: String,
    pub content_html: String,
    pub total_chapters: usize,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProgressDto {
    pub current_chapter_index: i32,
    pub current_cfi: Option<String>,
    pub progress_percentage: f32,
}

#[derive(Debug, Serialize)]
pub struct ProgressResponseDto {
    pub book_id: Uuid,
    pub current_chapter_index: i32,
    pub current_cfi: Option<String>,
    pub progress_percentage: f32,
    pub last_read_at: DateTime<Utc>,
}

