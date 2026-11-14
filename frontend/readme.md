# EPUB Reader - React Frontend

The modern, warm-toned reading interface for the EPUB Reader, built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.

---

## 1. Design & Typographic Philosophy

The interface is engineered to eliminate the visual friction and cognitive overload typical of legacy tools like Calibre, replacing complex toolbars with a calm, tactile reading space:

- **Warm Editorial Color Palette**:
  - Background Canvas: `#F5EFEB` (Warm Oat / Parchment)
  - Card Surfaces: `#FAF7F2` / `#FFFFFF`
  - Primary Accent: `#D3746B` (Terracotta Coral)
  - Secondary Accent: `#4B8B9B` (Muted Ocean Teal)
  - Text: `#2D2825` (Soft Espresso Charcoal — high contrast without harsh glare)
- **Neo-Grotesque Sans-Serif Typography**:
  - Standardized font stack prioritizing neutral, modern clarity:
    `"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`
  - Optional editorial serif toggle for book text: `"Charter", "Merriweather", "Lora", serif`.

---

## 2. Directory Structure

```
frontend/
├── Dockerfile                         # Node 22 / Vite dev container
├── package.json                       # Dependencies & scripts
├── vite.config.ts                     # Vite build & proxy settings
├── tailwind.config.js                 # Warm color tokens & typography config
├── tsconfig.json                      # Strict TypeScript settings
└── src/
    ├── main.tsx                       # React DOM entrypoint
    ├── App.tsx                        # Root view router (Library vs Reader)
    ├── index.css                      # Global Tailwind directives & font imports
    ├── types/                         # TypeScript interfaces (matching Backend DTOs)
    │   ├── api.ts                     # ApiResponse<T> envelope
    │   ├── book.ts                    # BookResponseDto, BookDetailDto
    │   ├── reader.ts                  # ChapterResponseDto, UpdateProgressDto
    │   └── dictionary.ts              # TranslateWordDto, WordExplanationDto
    ├── services/
    │   └── api.ts                     # Axios HTTP client with typed API methods
    ├── components/
    │   ├── common/                    # Reusable UI primitives
    │   │   ├── Button.tsx
    │   │   ├── Modal.tsx
    │   │   ├── ProgressBar.tsx
    │   │   └── Toast.tsx
    │   ├── Library/                   # Personal Library View
    │   │   ├── LibraryView.tsx        # Main bookshelf grid & search
    │   │   ├── BookCard.tsx           # Individual book card with cover & progress
    │   │   └── UploadDropzone.tsx     # Drag-and-drop .epub upload zone
    │   ├── Reader/                    # Distraction-Free Reader Canvas
    │   │   ├── ReaderView.tsx         # Main reader viewport
    │   │   ├── ReaderHeader.tsx       # Auto-hiding navigation & settings bar
    │   │   ├── ReaderScrubber.tsx     # Bottom progress scrubber
    │   │   ├── TableOfContents.tsx    # Slide-out chapter drawer
    │   │   ├── WordCardModal.tsx      # Floating 1-click translation & AI card
    │   │   └── ReaderSettingsModal.tsx# Font size, line height, and theme settings
    │   └── Vocabulary/                # Starred Words Notebook
    │       └── VocabularyList.tsx     # Flashcard & list review
    └── hooks/
        ├── useBooks.ts                # Library data fetching & cache
        ├── useReader.ts               # Chapter pagination, TOC, and progress sync
        └── useWordLookup.ts           # 1-click selection & AI explanation state
```

---

## 3. Running with Docker (Recommended)

The frontend runs in a Docker container with live hot-reloading:

```powershell
# From the project root, launch everything:
docker compose up --build
```

The frontend will be accessible at `http://localhost:5173`.
Vite is configured to automatically proxy `/api` calls directly to the `backend` container at `http://backend:8080`.

---

## 4. Key Components & Interactions

### 4.1 1-Click Translation & AI Word Card (`WordCardModal.tsx`)
- When a user clicks or highlights any word in the reader text:
  1. The target word and surrounding sentence context are captured.
  2. A floating popover anchors immediately above/below the clicked word.
  3. Displays phonetic pronunciation, instant translation (`POST /api/dictionary/translate`), and Gemini contextual explanation (`POST /api/dictionary/explain`).
  4. Includes a Star button to save the word directly to user vocabulary.

### 4.2 Distraction-Free Reader Canvas (`ReaderView.tsx`)
- Centered reading column (max width: `720px`).
- Auto-hides top and bottom bars during active reading.
- Full keyboard support:
  - `Arrow Right` / `Space`: Next page
  - `Arrow Left` / `Shift+Space`: Previous page
  - `T`: Toggle Table of Contents
  - `Esc`: Close drawers or return to library
