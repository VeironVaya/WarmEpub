use super::book_controller::AppState;
use crate::dtos::{
    AiExplainWordRequestDto, ApiResponse, TranslateWordRequestDto, TranslationResponseDto,
    WordExplanationResponseDto,
};
use crate::error::AppError;
use axum::{extract::State, Json};

pub async fn translate_word(
    State(state): State<AppState>,
    Json(payload): Json<TranslateWordRequestDto>,
) -> Result<Json<ApiResponse<TranslationResponseDto>>, AppError> {
    let result = state.dictionary_service.translate_word(payload).await?;
    Ok(Json(ApiResponse::success(result)))
}

pub async fn explain_word(
    State(state): State<AppState>,
    Json(payload): Json<AiExplainWordRequestDto>,
) -> Result<Json<ApiResponse<WordExplanationResponseDto>>, AppError> {
    let result = state.dictionary_service.explain_word(payload).await?;
    Ok(Json(ApiResponse::success(result)))
}

