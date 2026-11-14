pub mod gemini_provider;
pub mod local_provider;

use crate::config::Config;
use crate::error::AppError;
use async_trait::async_trait;
use std::sync::Arc;

pub use gemini_provider::GeminiProvider;
pub use local_provider::LocalModelProvider;

#[derive(Debug, Clone)]
pub struct AiExplanationPayload {
    pub phonetic: Option<String>,
    pub direct_translation: String,
    pub contextual_explanation: String,
    pub example_usage: Option<String>,
}

#[async_trait]
pub trait AiProvider: Send + Sync {
    async fn explain_word(
        &self,
        word: &str,
        sentence_context: &str,
        target_lang: &str,
    ) -> Result<AiExplanationPayload, AppError>;

    async fn translate_word(
        &self,
        word: &str,
        target_lang: &str,
    ) -> Result<String, AppError>;

    fn provider_name(&self) -> &'static str;
}

pub fn create_ai_provider(config: &Config) -> Arc<dyn AiProvider> {
    if config.ai_provider == "local" {
        tracing::info!("Initializing Local Model AI Provider at {}", config.local_model_url);
        Arc::new(LocalModelProvider::new(
            config.local_model_url.clone(),
            config.local_model_name.clone(),
        ))
    } else {
        tracing::info!("Initializing Google Gemini AI Provider (Model: {})", config.gemini_model);
        Arc::new(GeminiProvider::new(
            config.gemini_api_key.clone(),
            config.gemini_model.clone(),
        ))
    }
}

