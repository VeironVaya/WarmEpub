use crate::error::AppError;
use crate::models::Bookmark;
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct BookmarkRepository {
    pool: PgPool,
}

impl BookmarkRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_bookmark(
        &self,
        book_id: Uuid,
        chapter_index: i32,
        page_number: i32,
        cfi: Option<&str>,
        snippet: Option<&str>,
    ) -> Result<Bookmark, AppError> {
        let now = Utc::now();
        let id = Uuid::new_v4();

        let inserted = sqlx::query_as::<_, Bookmark>(
            r#"
            INSERT INTO bookmarks (id, book_id, chapter_index, page_number, cfi, snippet, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(book_id)
        .bind(chapter_index)
        .bind(page_number)
        .bind(cfi)
        .bind(snippet)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(inserted)
    }

    pub async fn find_by_book(&self, book_id: Uuid) -> Result<Vec<Bookmark>, AppError> {
        let bookmarks = sqlx::query_as::<_, Bookmark>(
            r#"
            SELECT * FROM bookmarks
            WHERE book_id = $1
            ORDER BY chapter_index ASC, page_number ASC, created_at DESC
            "#,
        )
        .bind(book_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(bookmarks)
    }

    pub async fn delete_bookmark(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM bookmarks WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

