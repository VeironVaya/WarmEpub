use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, FromRow, Clone)]
pub struct ReadingProgress {
    pub id: Uuid,
    pub book_id: Uuid,
    pub current_chapter_index: i32,
    pub current_cfi: Option<String>,
    pub progress_percentage: f32,
    pub last_read_at: DateTime<Utc>,
}

