use crate::dtos::{ChapterResponseDto, ProgressResponseDto, UpdateProgressDto};
use crate::error::AppError;
use crate::repositories::{BookRepository, ProgressRepository};
use crate::services::epub_parser::EpubParser;
use std::fs;
use uuid::Uuid;

#[derive(Clone)]
pub struct ReaderService {
    book_repo: BookRepository,
    progress_repo: ProgressRepository,
}

impl ReaderService {
    pub fn new(book_repo: BookRepository, progress_repo: ProgressRepository) -> Self {
        Self {
            book_repo,
            progress_repo,
        }
    }

    pub async fn get_chapter(
        &self,
        book_id: Uuid,
        chapter_index: usize,
    ) -> Result<ChapterResponseDto, AppError> {
        let book = self
            .book_repo
            .find_raw_by_id(book_id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Book '{book_id}' not found")))?;

        let file_bytes = fs::read(&book.file_path)
            .map_err(|e| AppError::Internal(format!("Failed to read book file: {e}")))?;

        let parsed = EpubParser::parse(&file_bytes)?;

        if chapter_index >= parsed.spine_hrefs.len() {
            return Err(AppError::NotFound(format!(
                "Chapter index {chapter_index} out of bounds (book has {} chapters)",
                parsed.spine_hrefs.len()
            )));
        }

        let chapter_href = &parsed.spine_hrefs[chapter_index];
        let raw_xhtml = EpubParser::read_chapter(&file_bytes, chapter_href)?;

        let sanitized_html = Self::sanitize_chapter_html(&raw_xhtml);
        let chapter_title = parsed
            .table_of_contents
            .get(chapter_index)
            .map(|t| t.title.clone())
            .unwrap_or_else(|| format!("Chapter {}", chapter_index + 1));

        Ok(ChapterResponseDto {
            book_id,
            chapter_index,
            title: chapter_title,
            content_html: sanitized_html,
            total_chapters: parsed.spine_hrefs.len(),
        })
    }

    pub async fn update_progress(
        &self,
        book_id: Uuid,
        dto: UpdateProgressDto,
    ) -> Result<ProgressResponseDto, AppError> {
        // Ensure book exists
        let _ = self
            .book_repo
            .find_raw_by_id(book_id)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("Book '{book_id}' not found")))?;

        let progress = self
            .progress_repo
            .upsert_progress(
                book_id,
                dto.current_chapter_index,
                dto.current_cfi.as_deref(),
                dto.progress_percentage,
            )
            .await?;

        Ok(ProgressResponseDto {
            book_id: progress.book_id,
            current_chapter_index: progress.current_chapter_index,
            current_cfi: progress.current_cfi,
            progress_percentage: progress.progress_percentage,
            last_read_at: progress.last_read_at,
        })
    }

    fn sanitize_chapter_html(html: &str) -> String {
        // Extract <body> content if present
        let body_content = if let Some(start_idx) = html.find("<body") {
            if let Some(open_tag_end) = html[start_idx..].find('>') {
                let actual_start = start_idx + open_tag_end + 1;
                if let Some(end_idx) = html.rfind("</body>") {
                    &html[actual_start..end_idx]
                } else {
                    &html[actual_start..]
                }
            } else {
                html
            }
        } else {
            html
        };

        // Strip dangerous <script> tags
        let mut clean = body_content.to_string();
        while let Some(start) = clean.find("<script") {
            if let Some(end) = clean[start..].find("</script>") {
                clean.replace_range(start..start + end + 9, "");
            } else {
                clean.replace_range(start.., "");
                break;
            }
        }

        clean
    }
}

