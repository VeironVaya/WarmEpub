use super::book_controller::AppState;
use crate::dtos::{ApiResponse, ChapterResponseDto, ProgressResponseDto, UpdateProgressDto};
use crate::error::AppError;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn get_chapter(
    State(state): State<AppState>,
    Path((id, index)): Path<(Uuid, usize)>,
) -> Result<Json<ApiResponse<ChapterResponseDto>>, AppError> {
    let chapter = state.reader_service.get_chapter(id, index).await?;
    Ok(Json(ApiResponse::success(chapter)))
}

pub async fn update_progress(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateProgressDto>,
) -> Result<Json<ApiResponse<ProgressResponseDto>>, AppError> {
    let progress = state.reader_service.update_progress(id, payload).await?;
    Ok(Json(ApiResponse::success(progress)))
}

