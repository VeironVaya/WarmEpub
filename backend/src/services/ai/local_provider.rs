use super::{AiExplanationPayload, AiProvider};
use crate::error::AppError;
use async_trait::async_trait;
use reqwest::Client;
use serde_json::json;

pub struct LocalModelProvider {
    endpoint_url: String,
    model_name: String,
    client: Client,
}

impl LocalModelProvider {
    pub fn new(endpoint_url: String, model_name: String) -> Self {
        Self {
            endpoint_url,
            model_name,
            client: Client::new(),
        }
    }
}

#[async_trait]
impl AiProvider for LocalModelProvider {
    fn provider_name(&self) -> &'static str {
        "local"
    }

    async fn explain_word(
        &self,
        word: &str,
        sentence_context: &str,
        target_lang: &str,
    ) -> Result<AiExplanationPayload, AppError> {
        let prompt = format!(
            "Word: {word}\nSentence: {sentence_context}\nExplain in {target_lang} in 2 sentences."
        );

        let body = json!({
            "model": self.model_name,
            "prompt": prompt,
            "stream": false
        });

        match self.client.post(&self.endpoint_url).json(&body).send().await {
            Ok(res) if res.status().is_success() => {
                let json_res: serde_json::Value = res.json().await.unwrap_or_default();
                let response_text = json_res["response"]
                    .as_str()
                    .unwrap_or("Local model generated response")
                    .to_string();

                Ok(AiExplanationPayload {
                    phonetic: None,
                    direct_translation: word.to_string(),
                    contextual_explanation: response_text,
                    example_usage: Some(sentence_context.to_string()),
                })
            }
            _ => {
                // Offline fallback
                Ok(AiExplanationPayload {
                    phonetic: None,
                    direct_translation: format!("{word} (local translation)"),
                    contextual_explanation: format!(
                        "In this sentence ('{sentence_context}'), '{word}' is used in context."
                    ),
                    example_usage: Some(sentence_context.to_string()),
                })
            }
        }
    }

    async fn translate_word(
        &self,
        word: &str,
        _target_lang: &str,
    ) -> Result<String, AppError> {
        Ok(format!("{word} [local]"))
    }
}

