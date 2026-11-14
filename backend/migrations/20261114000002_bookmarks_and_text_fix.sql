-- Migration: Bookmarks and Text Fix
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    chapter_index INT NOT NULL,
    page_number INT NOT NULL DEFAULT 1,
    cfi VARCHAR(255),
    snippet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);

-- Expand word column in user_vocabulary to avoid length errors on phrases
ALTER TABLE user_vocabulary ALTER COLUMN word TYPE TEXT;

