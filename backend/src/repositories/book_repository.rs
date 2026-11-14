use crate::error::AppError;
use crate::models::{Book, BookWithProgress};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct BookRepository {
    pool: PgPool,
}

impl BookRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_all(&self) -> Result<Vec<BookWithProgress>, AppError> {
        let books = sqlx::query_as::<_, BookWithProgress>(
            r#"
            SELECT 
                b.id, b.title, b.author, b.description, b.language, 
                b.file_path, b.cover_image_path, b.total_chapters, 
                b.created_at, b.updated_at,
                rp.current_chapter_index, rp.current_cfi, rp.progress_percentage, rp.last_read_at
            FROM books b
            LEFT JOIN reading_progress rp ON b.id = rp.book_id
            ORDER BY COALESCE(rp.last_read_at, b.updated_at) DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(books)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<BookWithProgress>, AppError> {
        let book = sqlx::query_as::<_, BookWithProgress>(
            r#"
            SELECT 
                b.id, b.title, b.author, b.description, b.language, 
                b.file_path, b.cover_image_path, b.total_chapters, 
                b.created_at, b.updated_at,
                rp.current_chapter_index, rp.current_cfi, rp.progress_percentage, rp.last_read_at
            FROM books b
            LEFT JOIN reading_progress rp ON b.id = rp.book_id
            WHERE b.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(book)
    }

    pub async fn find_raw_by_id(&self, id: Uuid) -> Result<Option<Book>, AppError> {
        let book = sqlx::query_as::<_, Book>(
            "SELECT * FROM books WHERE id = $1",
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(book)
    }

    pub async fn insert(&self, book: &Book) -> Result<Book, AppError> {
        let inserted = sqlx::query_as::<_, Book>(
            r#"
            INSERT INTO books (id, title, author, description, language, file_path, cover_image_path, total_chapters, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
        )
        .bind(book.id)
        .bind(&book.title)
        .bind(&book.author)
        .bind(&book.description)
        .bind(&book.language)
        .bind(&book.file_path)
        .bind(&book.cover_image_path)
        .bind(book.total_chapters)
        .bind(book.created_at)
        .bind(book.updated_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(inserted)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, AppError> {
        let result = sqlx::query("DELETE FROM books WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

