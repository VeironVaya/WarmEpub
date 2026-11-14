# Modern Warm EPUB Reader - Executive Summary

## 1. Executive Overview
The **Modern Warm EPUB Reader** is a high-performance web application designed to overcome the primary shortcomings of legacy ebook management software like Calibre: utilitarian bloat, intimidating visual clutter, and disconnected reading workflows. 

Engineered with a **Rust backend**, **PostgreSQL database**, and a **React frontend**, the platform delivers an instant, distraction-free reading environment styled with a warm, comforting aesthetic and a pluggable **1-click word translation and AI contextual definition** engine.

The entire application runs seamlessly with **a single command using Docker Compose**:
```bash
docker compose up --build
```
No host-level Rust or database installation is required.

---

## 2. Core Value Proposition

| Pain Point in Legacy E-Readers (e.g. Calibre) | Solution in Our Modern Platform |
|---|---|
| **Outdated & Overwhelming Interface**: 40+ cluttered toolbar buttons, dense 2000s desktop menus. | **Minimalist & Warm UI**: Clean, intentional interface using warm paper tones (`#F5EFEB`, `#FAF7F2`) and neo-grotesque typography. |
| **Friction in Looking Up Foreign Words**: Requires copying text, opening a new tab, or reading through dense dictionary jargon. | **1-Click AI Translation & Meaning**: Instant popup card offering direct translation plus an AI contextual explanation tailored to the exact book sentence. |
| **Complex Environment & Setup Overhead**: Python dependency conflicts, native build issues on Windows. | **Single-Command Docker Orchestration**: Full-stack containerization (PostgreSQL + Rust Axum + React Vite) with zero host toolchain prerequisites. |
| **Vendor Lock-in or Fragile AI Setup**: Tied to one specific model or requiring complex local setups. | **Pluggable AI Architecture (`AiProvider` trait)**: Runs against Gemini API via a simple API key, while fully architected to swap to local Hugging Face / Ollama models with a single config change. |

---

## 3. Product Principles
1. **Comfort First**: Reading sessions should be gentle on the eyes; the color palette and typography emulate tactile, warm book pages.
2. **Layered Architectural Discipline**: Strict separation of concerns on the backend (Controller → Service → Repository → PostgreSQL Database) utilizing explicit Data Transfer Objects (DTOs).
3. **One Command to Run (`docker compose up`)**: Developer and user friction is eliminated; container networking and database migrations occur automatically on boot.
4. **Pluggable AI Scalability**: Zero lock-in. Switch between Cloud AI (Gemini Pro/Flash API) and local offline inference (Ollama / GGUF) via configuration without code refactoring.
5. **Effortless Comprehension**: Reading literature in a second language shouldn't feel like studying; word lookups should be instantaneous, non-disruptive, and context-aware.

---

## 4. Technology & Container Topology at a Glance

```
                ┌─────────────────────────────────────────────────────────┐
                │                  Host Browser (User)                    │
                └────────────┬───────────────────────────────▲────────────┘
                             │                               │
                      Port 5173                       Port 8080 (API)
                             ▼                               │
┌────────────────────────────┴───────────────────────────────┴────────────┐
│                    Docker Compose Network (epub_network)                │
│                                                                         │
│   ┌─────────────────────┐   Proxy /api   ┌──────────────────────────┐   │
│   │   frontend (React)  │ ─────────────► │   backend (Rust Axum)    │   │
│   │   Vite Dev / Nginx  │                │   Controller-Service-Repo│   │
│   └─────────────────────┘                └─────────────┬────────────┘   │
│                                                        │ SQLx Pool      │
│                                                        ▼                │
│                                          ┌──────────────────────────┐   │
│                                          │      db (PostgreSQL)     │   │
│                                          │      Port 5432 (Internal)│   │
│                                          └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Container**: Node 22 / Vite with hot reload mapped to port `5173`.
- **Backend Container**: Multi-stage Rust build with Axum on port `8080`.
- **Database Container**: PostgreSQL 16 Alpine with persistent volume.
- **AI Engine**: Pluggable `AiProvider` (Gemini API with API key by default; switchable to local GGUF/Ollama via `.env`).
