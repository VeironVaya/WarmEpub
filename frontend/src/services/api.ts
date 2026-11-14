import axios from 'axios';
import {
  ApiResponse,
  BookResponseDto,
  BookDetailDto,
  ChapterResponseDto,
  UpdateProgressDto,
  ProgressResponseDto,
  TranslateWordRequestDto,
  TranslationResponseDto,
  AiExplainWordRequestDto,
  WordExplanationResponseDto,
  SaveVocabularyRequestDto,
  VocabularyResponseDto,
  BookmarkDto,
  CreateBookmarkRequestDto,
} from '../types/api';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Books
  async listBooks(): Promise<BookResponseDto[]> {
    const res = await apiClient.get<ApiResponse<BookResponseDto[]>>('/books');
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to list books');
    }
    return res.data.data;
  },

  async getBookDetail(id: string): Promise<BookDetailDto> {
    const res = await apiClient.get<ApiResponse<BookDetailDto>>(`/books/${id}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to get book details');
    }
    return res.data.data;
  },

  async uploadBook(file: File): Promise<BookResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<ApiResponse<BookResponseDto>>('/books', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to upload book');
    }
    return res.data.data;
  },

  async deleteBook(id: string): Promise<void> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(`/books/${id}`);
    if (!res.data.success) {
      throw new Error(res.data.error || 'Failed to delete book');
    }
  },

  // Reader & Progress
  async getChapter(bookId: string, index: number): Promise<ChapterResponseDto> {
    const res = await apiClient.get<ApiResponse<ChapterResponseDto>>(`/books/${bookId}/chapters/${index}`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to get chapter content');
    }
    return res.data.data;
  },

  async updateProgress(bookId: string, dto: UpdateProgressDto): Promise<ProgressResponseDto> {
    const res = await apiClient.put<ApiResponse<ProgressResponseDto>>(`/books/${bookId}/progress`, dto);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to update reading progress');
    }
    return res.data.data;
  },

  // Dictionary & AI Explanations
  async translateWord(dto: TranslateWordRequestDto): Promise<TranslationResponseDto> {
    const res = await apiClient.post<ApiResponse<TranslationResponseDto>>('/dictionary/translate', dto);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to translate word');
    }
    return res.data.data;
  },

  async explainWord(dto: AiExplainWordRequestDto): Promise<WordExplanationResponseDto> {
    const res = await apiClient.post<ApiResponse<WordExplanationResponseDto>>('/dictionary/explain', dto);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to get AI word explanation');
    }
    return res.data.data;
  },

  // Vocabulary
  async saveVocabulary(dto: SaveVocabularyRequestDto): Promise<VocabularyResponseDto> {
    const res = await apiClient.post<ApiResponse<VocabularyResponseDto>>('/vocabulary', dto);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to save vocabulary');
    }
    return res.data.data;
  },

  async listVocabulary(bookId?: string): Promise<VocabularyResponseDto[]> {
    const res = await apiClient.get<ApiResponse<VocabularyResponseDto[]>>('/vocabulary', {
      params: bookId ? { book_id: bookId } : undefined,
    });
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to list vocabulary');
    }
    return res.data.data;
  },

  // Bookmarks
  async getBookmarks(bookId: string): Promise<BookmarkDto[]> {
    const res = await apiClient.get<ApiResponse<BookmarkDto[]>>(`/books/${bookId}/bookmarks`);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to get bookmarks');
    }
    return res.data.data;
  },

  async createBookmark(bookId: string, dto: CreateBookmarkRequestDto): Promise<BookmarkDto> {
    const res = await apiClient.post<ApiResponse<BookmarkDto>>(`/books/${bookId}/bookmarks`, dto);
    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.error || 'Failed to create bookmark');
    }
    return res.data.data;
  },

  async deleteBookmark(bookId: string, bookmarkId: string): Promise<void> {
    const res = await apiClient.delete<ApiResponse<boolean>>(`/books/${bookId}/bookmarks/${bookmarkId}`);
    if (!res.data.success) {
      throw new Error(res.data.error || 'Failed to delete bookmark');
    }
  },
};

