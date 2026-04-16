-- MySQL 8.4 Compatible: Generated columns for case-insensitive unique index
-- Requires clean data first (no existing dups) or DROP DUPLICATE rows first

-- 0. DROP columns if exist (separate statements for older MySQL)
ALTER TABLE lexora_books DROP COLUMN IF EXISTS title_lower;
ALTER TABLE lexora_books DROP COLUMN IF EXISTS author_lower;

-- DROP index if exists (separate)
ALTER TABLE lexora_books DROP INDEX IF EXISTS idx_lexora_title_author;

-- 1. Add generated columns (persistent, indexed)
ALTER TABLE lexora_books 
ADD COLUMN title_lower VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (LOWER(TRIM(LEFT(title,191)))) STORED,
ADD COLUMN author_lower VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (LOWER(TRIM(LEFT(COALESCE(author, ''),191)))) STORED;

-- 2. DROP index if exists
ALTER TABLE lexora_books DROP INDEX IF EXISTS idx_lexora_title_author;

-- 3. Add unique index on generated columns
ALTER TABLE lexora_books 
ADD UNIQUE INDEX idx_lexora_title_author (title_lower, author_lower);

-- 4. Verify
SHOW INDEX FROM lexora_books WHERE Key_name = 'idx_lexora_title_author';

-- 2. Add unique index on generated columns
ALTER TABLE lexora_books 
ADD UNIQUE INDEX idx_lexora_title_author (title_lower, author_lower);

-- 3. Verify
SHOW INDEX FROM lexora_books WHERE Key_name = 'idx_lexora_title_author';

-- Usage: INSERT will fail if title_lower+author_lower dup exists
-- SELECT works with LIKE % on original columns (sanitize helper exists)

