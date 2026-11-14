use crate::error::AppError;
use crate::models::{UserVocabulary, UserVocabularyWithBook};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Clone)]
pub struct VocabularyRepository {
    pool: PgPool,
}

impl VocabularyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn save_word(
        &self,
        book_id: Option<Uuid>,
        word: &str,
        sentence_context: &str,
        translation: &str,
        ai_explanation: &str,
    ) -> Result<UserVocabulary, AppError> {
        let now = Utc::now();
        let inserted = sqlx::query_as::<_, UserVocabulary>(
            r#"
            INSERT INTO user_vocabulary (id, book_id, word, sentence_context, translation, ai_explanation, saved_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(book_id)
        .bind(word)
        .bind(sentence_context)
        .bind(translation)
        .bind(ai_explanation)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(inserted)
    }

    pub async fn find_all(
        &self,
        book_id: Option<Uuid>,
    ) -> Result<Vec<UserVocabularyWithBook>, AppError> {
        let words = if let Some(bid) = book_id {
            sqlx::query_as::<_, UserVocabularyWithBook>(
                r#"
                SELECT v.id, v.book_id, b.title as book_title, v.word, v.sentence_context, v.translation, v.ai_explanation, v.saved_at
                FROM user_vocabulary v
                LEFT JOIN books b ON v.book_id = b.id
                WHERE v.book_id = $1
                ORDER BY v.saved_at DESC
                "#,
            )
            .bind(bid)
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, UserVocabularyWithBook>(
                r#"
                SELECT v.id, v.book_id, b.title as book_title, v.word, v.sentence_context, v.translation, v.ai_explanation, v.saved_at
                FROM user_vocabulary v
                LEFT JOIN books b ON v.book_id = b.id
                ORDER BY v.saved_at DESC
                "#,
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(words)
    }
}

