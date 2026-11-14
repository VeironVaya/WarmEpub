# EPUB Reader - REST API Contract Specification

## 1. Overview & Conventions

This document defines the formal REST API contract between the **React Frontend** and the **Rust (Axum) Backend**.

- **Base URL**: `http://localhost:8080/api`
- **Content Type**: `application/json` (except file uploads which use `multipart/form-data`)
- **Authentication**: Unauthenticated for local single-user MVP
- **Standard Response Envelope**:
  All API endpoints return data wrapped in a consistent generic JSON envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string; // ISO-8601
}
```

- **HTTP Status Codes**:
  - `200 OK`: Request succeeded.
  - `201 Created`: Resource successfully created (e.g., book imported).
  - `400 Bad Request`: Validation failure or malformed payload.
  - `404 Not Found`: Resource (book, chapter) does not exist.
  - `500 Internal Server Error`: Unexpected backend or database error.

---

## 2. API Endpoints

### 2.1 Book & Library Management

#### `POST /api/books`
Uploads and ingests a new `.epub` file. The backend decompresses the archive, extracts metadata and cover art, and persists record to PostgreSQL.

- **Request**: `multipart/form-data`
  - Field: `file` (Binary `.epub` file)
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "description": "A novel of the Jazz Age...",
    "language": "en",
    "cover_url": "/api/books/7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e/cover",
    "total_chapters": 9,
    "progress_percentage": 0.0,
    "created_at": "2026-11-14T06:30:00Z",
    "updated_at": "2026-11-14T06:30:00Z"
  },
  "error": null,
  "timestamp": "2026-11-14T06:30:01Z"
}
```

---

#### `GET /api/books`
Returns the library of imported books with their latest reading progress.

- **Query Parameters**:
  - `sort` (optional): `recent` (default), `title`, `author`
  - `filter` (optional): `all` (default), `reading`, `finished`
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "description": "A novel of the Jazz Age...",
      "cover_url": "/api/books/7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e/cover",
      "total_chapters": 9,
      "current_chapter_index": 2,
      "progress_percentage": 22.5,
      "last_read_at": "2026-11-14T07:15:00Z"
    }
  ],
  "error": null,
  "timestamp": "2026-11-14T07:15:01Z"
}
```

---

#### `GET /api/books/:id`
Retrieves detailed metadata for a specific book, including its Table of Contents (TOC).

- **Path Parameters**: `id` (UUID)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "description": "A novel of the Jazz Age...",
    "cover_url": "/api/books/7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e/cover",
    "current_chapter_index": 2,
    "current_cfi": "epubcfi(/6/14[chapter-2]!/4/2/10)",
    "progress_percentage": 22.5,
    "table_of_contents": [
      { "index": 0, "title": "Title Page", "href": "title.xhtml" },
      { "index": 1, "title": "Chapter I", "href": "ch01.xhtml" },
      { "index": 2, "title": "Chapter II", "href": "ch02.xhtml" }
    ]
  },
  "error": null,
  "timestamp": "2026-11-14T07:15:02Z"
}
```

---

#### `GET /api/books/:id/cover`
Streams the extracted cover image binary (JPEG/PNG) or redirects to a generated SVG fallback cover.

- **Response**: Binary image (`image/jpeg` or `image/png`)

---

#### `DELETE /api/books/:id`
Removes a book, its files, and reading progress from the database.

- **Response**: `200 OK`
```json
{
  "success": true,
  "data": { "message": "Book deleted successfully" },
  "error": null,
  "timestamp": "2026-11-14T07:15:03Z"
}
```

---

### 2.2 Reader & Content Serving

#### `GET /api/books/:id/chapters/:index`
Fetches sanitized chapter XHTML content ready for rendering in the reader canvas.

- **Path Parameters**:
  - `id` (UUID)
  - `index` (Integer, 0-indexed)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "book_id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
    "chapter_index": 2,
    "title": "Chapter II",
    "content_html": "<section class=\"chapter\"><h2>Chapter II</h2><p>About half way between West Egg and New York...</p></section>",
    "total_chapters": 9
  },
  "error": null,
  "timestamp": "2026-11-14T07:15:04Z"
}
```

---

#### `PUT /api/books/:id/progress`
Saves current reading location and progress percentage.

- **Path Parameters**: `id` (UUID)
- **Request Body** (`UpdateProgressDto`):
```json
{
  "current_chapter_index": 2,
  "current_cfi": "epubcfi(/6/14[chapter-2]!/4/2/18)",
  "progress_percentage": 24.0
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "book_id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
    "progress_percentage": 24.0,
    "last_read_at": "2026-11-14T07:16:00Z"
  },
  "error": null,
  "timestamp": "2026-11-14T07:16:01Z"
}
```

---

### 2.3 Dictionary & AI Word Translation

#### `POST /api/dictionary/translate`
Instant, zero-friction direct word translation.

- **Request Body** (`TranslateWordRequestDto`):
```json
{
  "word": "ephemeral",
  "target_language": "id"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "word": "ephemeral",
    "phonetic": "/ɪˈfɛm.ər.əl/",
    "target_language": "id",
    "translation": "fana / berlangsung singkat"
  },
  "error": null,
  "timestamp": "2026-11-14T07:16:02Z"
}
```

---

#### `POST /api/dictionary/explain`
Fetches a contextual literary definition powered by Gemini AI, with automatic PostgreSQL caching.

- **Request Body** (`AiExplainWordRequestDto`):
```json
{
  "word": "ephemeral",
  "sentence_context": "The rose blossoms possessed an ephemeral beauty that faded by evening.",
  "target_language": "id"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": {
    "word": "ephemeral",
    "phonetic": "/ɪˈfɛm.ər.əl/",
    "direct_translation": "fana / berlangsung singkat",
    "contextual_explanation": "Dalam kalimat ini, kata 'ephemeral' menggambarkan bunga mawar yang keindahannya hanya bertahan sangat singkat (sehari saja) sebelum layu.",
    "is_cached": false
  },
  "error": null,
  "timestamp": "2026-11-14T07:16:05Z"
}
```

---

### 2.4 User Vocabulary (Starred Words)

#### `POST /api/vocabulary`
Stars and saves a word, sentence context, translation, and AI explanation to user's personal list.

- **Request Body** (`SaveVocabularyRequestDto`):
```json
{
  "book_id": "7f8b3c2a-9e1d-4b5c-8a3e-2f1d0b9a8c7e",
  "word": "ephemeral",
  "sentence_context": "The rose blossoms possessed an ephemeral beauty that faded by evening.",
  "translation": "fana / berlangsung singkat",
  "ai_explanation": "Dalam kalimat ini, kata 'ephemeral' menggambarkan bunga mawar yang keindahannya hanya bertahan sangat singkat..."
}
```
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "word": "ephemeral",
    "saved_at": "2026-11-14T07:17:00Z"
  },
  "error": null,
  "timestamp": "2026-11-14T07:17:01Z"
}
```

#### `GET /api/vocabulary`
Retrieves all starred words for vocabulary review.

- **Query Parameters**: `book_id` (optional)
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "book_title": "The Great Gatsby",
      "word": "ephemeral",
      "sentence_context": "The rose blossoms possessed an ephemeral beauty that faded by evening.",
      "translation": "fana / berlangsung singkat",
      "ai_explanation": "Dalam kalimat ini...",
      "saved_at": "2026-11-14T07:17:00Z"
    }
  ],
  "error": null,
  "timestamp": "2026-11-14T07:17:02Z"
}
```

