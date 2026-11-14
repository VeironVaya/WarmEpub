use crate::dtos::{BookDetailDto, BookResponseDto};
use crate::error::AppError;
use crate::models::Book;
use crate::repositories::BookRepository;
use crate::services::epub_parser::EpubParser;
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

#[derive(Clone)]
pub struct BookService {
    book_repo: BookRepository,
    storage_dir: PathBuf,
}

impl BookService {
    pub fn new(book_repo: BookRepository, storage_dir: impl AsRef<Path>) -> Self {
        let storage_path = storage_dir.as_ref().to_path_buf();
        let _ = fs::create_dir_all(storage_path.join("books"));
        let _ = fs::create_dir_all(storage_path.join("covers"));

        Self {
            book_repo,
            storage_dir: storage_path,
        }
    }

    pub async fn process_upload(
        &self,
        file_bytes: Vec<u8>,
        _filename: &str,
    ) -> Result<BookResponseDto, AppError> {
        let parsed = EpubParser::parse(&file_bytes)?;
        let book_id = Uuid::new_v4();

        // 1. Save EPUB file
        let book_file_path = self.storage_dir.join("books").join(format!("{book_id}.epub"));
        fs::write(&book_file_path, &file_bytes)
            .map_err(|e| AppError::Internal(format!("Failed to save EPUB file: {e}")))?;

        // 2. Save cover image if extracted
        let cover_path_str = if let Some(cover_bytes) = parsed.cover_image_bytes {
            let cover_filename = format!("{book_id}.{}", parsed.cover_image_ext);
            let cover_file_path = self.storage_dir.join("covers").join(&cover_filename);
            if fs::write(&cover_file_path, cover_bytes).is_ok() {
                Some(cover_filename)
            } else {
                None
            }
        } else {
            None
        };

        // 3. Insert record into PostgreSQL
        let now = Utc::now();
        let new_book = Book {
            id: book_id,
            title: parsed.title,
            author: parsed.author,
            description: parsed.description,
            language: Some(parsed.language.clone()),
            file_path: book_file_path.to_string_lossy().to_string(),
            cover_image_path: cover_path_str,
            total_chapters: parsed.total_chapters as i32,
            created_at: now,
            updated_at: now,
        };

        let saved = self.book_repo.insert(&new_book).await?;

        Ok(BookResponseDto {
            id: saved.id,
            title: saved.title,
            author: saved.author,
            description: saved.description,
            language: saved.language.unwrap_or_else(|| "en".to_string()),
            cover_url: saved
                .cover_image_path
                .as_ref()
                .map(|_| format!("/api/books/{}/cover", saved.id)),
            total_chapters: saved.total_chapters,
            current_chapter_index: 0,
            progress_percentage: 0.0,
            last_read_at: None,
            created_at: saved.created_at,
        })
    }

    pub async fn get_all_books(&self) -> Result<Vec<BookResponseDto>, AppError> {
        let books = self.book_repo.find_all().await?;

        let dtos = books
            .into_iter()
            .map(|b| BookResponseDto {
                id: b.id,
                title: b.title,
                author: b.author,
                description: b.description,
                language: b.language.unwrap_or_else(|| "en".to_string()),
                cover_url: b
                    .cover_image_path
                    .as_ref()
                    .map(|_| format!("/api/books/{}/cover", b.id)),
                total_chapters: b.total_chapters,
                current_chapter_index: b.current_chapter_index.unwrap_or(0),
                progress_percentage: b.progress_percentage.unwrap_or(0.0),
                last_read_at: b.last_read_at,
                created_at: b.created_at,
            })
            .collect();

        Ok(dtos)
    }

    pub async fn get_book_detail(&self, id: Uuid) -> Result<BookDetailDto, AppError> {
        let book_with_progress = self
            .book_repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Book '{id}' not found")))?;

        // Read EPUB to parse Table of Contents
        let file_bytes = fs::read(&book_with_progress.file_path)
            .map_err(|e| AppError::Internal(format!("Failed to read book file from disk: {e}")))?;

        let parsed = EpubParser::parse(&file_bytes)?;

        Ok(BookDetailDto {
            id: book_with_progress.id,
            title: book_with_progress.title,
            author: book_with_progress.author,
            description: book_with_progress.description,
            language: book_with_progress.language.unwrap_or_else(|| "en".to_string()),
            cover_url: book_with_progress
                .cover_image_path
                .as_ref()
                .map(|_| format!("/api/books/{}/cover", book_with_progress.id)),
            total_chapters: book_with_progress.total_chapters,
            current_chapter_index: book_with_progress.current_chapter_index.unwrap_or(0),
            current_cfi: book_with_progress.current_cfi,
            progress_percentage: book_with_progress.progress_percentage.unwrap_or(0.0),
            table_of_contents: parsed.table_of_contents,
            last_read_at: book_with_progress.last_read_at,
            created_at: book_with_progress.created_at,
        })
    }

    pub async fn get_cover_image(&self, id: Uuid) -> Result<(Vec<u8>, String), AppError> {
        let book = self
            .book_repo
            .find_raw_by_id(id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Book '{id}' not found")))?;

        if let Some(cover_name) = book.cover_image_path {
            let path = self.storage_dir.join("covers").join(&cover_name);
            if let Ok(bytes) = fs::read(&path) {
                let content_type = if cover_name.ends_with(".png") {
                    "image/png".to_string()
                } else {
                    "image/jpeg".to_string()
                };
                return Ok((bytes, content_type));
            }
        }

        // Return a generated warm SVG placeholder cover
        let svg = format!(
            r##"<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
  <rect width="100%" height="100%" fill="#FAF7F2" stroke="#E5DDD3" stroke-width="2"/>
  <rect x="20" y="20" width="260" height="410" rx="12" fill="#F5EFEB"/>
  <text x="150" y="200" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2D2825" text-anchor="middle">{}</text>
  <text x="150" y="240" font-family="sans-serif" font-size="14" fill="#7C746E" text-anchor="middle">{}</text>
  <circle cx="150" cy="130" r="30" fill="#D3746B" opacity="0.8"/>
</svg>"##,
            html_escape::encode_text(&book.title),
            html_escape::encode_text(&book.author)
        );

        Ok((svg.into_bytes(), "image/svg+xml".to_string()))
    }

    pub async fn delete_book(&self, id: Uuid) -> Result<(), AppError> {
        if let Some(book) = self.book_repo.find_raw_by_id(id).await? {
            let _ = fs::remove_file(&book.file_path);
            if let Some(cover_name) = book.cover_image_path {
                let _ = fs::remove_file(self.storage_dir.join("covers").join(cover_name));
            }
            self.book_repo.delete(id).await?;
        }
        Ok(())
    }
}

// Simple HTML escaping helper for SVG generator
mod html_escape {
    pub fn encode_text(s: &str) -> String {
        s.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
    }
}

