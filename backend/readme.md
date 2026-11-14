# EPUB Reader - Rust Backend

High-performance, memory-safe backend engine for the Modern Warm EPUB Reader, built with **Rust (Axum)** and **PostgreSQL**.

---

## 1. Architectural Pattern: Layered Architecture (N-Tier)

The backend strictly follows a layered architecture to maintain clear separation of concerns, testability, and enterprise maintainability:

$$\text{React Frontend} \overset{\text{HTTP / DTOs}}{\longleftrightarrow} \text{Controller} \overset{\text{DTOs}}{\longleftrightarrow} \text{Service} \overset{\text{Entities / Models}}{\longleftrightarrow} \text{Repository} \overset{\text{SQL}}{\longleftrightarrow} \text{PostgreSQL}$$

### 1.1 Layer Breakdown
1. **Controllers (`src/controllers/`)**:
   - Handles incoming HTTP requests via Axum routes.
   - Extracts and validates typed **Request DTOs** from request bodies, query strings, and path params.
   - Delegates business operations to the appropriate service.
   - Serializes service outcomes into **Response DTOs** wrapped in a standard `ApiResponse<T>`.
2. **DTOs (`src/dtos/`)**:
   - Explicit data transfer structs annotated with `serde::{Serialize, Deserialize}`.
   - Completely decouples internal database representation from the external public API contracts.
3. **Services (`src/services/`)**:
   - Implements application business logic.
   - Coordinates EPUB decompression (ZIP) and metadata/chapter XML parsing (`quick-xml`).
   - Dispatches word lookups to the **Pluggable AI Engine** and manages the PostgreSQL caching layer.
4. **Pluggable AI Engine (`src/services/ai/`)**:
   - Implements the Strategy Pattern via the `AiProvider` trait.
   - Supported providers:
     - `GeminiProvider`: Connects to Google Gemini API using `GEMINI_API_KEY`.
     - `LocalModelProvider`: Connects to local runners (e.g. Ollama, llama.cpp, or local Hugging Face endpoints at `LOCAL_MODEL_URL`).
   - Changing providers requires only updating `AI_PROVIDER` in `.env`.
5. **Repositories (`src/repositories/`)**:
   - Manages all persistence and data retrieval against PostgreSQL using `sqlx::PgPool`.
   - Defined via Rust `traits` to ensure loose coupling and testability.
6. **Models (`src/models/`)**:
   - Database entities directly mapped to PostgreSQL rows with `sqlx::FromRow`.

---

## 2. Directory Layout

```
backend/
├── Dockerfile                         # Multi-stage Rust build container
├── Cargo.toml                         # Crate manifest & dependencies
├── migrations/                        # SQLx database schema migrations
│   └── 20261114000001_initial_schema.sql
└── src/
    ├── main.rs                        # Application entrypoint & Axum router
    ├── config.rs                      # Environment configuration & provider factory
    ├── error.rs                       # Centralized AppError & HTTP response mapping
    ├── dtos/                          # Data Transfer Objects
    │   ├── mod.rs
    │   ├── api_response.rs            # Generic ApiResponse<T> envelope
    │   ├── book_dto.rs                # Book upload & retrieval DTOs
    │   ├── reader_dto.rs              # Chapter content & progress DTOs
    │   ├── dictionary_dto.rs          # Translation & AI definition DTOs
    │   └── vocabulary_dto.rs          # Saved vocabulary DTOs
    ├── models/                        # PostgreSQL Entity Models
    │   ├── mod.rs
    │   ├── book.rs
    │   ├── progress.rs
    │   ├── word_cache.rs
    │   └── vocabulary.rs
    ├── controllers/                   # Axum HTTP Request Handlers
    │   ├── mod.rs
    │   ├── book_controller.rs
    │   ├── reader_controller.rs
    │   ├── dictionary_controller.rs
    │   └── vocabulary_controller.rs
    ├── services/                      # Core Business Logic
    │   ├── mod.rs
    │   ├── book_service.rs            # EPUB ingestion & metadata extraction
    │   ├── reader_service.rs          # Chapter retrieval & progress updates
    │   ├── epub_parser.rs             # ZIP & XML parser utility
    │   ├── dictionary_service.rs      # High-level translation & cache orchestrator
    │   └── ai/                        # Pluggable AI Provider Subsystem
    │       ├── mod.rs                 # AiProvider trait & factory
    │       ├── gemini_provider.rs     # Gemini API implementation
    │       └── local_provider.rs      # Local GGUF / Ollama implementation
    └── repositories/                  # PostgreSQL Data Access Layer
        ├── mod.rs
        ├── book_repository.rs
        ├── progress_repository.rs
        ├── word_cache_repository.rs
        └── vocabulary_repository.rs
```

---

## 3. Running with Docker (Recommended)

The backend is fully containerized. You do not need to install Rust or Cargo on your host system:

```powershell
# From the project root, launch everything:
docker compose up --build
```

The backend container will automatically:
1. Wait for PostgreSQL to become healthy.
2. Run database migrations.
3. Start the Axum HTTP server on port `8080`.

---

## 4. Configuration & Environment Variables

Environment variables are passed via the root `.env` file or `backend/.env`:

### 4.1 Default Mode: Google Gemini API
```env
PORT=8080
DATABASE_URL=postgres://epub_user:epub_secret@db:5432/epub_db
CORS_ORIGIN=http://localhost:5173
STORAGE_DIR=/app/storage

# AI Provider Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 4.2 Offline / Self-Hosted Mode: Local Model (Hugging Face / Ollama)
```env
AI_PROVIDER=local
LOCAL_MODEL_URL=http://host.docker.internal:11434/api/generate
LOCAL_MODEL_NAME=qwen2.5:1.5b
```

---

## 5. Testing with Sample Books

Real sample EPUB books are available in `../books/` for integration tests and reading verification:
- `books/Dune volume 1_ The Bulterian Jihad.epub` (Sci-Fi, world-building vocabulary, embedded fonts)
- `books/Everyone In My Family Has Killed Someone.epub` (Modern mystery fiction, split chapter files)
- `books/The Crime at Black Dudley.epub` (Classic British detective mystery, rich literary nuances)

```powershell
# Run tests inside the backend container:
docker compose run --rm backend cargo test
```
