-- Modern Warm EPUB Reader - Initial Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Books Table
CREATE TABLE IF NOT EXISTS books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL DEFAULT 'Unknown Author',
    description TEXT,
    language VARCHAR(10) DEFAULT 'en',
    file_path VARCHAR(500) NOT NULL,
    cover_image_path VARCHAR(500),
    total_chapters INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Reading Progress Table
CREATE TABLE IF NOT EXISTS reading_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    current_chapter_index INT NOT NULL DEFAULT 0,
    current_cfi VARCHAR(255),
    progress_percentage REAL NOT NULL DEFAULT 0.0,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_book_progress UNIQUE (book_id)
);

-- 3. Word Definition & AI Context Cache Table
CREATE TABLE IF NOT EXISTS word_definition_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word VARCHAR(100) NOT NULL,
    context_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of (word + sentence + target_lang)
    target_language VARCHAR(10) NOT NULL,
    direct_translation TEXT NOT NULL,
    ai_context_explanation TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'gemini',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_word_context_lang UNIQUE (word, context_hash, target_language)
);

-- 4. User Starred Vocabulary Table
CREATE TABLE IF NOT EXISTS user_vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    word VARCHAR(100) NOT NULL,
    sentence_context TEXT NOT NULL,
    translation TEXT NOT NULL,
    ai_explanation TEXT NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cache_lookup ON word_definition_cache(word, context_hash, target_language);
CREATE INDEX IF NOT EXISTS idx_vocabulary_saved_at ON user_vocabulary(saved_at DESC);

