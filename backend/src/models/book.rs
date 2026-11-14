use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Clone)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub file_path: String,
    pub cover_image_path: Option<String>,
    pub total_chapters: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, FromRow)]
pub struct BookWithProgress {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub file_path: String,
    pub cover_image_path: Option<String>,
    pub total_chapters: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub current_chapter_index: Option<i32>,
    pub current_cfi: Option<String>,
    pub progress_percentage: Option<f32>,
    pub last_read_at: Option<DateTime<Utc>>,
}

