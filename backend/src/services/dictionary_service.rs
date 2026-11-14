use crate::dtos::{
    AiExplainWordRequestDto, TranslateWordRequestDto, TranslationResponseDto,
    WordExplanationResponseDto,
};
use crate::error::AppError;
use crate::repositories::WordCacheRepository;
use crate::services::ai::AiProvider;
use sha2::{Digest, Sha256};
use std::sync::Arc;

#[derive(Clone)]
pub struct DictionaryService {
    word_cache_repo: WordCacheRepository,
    ai_provider: Arc<dyn AiProvider>,
}

impl DictionaryService {
    pub fn new(
        word_cache_repo: WordCacheRepository,
        ai_provider: Arc<dyn AiProvider>,
    ) -> Self {
        Self {
            word_cache_repo,
            ai_provider,
        }
    }

    pub fn compute_context_hash(word: &str, sentence: &str, target_lang: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(word.trim().to_lowercase().as_bytes());
        hasher.update(b":");
        hasher.update(sentence.trim().as_bytes());
        hasher.update(b":");
        hasher.update(target_lang.trim().as_bytes());
        hex::encode(hasher.finalize())
    }

    pub async fn explain_word(
        &self,
        dto: AiExplainWordRequestDto,
    ) -> Result<WordExplanationResponseDto, AppError> {
        let target_lang = dto.target_language.unwrap_or_else(|| "id".to_string());
        let clean_word = dto.word.trim();
        let context_hash = Self::compute_context_hash(clean_word, &dto.sentence_context, &target_lang);

        // 1. Check PostgreSQL Cache
        if let Some(cached) = self
            .word_cache_repo
            .find_cached(clean_word, &context_hash, &target_lang)
            .await?
        {
            tracing::info!("Cache HIT for word: '{}' (hash: {})", clean_word, &context_hash[..8]);
            return Ok(WordExplanationResponseDto {
                word: cached.word,
                phonetic: None,
                direct_translation: cached.direct_translation,
                contextual_explanation: cached.ai_context_explanation,
                example_usage: Some(dto.sentence_context),
                provider_used: cached.provider,
                is_cached: true,
            });
        }

        // 2. Cache MISS: Query Pluggable AI Provider
        tracing::info!(
            "Cache MISS for word: '{}' -> calling {} AI provider",
            clean_word,
            self.ai_provider.provider_name()
        );

        let ai_result = self
            .ai_provider
            .explain_word(clean_word, &dto.sentence_context, &target_lang)
            .await?;

        // 3. Persist in PostgreSQL Cache
        let _ = self
            .word_cache_repo
            .save_cached(
                clean_word,
                &context_hash,
                &target_lang,
                &ai_result.direct_translation,
                &ai_result.contextual_explanation,
                self.ai_provider.provider_name(),
            )
            .await;

        Ok(WordExplanationResponseDto {
            word: clean_word.to_string(),
            phonetic: ai_result.phonetic,
            direct_translation: ai_result.direct_translation,
            contextual_explanation: ai_result.contextual_explanation,
            example_usage: ai_result.example_usage.or(Some(dto.sentence_context)),
            provider_used: self.ai_provider.provider_name().to_string(),
            is_cached: false,
        })
    }

    pub async fn translate_word(
        &self,
        dto: TranslateWordRequestDto,
    ) -> Result<TranslationResponseDto, AppError> {
        let target_lang = dto.target_language.unwrap_or_else(|| "id".to_string());
        let translation = self
            .ai_provider
            .translate_word(&dto.word, &target_lang)
            .await?;

        Ok(TranslationResponseDto {
            word: dto.word,
            phonetic: None,
            target_language: target_lang,
            translation,
        })
    }
}

