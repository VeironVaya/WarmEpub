export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

export interface BookResponseDto {
  id: string;
  title: string;
  author: string;
  description: string | null;
  language: string;
  cover_url: string | null;
  total_chapters: number;
  current_chapter_index: number;
  progress_percentage: number;
  last_read_at: string | null;
  created_at: string;
}

export interface TocItemDto {
  index: number;
  title: string;
  href: string;
}

export interface BookDetailDto {
  id: string;
  title: string;
  author: string;
  description: string | null;
  language: string;
  cover_url: string | null;
  total_chapters: number;
  current_chapter_index: number;
  current_cfi: string | null;
  progress_percentage: number;
  table_of_contents: TocItemDto[];
  last_read_at: string | null;
  created_at: string;
}

export interface ChapterResponseDto {
  book_id: string;
  chapter_index: number;
  title: string;
  content_html: string;
  total_chapters: number;
}

export interface UpdateProgressDto {
  current_chapter_index: number;
  current_cfi?: string | null;
  progress_percentage: number;
}

export interface ProgressResponseDto {
  book_id: string;
  current_chapter_index: number;
  current_cfi: string | null;
  progress_percentage: number;
  last_read_at: string;
}

export interface TranslateWordRequestDto {
  word: string;
  target_language?: string;
}

export interface TranslationResponseDto {
  word: string;
  phonetic: string | null;
  target_language: string;
  translation: string;
}

export interface AiExplainWordRequestDto {
  word: string;
  sentence_context: string;
  target_language?: string;
}

export interface WordExplanationResponseDto {
  word: string;
  phonetic: string | null;
  direct_translation: string;
  contextual_explanation: string;
  example_usage: string | null;
  provider_used: string;
  is_cached: boolean;
}

export interface SaveVocabularyRequestDto {
  book_id?: string | null;
  word: string;
  sentence_context: string;
  translation: string;
  ai_explanation: string;
}

export interface VocabularyResponseDto {
  id: string;
  book_id: string | null;
  book_title: string | null;
  word: string;
  sentence_context: string;
  translation: string;
  ai_explanation: string;
  saved_at: string;
}

export interface BookmarkDto {
  id: string;
  book_id: string;
  chapter_index: number;
  page_number: number;
  cfi: string | null;
  snippet: string | null;
  created_at: string;
}

export interface CreateBookmarkRequestDto {
  chapter_index: number;
  page_number?: number;
  cfi?: string | null;
  snippet?: string | null;
}

