-- MySQL 8.4.7 Compatible Books Schema Migration (FIXED)
-- Option 1: phpMyAdmin → SQL tab → paste ALL below → Go
-- Option 2: mysql -u root -p lexora < migrate-books-schema.sql
-- Database: lexora

USE lexora;

-- 1. Check existing columns first (safe preview)
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'lexora' AND TABLE_NAME = 'books' 
ORDER BY ORDINAL_POSITION;

-- 2. Add missing columns (run these ONE BY ONE if errors, or all)
ALTER TABLE books ADD COLUMN subtitle VARCHAR(255) NULL;
ALTER TABLE books ADD COLUMN authors TEXT NULL;
ALTER TABLE books ADD COLUMN edition VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN date INT NULL;
ALTER TABLE books ADD COLUMN accessionNumber VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN issn VARCHAR(20) NULL;
ALTER TABLE books ADD COLUMN lccn VARCHAR(20) NULL;
ALTER TABLE books ADD COLUMN callNumber VARCHAR(100) NULL;
ALTER TABLE books ADD COLUMN materialType VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN subtype VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN extent VARCHAR(100) NULL;
ALTER TABLE books ADD COLUMN size VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN volume VARCHAR(20) NULL;
ALTER TABLE books ADD COLUMN authorName VARCHAR(255) NULL;
ALTER TABLE books ADD COLUMN authorDates VARCHAR(50) NULL;
ALTER TABLE books ADD COLUMN place VARCHAR(255) NULL;
ALTER TABLE books ADD COLUMN otherDetails TEXT NULL;

-- 3. Indexes (ignore if exists)
CREATE INDEX IF NOT EXISTS idx_accession ON books(accessionNumber);
CREATE INDEX IF NOT EXISTS idx_authors ON books(authors);
CREATE INDEX IF NOT EXISTS idx_callNumber ON books(callNumber);

-- 4. Verify complete schema
DESCRIBE books;

-- Count new columns added
SELECT 'Migration should show ~28 columns above' AS status;


