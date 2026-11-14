# 📖 WarmEpub — Modern AI-Augmented EPUB Reader & Library

[![Rust](https://img.shields.io/badge/Rust-1.80%2B-orange?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A distraction-free, aesthetically comforting web-based EPUB reader and personal library inspired by the utility of Calibre, redesigned with warm paper editorial aesthetics, physical 2-page book spread simulation, and an effortless **1-click word & sentence AI contextual explanation** engine.

---

## 🚀 Download & Run (No Install / No Docker Required)

Download the single portable `.exe` from our latest release:
👉 **[Download WarmEpub-Portable.exe (Windows)](https://github.com/VeironVaya/readme/releases/latest/download/WarmEpub-Portable.exe)**

Just double-click to run! No Node.js, Docker, or database setup needed.

---

## ⚡ Executive Summary

**WarmEpub** bridges the gap between traditional offline ebook cataloging and modern editorial web design. It offers readers a peaceful sanctuary for deep reading, paired with instant AI nuance translation that never disrupts your reading immersion.

### Key Highlights
- **100% Core Functionality Out-of-the-Box**: Reading, EPUB uploading, progress synchronization, bookmarks, and full library management require **zero third-party API keys**.
- **Physical 2-Page Book Spread Mode**: Realistic side-by-side reading layout with spine shadow, symmetrical columns, and zero horizontal drift.
- **Continuous Vertical Scroll Mode**: Seamless vertical reading mode for long reading sessions with sticky chapter indicators.
- **Universal Dark Mode**: Effortless toggle between warm oat/parchment light theme and midnight dark theme across the entire application (dashboard, reader, vocabulary list, and modals).
- **1-Click AI Translation & Nuance**: Click any word or highlight an entire sentence to see instant dictionary translations, phonetic guides, and deep contextual nuances.
- **Pluggable AI Backend**: Use Google Gemini API for cloud speed, or switch to local offline Ollama models for 100% privacy and zero cost.
- **Personal Vocabulary Notebook**: Star unfamiliar words and review them with audio pronunciation and the original sentences in which they appeared.
- **Zero Host Prerequisites**: Runs the entire stack with a single Docker command, OR launch as a **standalone Windows Desktop App (`.exe`)** with zero Docker needed!

---

## 🖥️ Standalone Windows Desktop App (.exe — Zero Docker Required!)

If you prefer reading your books directly on Windows without starting Docker or running background terminal servers:

1. **Instant Download & Run**:
   - Download **[WarmEpub-Portable.exe](https://github.com/VeironVaya/readme/releases/latest/download/WarmEpub-Portable.exe)** and double-click to launch.
   - The native desktop app opens instantly with embedded SQLite storage (`%APPDATA%\WarmEpub\warmepub.db`), 2-page book mode, dark mode, and offline reading.
2. **Building the Executable Yourself**:
   ```bash
   cd desktop
   npm install
   npm run build:win
   ```
   The self-contained executable is built directly into `desktop/dist-package/WarmEpub-Portable.exe`.

---

## 🚀 Web & Docker Quick Start (Single Command)

The entire application runs through Docker Compose with zero manual database or language toolchain setup:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/warm-epub-reader.git
cd warm-epub-reader
```

### 2. Configure Environment
Copy the example environment configuration:
```bash
cp .env.example .env
```
*(Optional: Open `.env` and add your `GEMINI_API_KEY` for AI features, or leave it blank to run in pure offline mode).*

### 3. Launch the Stack
```bash
docker compose up --build
```

That's it! Open your browser:
- 📱 **Frontend Web App**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend REST API**: [http://localhost:8080/api](http://localhost:8080/api)
- 🗄️ **PostgreSQL Database**: `localhost:5432`

---

## 🤖 AI Translation & Definition Engine Setup

WarmEpub is built with a pluggable AI engine (`AiProvider` trait). You can choose between **Cloud AI**, **Local Offline AI**, or **Pure Core Mode**:

| Feature                        |   Core Mode (No Key)   | Google Gemini (Cloud) | Ollama (Local & Free) |
| :----------------------------- | :--------------------: | :-------------------: | :-------------------: |
| **Reading & Library**          |         ✅ Full         |        ✅ Full         |        ✅ Full         |
| **2-Page Book Mode**           |         ✅ Full         |        ✅ Full         |        ✅ Full         |
| **Universal Dark Mode**        |         ✅ Full         |        ✅ Full         |        ✅ Full         |
| **Book Uploads & Progress**    |         ✅ Full         |        ✅ Full         |        ✅ Full         |
| **Word / Sentence Definition** | ⚠️ Fallback Placeholder |  ✅ Instant AI Nuance  |  ✅ Offline Local AI   |
| **Internet Required**          |          ❌ No          |         ✅ Yes         |         ❌ No          |
| **Cost**                       |          Free          |  Free Tier Available  |  Free & Open-Source   |

### Option A: Google Gemini API (Recommended for Speed & Accuracy)
1. Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In your `.env` file, configure:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your_actual_api_key_here
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
3. Restart or start the stack: `docker compose up -d`

### Option B: Local Offline LLM via Ollama (100% Private & Free)
1. Install [Ollama](https://ollama.com/) on your host machine.
2. Pull a compact, high-efficiency model (e.g., Qwen 2.5 or Llama 3.2):
   ```bash
   ollama run qwen2.5:1.5b
   ```
3. In your `.env` file, configure:
   ```env
   AI_PROVIDER=local
   LOCAL_MODEL_URL=http://host.docker.internal:11434/api/generate
   LOCAL_MODEL_NAME=qwen2.5:1.5b
   ```
4. Start the stack: `docker compose up -d`

### Option C: Pure Core Mode (No AI Setup Needed)
If you just want a distraction-free, beautiful EPUB reader, leave `GEMINI_API_KEY` blank or unset. The app will automatically provide graceful contextual placeholders without errors or crashes.

---

## 🛠️ Local Development (Without Docker)

If you prefer developing directly on your host machine:

### Prerequisites
- **Rust**: `1.80+` (`cargo`, `rustc`)
- **Node.js**: `20+` (`npm`)
- **PostgreSQL**: `16+` running on `localhost:5432`

### 1. Database Setup
Create the PostgreSQL database and user matching `.env`:
```sql
CREATE USER epub_user WITH PASSWORD 'epub_secret';
CREATE DATABASE epub_db OWNER epub_user;
```

### 2. Run the Rust Backend
```bash
cd backend
cargo run
```
*Migrations apply automatically upon startup.*

### 3. Run the React Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🏛️ System Architecture

WarmEpub is structured as an enterprise **N-Tier Layered Architecture**:

```
┌────────────────────────────────────────────────────────┐
│               React 18 Frontend (Vite)                 │
│    (LibraryView, ReaderView, VocabularyList, Modals)   │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (HTTP)
┌───────────────────────────▼────────────────────────────┐
│                  Rust Axum Web Server                  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Controllers (HTTP Parsing, Validation, Routing)  │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │ Services (EPUB Parser, Reader, Dictionary Engine)│  │
│  └──────────┬─────────────────────────────┬─────────┘  │
│             │                             │            │
│  ┌──────────▼──────────┐       ┌──────────▼─────────┐  │
│  │ Repositories (SQLx) │       │ AiProvider Trait   │  │
│  └──────────┬──────────┘       └──────────┬─────────┘  │
└─────────────┼─────────────────────────────┼────────────┘
              │                             │
    ┌─────────▼────────┐          ┌─────────▼─────────┐
    │  PostgreSQL 16   │          │ Gemini / Ollama   │
    │ (Books, Progress,│          │ (Context Nuance & │
    │  Vocab, Caches)  │          │   Translations)   │
    └──────────────────┘          └───────────────────┘
```

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── migrations/            # SQLx database schema migrations
│   ├── src/
│   │   ├── config.rs          # Environment configuration loader
│   │   ├── controllers/       # HTTP request handlers (Books, Reader, Dict, Vocab)
│   │   ├── dtos/              # Request / Response Data Transfer Objects
│   │   ├── models/            # Domain models
│   │   ├── repositories/      # Database abstraction layers (PostgreSQL)
│   │   ├── services/          # Core business logic & AI provider implementations
│   │   └── main.rs            # Axum server entry point & migration runner
│   ├── Cargo.toml             # Rust dependencies
│   └── Dockerfile             # Multi-stage optimized Rust container build
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Shared components (Navbar, Theme Toggle)
│   │   │   ├── Library/       # LibraryView, BookCard, UploadModal
│   │   │   ├── Reader/        # ReaderView, WordCardModal, SettingsModal, TOC
│   │   │   └── Vocabulary/    # VocabularyList
│   │   ├── services/          # Typed API client
│   │   ├── types/             # TypeScript API definitions
│   │   └── App.tsx            # Root component with global theme state
│   ├── tailwind.config.js     # Editorial design system tokens & class dark mode
│   └── vite.config.ts         # Vite configuration with Docker polling watcher
├── docs/                      # Architectural & design documentation suite
├── docker-compose.yml         # Multi-container orchestration (DB, API, Web)
├── .env.example               # Sanitized template environment configuration
├── .gitignore                 # Secure exclusion rules
└── README.md                  # Project documentation
```

---

## 📚 Documentation Suite

For in-depth technical details, consult the documentation suite in [`/docs`](docs/):
- [App Executive Summary & Principles](docs/app_executive_summary.md)
- [System Architecture & Data Flows](docs/system_architecture.md)
- [REST API Contract & Schemas](docs/api_contract.md)
- [Feature Specifications](docs/features.md)
- [Editorial Design System & Color Tokens](docs/ui_design_system.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
