# EPUB Reader - Feature Specification

## 1. Product Vision
Calibre is the gold standard for desktop ebook management, but its interface is heavily bloated, utilitarian, and visually outdated (reminiscent of desktop software from the early 2000s). For modern readers who just want a warm, delightful, distraction-free reading experience, Calibre's 40+ button toolbars and complex configuration dialogs create friction.

This web application provides a **clean, minimalist, modern EPUB reader and library manager**, powered by a high-performance **Rust backend** (Axum), a **PostgreSQL database**, and a **React frontend**, featuring an effortless **1-click word translation & AI contextual definition** system.

---

## 2. Core Functional Modules (MVP)

### Module 1: Personal Library Management
- **EPUB Ingestion**:
  - File picker or drag-and-drop `.epub` upload via web interface.
  - Rust backend unpacks and validates EPUB container structures (`META-INF/container.xml`, `.opf` package file).
- **Metadata & Cover Extraction**:
  - Automatically extracts title, author, language, description, and chapter counts.
  - Extracts and serves cover images via backend static or storage endpoints.
  - Generates an elegant fallback cover with warm tones if no cover is embedded.
- **Library Views**:
  - **Grid View**: Visual book shelf cards showing cover art, title, author, and reading progress percentage bar.
  - **List View**: Clean, compact table for fast scanning and sorting by title, author, or recent reading activity.
- **Reading Progress Tracking**:
  - Automatically syncs reading position (chapter index / CFI bookmark) to PostgreSQL.
  - Tracks reading percentage and last opened timestamp.

---

### Module 2: Modern Reader Engine
- **Reading Modes**:
  - Paginated reading mode (comfortable left/right page turning like an e-reader).
  - Continuous vertical scroll mode (ideal for fast scanning and long chapters).
- **Navigation Controls**:
  - Slide-out Table of Contents (TOC) drawer fetched from the backend.
  - Keyboard shortcuts:
    - `Arrow Right` / `Spacebar` / `L`: Next page
    - `Arrow Left` / `Shift+Spacebar` / `H`: Previous page
    - `T`: Toggle Table of Contents
    - `Esc`: Close drawers / popups / return to library
  - Progress scrubber bar at the bottom displaying current chapter and progress percentage.
- **Reading Customization**:
  - Adjustable font size (14px - 32px).
  - Line height spacing (1.4x, 1.6x, 1.8x, 2.0x).
  - Text alignment (Justified or Left-aligned).
  - Margin width controls (Narrow, Medium, Wide).

---

### Module 3: 1-Click Translation & AI Contextual Definition (Pluggable Engine)
- **User Interaction**:
  - Clicking/tapping on any word (or highlighting a short phrase) immediately opens a warm floating popover card.
- **Contextual Sentence Extraction**:
  - Captures the selected target word.
  - Automatically extracts the enclosing sentence (or surrounding context clause) from the text.
- **Pluggable AI & Translation Engine (Zero-Lock-in)**:
  - **Default Cloud Provider (Gemini API)**:
    - Uses your Gemini API key from backend configuration (`.env`).
    - Translates the word and explains what it means *specifically in the context of the sentence* (handling metaphors, archaic words, and tone).
  - **Scalable Local Model Support (Offline / Self-Hosted)**:
    - Built with the Rust Strategy Pattern (`AiProvider` trait).
    - Can switch instantly from Gemini to a local Hugging Face / Ollama model (e.g., `Qwen2.5-1.5B`, `SmolLM2`, `Llama-3.2`) by simply toggling `AI_PROVIDER=local` in the config. No code refactoring needed.
- **Database Caching & Starred Vocabulary**:
  - Definitions are automatically cached in PostgreSQL to eliminate duplicate API calls.
  - One-click "Star" button saves words to a personal vocabulary notebook in PostgreSQL.

---

## 3. RESTful API Endpoints (Controller Contracts)

All endpoints utilize typed **Data Transfer Objects (DTOs)** for both incoming requests and outgoing responses:

| HTTP Method | Route | Request DTO | Response DTO | Description |
|---|---|---|---|---|
| `POST` | `/api/books` | Multipart `.epub` file | `ApiResponse<BookResponseDto>` | Uploads and ingests an EPUB file |
| `GET` | `/api/books` | Query: `page`, `limit`, `sort` | `ApiResponse<Vec<BookResponseDto>>` | Lists books in library with reading progress |
| `GET` | `/api/books/:id` | Path: `id` | `ApiResponse<BookDetailDto>` | Gets full book metadata and chapter TOC |
| `GET` | `/api/books/:id/chapters/:index`| Path: `id`, `index` | `ApiResponse<ChapterResponseDto>` | Retrieves sanitized chapter content |
| `PUT` | `/api/books/:id/progress` | `UpdateProgressDto` | `ApiResponse<ProgressResponseDto>` | Updates reading position and percentage |
| `POST` | `/api/dictionary/translate` | `TranslateWordRequestDto` | `ApiResponse<TranslationResponseDto>` | Fast word translation |
| `POST` | `/api/dictionary/explain` | `AiExplainWordRequestDto` | `ApiResponse<WordExplanationResponseDto>`| Contextual explanation with cache |
| `POST` | `/api/vocabulary` | `SaveWordRequestDto` | `ApiResponse<VocabularyResponseDto>` | Stars/saves word to user vocabulary |
| `GET` | `/api/vocabulary` | Query: `book_id` (optional) | `ApiResponse<Vec<VocabularyResponseDto>>` | Retrieves saved vocabulary list |

---

## 4. Test Datasets in `books/`
The repository includes three production EPUB files under `books/` used for end-to-end verification:
- `books/Dune volume 1_ The Bulterian Jihad.epub` (2.76 MB - Complex sci-fi, embedded fonts, large chapter spine).
- `books/Everyone In My Family Has Killed Someone.epub` (962 KB - Modern mystery, multi-file chapter splits).
- `books/The Crime at Black Dudley.epub` (930 KB - Classic British detective mystery, rich literary prose).
