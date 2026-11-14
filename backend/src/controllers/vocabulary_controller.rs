use super::book_controller::AppState;
use crate::dtos::{ApiResponse, SaveVocabularyRequestDto, VocabularyResponseDto};
use crate::error::AppError;
use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct VocabFilterQuery {
    pub book_id: Option<Uuid>,
}

pub async fn save_vocabulary(
    State(state): State<AppState>,
    Json(payload): Json<SaveVocabularyRequestDto>,
) -> Result<Json<ApiResponse<VocabularyResponseDto>>, AppError> {
    let saved = state
        .vocabulary_repo
        .save_word(
            payload.book_id,
            &payload.word,
            &payload.sentence_context,
            &payload.translation,
            &payload.ai_explanation,
        )
        .await?;

    Ok(Json(ApiResponse::success(VocabularyResponseDto {
        id: saved.id,
        book_id: saved.book_id,
        book_title: None,
        word: saved.word,
        sentence_context: saved.sentence_context,
        translation: saved.translation,
        ai_explanation: saved.ai_explanation,
        saved_at: saved.saved_at,
    })))
}

pub async fn list_vocabulary(
    State(state): State<AppState>,
    Query(query): Query<VocabFilterQuery>,
) -> Result<Json<ApiResponse<Vec<VocabularyResponseDto>>>, AppError> {
    let list = state.vocabulary_repo.find_all(query.book_id).await?;

    let dtos = list
        .into_iter()
        .map(|v| VocabularyResponseDto {
            id: v.id,
            book_id: v.book_id,
            book_title: v.book_title,
            word: v.word,
            sentence_context: v.sentence_context,
            translation: v.translation,
            ai_explanation: v.ai_explanation,
            saved_at: v.saved_at,
        })
        .collect();

    Ok(Json(ApiResponse::success(dtos)))
}

