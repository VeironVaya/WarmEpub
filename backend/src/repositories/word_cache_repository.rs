use crate::error::AppError;
use crate::models::WordDefinitionCache;
use chrono::Utc;
use sqlx::PgPool;

#[derive(Clone)]
pub struct WordCacheRepository {
    pool: PgPool,
}

impl WordCacheRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_cached(
        &self,
        word: &str,
        context_hash: &str,
        target_language: &str,
    ) -> Result<Option<WordDefinitionCache>, AppError> {
        let cached = sqlx::query_as::<_, WordDefinitionCache>(
            r#"
            SELECT * FROM word_definition_cache
            WHERE LOWER(word) = LOWER($1) AND context_hash = $2 AND target_language = $3
            LIMIT 1
            "#,
        )
        .bind(word)
        .bind(context_hash)
        .bind(target_language)
        .fetch_optional(&self.pool)
        .await?;

        Ok(cached)
    }

    pub async fn save_cached(
        &self,
        word: &str,
        context_hash: &str,
        target_language: &str,
        direct_translation: &str,
        ai_context_explanation: &str,
        provider: &str,
    ) -> Result<WordDefinitionCache, AppError> {
        let now = Utc::now();
        let inserted = sqlx::query_as::<_, WordDefinitionCache>(
            r#"
            INSERT INTO word_definition_cache (id, word, context_hash, target_language, direct_translation, ai_context_explanation, provider, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (word, context_hash, target_language) DO UPDATE SET
                direct_translation = EXCLUDED.direct_translation,
                ai_context_explanation = EXCLUDED.ai_context_explanation,
                provider = EXCLUDED.provider
            RETURNING *
            "#,
        )
        .bind(word)
        .bind(context_hash)
        .bind(target_language)
        .bind(direct_translation)
        .bind(ai_context_explanation)
        .bind(provider)
        .bind(now)
        .fetch_one(&self.pool)
        .await?;

        Ok(inserted)
    }
}

