use super::{AiExplanationPayload, AiProvider};
use crate::error::AppError;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

pub struct GeminiProvider {
    api_key: String,
    model: String,
    client: Client,
}

impl GeminiProvider {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            api_key,
            model,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AiProvider for GeminiProvider {
    fn provider_name(&self) -> &'static str {
        "gemini"
    }

    async fn explain_word(
        &self,
        word: &str,
        sentence_context: &str,
        target_lang: &str,
    ) -> Result<AiExplanationPayload, AppError> {
        if self.api_key.trim().is_empty() {
            // Graceful fallback if user hasn't configured API key yet
            return Ok(AiExplanationPayload {
                phonetic: None,
                direct_translation: format!("[Translation of '{word}' to {target_lang}]"),
                contextual_explanation: format!(
                    "In this sentence ('{sentence_context}'), '{word}' is used in context. (Set GEMINI_API_KEY in .env for full AI explanations)."
                ),
                example_usage: Some(sentence_context.to_string()),
            });
        }

        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let lang_name = match target_lang {
            "id" => "Indonesian",
            "es" => "Spanish",
            "fr" => "French",
            "de" => "German",
            _ => "Indonesian",
        };

        let is_sentence = word.contains(' ') && word.split_whitespace().count() > 3;

        let system_instruction = format!(
            r#"You are an intelligent, empathetic literary reading assistant for an e-book reader.
You assist the reader by translating and explaining words, phrases, idioms, or full sentences/passages into {lang_name}.

Rules for translation & explanation:
- If the target is a SINGLE WORD:
  - "direct_translation": Concise, natural translation of the word into {lang_name} based on its meaning in the given sentence.
  - "contextual_explanation": 1-2 warm, clear sentences explaining what this word specifically means in this sentence, avoiding academic jargon.
  - "phonetic": IPA pronunciation or null.
- If the target is a PHRASE, IDIOM, or FULL SENTENCE:
  - "direct_translation": A complete, natural, and fluent translation into {lang_name} of the entire blocked text.
  - "contextual_explanation": 1-2 insightful sentences explaining the literary tone, metaphor, cultural idiom, or subtle character emotion conveyed by this passage.
  - "phonetic": null.
- "example_usage": A short natural sentence, or null.

You MUST return your answer in valid JSON matching this schema:
{{
  "phonetic": "IPA pronunciation or null",
  "direct_translation": "Translation in {lang_name}",
  "contextual_explanation": "Contextual explanation or literary nuance in {lang_name}",
  "example_usage": "Example or null"
}}
Do NOT wrap in markdown code fences or backticks. Return raw JSON only."#
        );

        let user_prompt = if is_sentence {
            format!(
                "Passage to Translate & Explain:\n\"{word}\"\nContext in Chapter:\n\"{sentence_context}\"\nTranslate this passage fluently into {lang_name} and explain literary nuance/tone."
            )
        } else {
            format!(
                "Target Word:\n\"{word}\"\nSentence Context:\n\"{sentence_context}\"\nExplain this word in this context in {lang_name}."
            )
        };

        let body = json!({
            "system_instruction": {
                "parts": [{ "text": system_instruction }]
            },
            "contents": [{
                "parts": [{ "text": user_prompt }]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.3
            }
        });

        let response = self
            .client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| AppError::AiService(format!("Failed to reach Gemini API: {e}")))?;

        if !response.status().is_success() {
            let error_status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            tracing::warn!("Gemini API error (status {error_status}): {error_text}");
            return Ok(AiExplanationPayload {
                phonetic: None,
                direct_translation: word.to_string(),
                contextual_explanation: format!(
                    "Layanan AI sedang tidak dapat dijangkau: {}",
                    error_text.chars().take(150).collect::<String>()
                ),
                example_usage: None,
            });
        }

        let resp_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AppError::AiService(format!("Failed to parse Gemini response: {e}")))?;

        let text_content = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .unwrap_or_default();

        // Parse structured JSON
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(text_content) {
            let phonetic = parsed["phonetic"].as_str().map(|s| s.to_string());
            let direct_translation = parsed["direct_translation"]
                .as_str()
                .unwrap_or(word)
                .to_string();
            let contextual_explanation = parsed["contextual_explanation"]
                .as_str()
                .unwrap_or("Explanation unavailable")
                .to_string();
            let example_usage = parsed["example_usage"].as_str().map(|s| s.to_string());

            return Ok(AiExplanationPayload {
                phonetic,
                direct_translation,
                contextual_explanation,
                example_usage,
            });
        }

        Ok(AiExplanationPayload {
            phonetic: None,
            direct_translation: word.to_string(),
            contextual_explanation: text_content.to_string(),
            example_usage: None,
        })
    }

    async fn translate_word(
        &self,
        word: &str,
        target_lang: &str,
    ) -> Result<String, AppError> {
        let explanation = self.explain_word(word, word, target_lang).await?;
        Ok(explanation.direct_translation)
    }
}

