use crate::error::AppError;
use crate::models::ReadingProgress;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct ProgressRepository {
    pool: PgPool,
}

impl ProgressRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_progress(&self, book_id: Uuid) -> Result<Option<ReadingProgress>, AppError> {
        let progress = sqlx::query_as::<_, ReadingProgress>(
            "SELECT * FROM reading_progress WHERE book_id = $1",
        )
        .bind(book_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(progress)
    }

    pub async fn upsert_progress(
        &self,
        book_id: Uuid,
        current_chapter_index: i32,
        current_cfi: Option<&str>,
        progress_percentage: f32,
    ) -> Result<ReadingProgress, AppError> {
        let now = Utc::now();
        let upserted = sqlx::query_as::<_, ReadingProgress>(
            r#"
            INSERT INTO reading_progress (id, book_id, current_chapter_index, current_cfi, progress_percentage, last_read_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
            ON CONFLICT (book_id) DO UPDATE SET
                current_chapter_index = EXCLUDED.current_chapter_index,
                current_cfi = EXCLUDED.current_cfi,
                progress_percentage = EXCLUDED.progress_percentage,
                last_read_at = EXCLUDED.last_read_at
            RETURNING *
            "#,
        )
        .bind(book_id)
        .bind(current_chapter_index)
        .bind(current_cfi)
        .bind(progress_percentage)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(upserted)
    }
}

