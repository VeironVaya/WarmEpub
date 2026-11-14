use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use chrono::Utc;

#[derive(Debug)]
pub enum AppError {
    Database(sqlx::Error),
    NotFound(String),
    BadRequest(String),
    Internal(String),
    Epub(String),
    AiService(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Database(err) => write!(f, "Database error: {err}"),
            AppError::NotFound(msg) => write!(f, "Not found: {msg}"),
            AppError::BadRequest(msg) => write!(f, "Bad request: {msg}"),
            AppError::Internal(msg) => write!(f, "Internal server error: {msg}"),
            AppError::Epub(msg) => write!(f, "EPUB processing error: {msg}"),
            AppError::AiService(msg) => write!(f, "AI service error: {msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err)
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Internal(err.to_string())
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Epub(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg.clone()),
            AppError::Database(err) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {err}"),
            ),
            AppError::AiService(msg) => (StatusCode::BAD_GATEWAY, msg.clone()),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
        };

        let body = Json(json!({
            "success": false,
            "data": null,
            "error": error_message,
            "timestamp": Utc::now().to_rfc3339()
        }));

        (status, body).into_response()
    }
}

