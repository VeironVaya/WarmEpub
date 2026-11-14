use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct TranslateWordRequestDto {
    pub word: String,
    pub target_language: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TranslationResponseDto {
    pub word: String,
    pub phonetic: Option<String>,
    pub target_language: String,
    pub translation: String,
}

#[derive(Debug, Deserialize)]
pub struct AiExplainWordRequestDto {
    pub word: String,
    pub sentence_context: String,
    pub target_language: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordExplanationResponseDto {
    pub word: String,
    pub phonetic: Option<String>,
    pub direct_translation: String,
    pub contextual_explanation: String,
    pub example_usage: Option<String>,
    pub provider_used: String,
    pub is_cached: bool,
}

