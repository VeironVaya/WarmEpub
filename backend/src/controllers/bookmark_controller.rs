use super::book_controller::AppState;
use crate::dtos::{ApiResponse, BookmarkResponseDto, CreateBookmarkRequestDto};
use crate::error::AppError;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn create_bookmark(
    State(state): State<AppState>,
    Path(book_id): Path<Uuid>,
    Json(payload): Json<CreateBookmarkRequestDto>,
) -> Result<Json<ApiResponse<BookmarkResponseDto>>, AppError> {
    let bookmark = state
        .bookmark_repo
        .create_bookmark(
            book_id,
            payload.chapter_index,
            payload.page_number.unwrap_or(1),
            payload.cfi.as_deref(),
            payload.snippet.as_deref(),
        )
        .await?;

    let dto = BookmarkResponseDto {
        id: bookmark.id,
        book_id: bookmark.book_id,
        chapter_index: bookmark.chapter_index,
        page_number: bookmark.page_number,
        cfi: bookmark.cfi,
        snippet: bookmark.snippet,
        created_at: bookmark.created_at,
    };

    Ok(Json(ApiResponse::success(dto)))
}

pub async fn list_bookmarks(
    State(state): State<AppState>,
    Path(book_id): Path<Uuid>,
) -> Result<Json<ApiResponse<Vec<BookmarkResponseDto>>>, AppError> {
    let bookmarks = state.bookmark_repo.find_by_book(book_id).await?;

    let dtos = bookmarks
        .into_iter()
        .map(|b| BookmarkResponseDto {
            id: b.id,
            book_id: b.book_id,
            chapter_index: b.chapter_index,
            page_number: b.page_number,
            cfi: b.cfi,
            snippet: b.snippet,
            created_at: b.created_at,
        })
        .collect();

    Ok(Json(ApiResponse::success(dtos)))
}

pub async fn delete_bookmark(
    State(state): State<AppState>,
    Path((_book_id, bookmark_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<ApiResponse<bool>>, AppError> {
    let deleted = state.bookmark_repo.delete_bookmark(bookmark_id).await?;
    Ok(Json(ApiResponse::success(deleted)))
}

