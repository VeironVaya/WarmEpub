use crate::dtos::{ApiResponse, BookDetailDto, BookResponseDto};
use crate::error::AppError;
use crate::services::BookService;
use axum::{
    extract::{Multipart, Path, State},
    http::header,
    response::{IntoResponse, Response},
    Json,
};
use uuid::Uuid;

#[derive(Clone)]
pub struct AppState {
    pub book_service: BookService,
    pub reader_service: crate::services::ReaderService,
    pub dictionary_service: crate::services::DictionaryService,
    pub vocabulary_repo: crate::repositories::VocabularyRepository,
    pub bookmark_repo: crate::repositories::BookmarkRepository,
}

pub async fn upload_book(
    State(state): State<AppState>,
    mut multipart: Multipart,
) -> Result<Json<ApiResponse<BookResponseDto>>, AppError> {
    let mut file_bytes = Vec::new();
    let mut filename = "book.epub".to_string();

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Failed to read multipart field: {e}")))?
    {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" || name == "epub" {
            if let Some(fname) = field.file_name() {
                filename = fname.to_string();
            }
            file_bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::BadRequest(format!("Failed to read file bytes: {e}")))?
                .to_vec();
            break;
        }
    }

    if file_bytes.is_empty() {
        return Err(AppError::BadRequest("No EPUB file provided in form field 'file'".to_string()));
    }

    let book = state.book_service.process_upload(file_bytes, &filename).await?;
    Ok(Json(ApiResponse::success(book)))
}

pub async fn list_books(
    State(state): State<AppState>,
) -> Result<Json<ApiResponse<Vec<BookResponseDto>>>, AppError> {
    let books = state.book_service.get_all_books().await?;
    Ok(Json(ApiResponse::success(books)))
}

pub async fn get_book_detail(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<BookDetailDto>>, AppError> {
    let book = state.book_service.get_book_detail(id).await?;
    Ok(Json(ApiResponse::success(book)))
}

pub async fn get_book_cover(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Response, AppError> {
    let (bytes, content_type) = state.book_service.get_cover_image(id).await?;
    Ok((
        [(header::CONTENT_TYPE, content_type)],
        bytes,
    ).into_response())
}

pub async fn delete_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<ApiResponse<serde_json::Value>>, AppError> {
    state.book_service.delete_book(id).await?;
    Ok(Json(ApiResponse::success(serde_json::json!({
        "message": "Book deleted successfully"
    }))))
}

