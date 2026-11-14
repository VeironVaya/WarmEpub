-- Migration: Expand word column in word_definition_cache to allow sentences
ALTER TABLE word_definition_cache ALTER COLUMN word TYPE TEXT;

