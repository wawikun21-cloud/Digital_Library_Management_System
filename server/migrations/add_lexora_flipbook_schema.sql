-- ============================================================
-- LEXORA BOOKS 3D FLIPBOOK FEATURE — DATABASE MIGRATION
-- Adds:
--   1. New columns to lexora_books
--   2. lexora_book_categories
--   3. lexora_book_category_relations
--   4. lexora_book_tags
--   5. lexora_book_tag_relations
--   6. lexora_book_pages (image-page books)
--   7. lexora_bookmarks
--   8. lexora_book_progress
--
-- SOURCE OF TRUTH: server/config/db.js applies the same schema (idempotently)
-- on every boot, tolerating already-applied columns. Keep this file in sync
-- with db.js — it exists for deploys that only run the migrations folder.
-- ============================================================

-- --------------------------------------------------------
-- 0. Reconciliation — columns added in db.js after this
--    file was written. Idempotent so the file stays re-runnable.
-- --------------------------------------------------------
ALTER TABLE lexora_books ADD COLUMN IF NOT EXISTS file_size BIGINT      DEFAULT NULL AFTER dimensions;
ALTER TABLE lexora_books ADD COLUMN IF NOT EXISTS edition  VARCHAR(50)  DEFAULT NULL AFTER weight_unit;

-- Reader copy/screenshot settings — creator-controlled per book.
-- Default 1 keeps the previous "always allowed" behaviour for
-- existing rows; consumed by GET /:id/reader and the flipbook UI.
ALTER TABLE lexora_books ADD COLUMN IF NOT EXISTS allow_text_copy TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE lexora_books ADD COLUMN IF NOT EXISTS allow_screenshot  TINYINT(1) NOT NULL DEFAULT 1;

-- --------------------------------------------------------
-- 1. EXTEND lexora_books
-- --------------------------------------------------------
ALTER TABLE lexora_books
  ADD COLUMN slug                VARCHAR(500)  DEFAULT NULL AFTER title,
  ADD COLUMN short_description   TEXT          DEFAULT NULL AFTER slug,
  ADD COLUMN source_type         ENUM('pdf','images') DEFAULT NULL AFTER resource_type,
  ADD COLUMN pdf_url             TEXT          DEFAULT NULL AFTER source,
  ADD COLUMN thumbnail_url       TEXT          DEFAULT NULL AFTER pdf_url,
  ADD COLUMN cover_url           TEXT          DEFAULT NULL AFTER thumbnail_url,
  ADD COLUMN download_url        TEXT          DEFAULT NULL AFTER cover_url,
  ADD COLUMN publish_on          DATE          DEFAULT NULL AFTER download_url,
  ADD COLUMN isbn10              VARCHAR(20)   DEFAULT NULL AFTER publish_on,
  ADD COLUMN isbn13              VARCHAR(20)   DEFAULT NULL AFTER isbn10,
  ADD COLUMN total_pages         INT           DEFAULT NULL AFTER isbn13,
  ADD COLUMN table_of_contents   JSON          DEFAULT NULL AFTER total_pages,
  ADD COLUMN length              VARCHAR(100)  DEFAULT NULL AFTER total_pages,
  ADD COLUMN dimensions          VARCHAR(50)   DEFAULT NULL AFTER total_pages,
  ADD COLUMN co_publisher        VARCHAR(255)  DEFAULT NULL AFTER dimensions,
  ADD COLUMN translator          VARCHAR(255)  DEFAULT NULL AFTER co_publisher,
  ADD COLUMN asin                VARCHAR(20)   DEFAULT NULL AFTER translator,
  ADD COLUMN doi                 VARCHAR(100)  DEFAULT NULL AFTER asin,
  ADD COLUMN llcn                VARCHAR(20)   DEFAULT NULL AFTER doi,
  ADD COLUMN weight_value        DECIMAL(6,2)  DEFAULT NULL AFTER llcn,
  ADD COLUMN weight_unit         VARCHAR(20)   DEFAULT NULL AFTER weight_value,
  ADD COLUMN status              ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' AFTER weight_unit,
  ADD COLUMN visibility          ENUM('public','private') NOT NULL DEFAULT 'public' AFTER status,
  ADD COLUMN created_by          INT           DEFAULT NULL AFTER visibility,
  ADD COLUMN published_at        DATETIME      DEFAULT NULL AFTER created_by;

-- Indexes for lexora_books
ALTER TABLE lexora_books
  ADD INDEX idx_lexora_slug       (slug),
  ADD INDEX idx_lexora_status     (status),
  ADD INDEX idx_lexora_visibility (visibility),
  ADD INDEX idx_lexora_source_type (source_type),
  ADD INDEX idx_lexora_published_at (published_at);

-- --------------------------------------------------------
-- 2. lexora_book_categories
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_categories (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(150)  NOT NULL,
  slug        VARCHAR(150)  NOT NULL,
  created_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_category_slug (slug),
  UNIQUE KEY uq_lexora_category_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. lexora_book_category_relations
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_category_relations (
  id          INT   NOT NULL AUTO_INCREMENT,
  book_id     INT   NOT NULL,
  category_id INT   NOT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_book_category (book_id, category_id),
  KEY idx_lexora_cat_book    (book_id),
  KEY idx_lexora_cat_category (category_id),
  CONSTRAINT fk_lexora_cat_book
    FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE,
  CONSTRAINT fk_lexora_cat_category
    FOREIGN KEY (category_id) REFERENCES lexora_book_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. lexora_book_tags
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_tags (
  id         INT          NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  slug       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_tag_slug (slug),
  UNIQUE KEY uq_lexora_tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. lexora_book_tag_relations
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_tag_relations (
  id          INT NOT NULL AUTO_INCREMENT,
  book_id     INT NOT NULL,
  tag_id      INT NOT NULL,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_book_tag (book_id, tag_id),
  KEY idx_lexora_tag_book  (book_id),
  KEY idx_lexora_tag_tag   (tag_id),
  CONSTRAINT fk_lexora_tag_book
    FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE,
  CONSTRAINT fk_lexora_tag_tag
    FOREIGN KEY (tag_id) REFERENCES lexora_book_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5b. lexora_book_resource_types
-- Managed vocabulary for the single-valued lexora_books.resource_type
-- column (badge on the book card). No relation table: the book stores
-- the type's name. Seeded once, only while the table is empty.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_resource_types (
  id          INT           NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)  NOT NULL,
  slug        VARCHAR(100)  NOT NULL,
  created_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_resource_type_slug (slug),
  UNIQUE KEY uq_lexora_resource_type_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Widen the existing 50-char column so longer managed names are not truncated.
ALTER TABLE lexora_books MODIFY COLUMN resource_type VARCHAR(100) DEFAULT NULL;

INSERT IGNORE INTO lexora_book_resource_types (name, slug)
SELECT * FROM (
  SELECT 'Open Source' AS name, 'open-source' AS slug
  UNION ALL SELECT 'Premium', 'premium'
) AS defaults
WHERE NOT EXISTS (SELECT 1 FROM lexora_book_resource_types);

-- --------------------------------------------------------
-- 6. lexora_book_pages  (image-page books)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_pages (
  id          INT           NOT NULL AUTO_INCREMENT,
  book_id     INT           NOT NULL,
  page_number INT           NOT NULL,
  image_url   VARCHAR(500)  NOT NULL,
  file_size   BIGINT        DEFAULT NULL,
  created_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_book_page (book_id, page_number),
  KEY idx_lexora_pages_book (book_id),
  -- Media access checks "(book_id, image_url)" once per image served, so this
  -- pair must be an index hit rather than a scan of the book's pages.
  KEY idx_lexora_pages_book_url (book_id, image_url),
  CONSTRAINT fk_lexora_pages_book
    FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 7. lexora_bookmarks
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_bookmarks (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  book_id     INT           NOT NULL,
  page_number INT           NOT NULL,
  created_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_bookmark (user_id, book_id, page_number),
  KEY idx_lexora_bookmark_user  (user_id),
  KEY idx_lexora_bookmark_book  (book_id),
  CONSTRAINT fk_lexora_bookmark_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lexora_bookmark_book
    FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 8. lexora_book_progress
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS lexora_book_progress (
  id          INT       NOT NULL AUTO_INCREMENT,
  user_id     INT       NOT NULL,
  book_id     INT       NOT NULL,
  page_number INT       NOT NULL,
  updated_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lexora_progress (user_id, book_id),
  KEY idx_lexora_progress_user (user_id),
  KEY idx_lexora_progress_book (book_id),
  CONSTRAINT fk_lexora_progress_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lexora_progress_book
    FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 9. Extend trash_log to include lexora_book
-- (Already present in schema — just verify it includes lexora_book)
-- --------------------------------------------------------
-- The existing trash_log enum already supports 'lexora_book'.
-- No change needed unless the enum was created without it.

-- --------------------------------------------------------
-- VERIFICATION
-- --------------------------------------------------------
-- Run these to verify:
-- SHOW COLUMNS FROM lexora_books;
-- SHOW TABLES LIKE 'lexora_%';
-- SHOW INDEX FROM lexora_book_pages WHERE Key_name = 'uq_lexora_book_page';
-- SHOW INDEX FROM lexora_bookmarks WHERE Key_name = 'uq_lexora_bookmark';
-- SHOW INDEX FROM lexora_book_progress WHERE Key_name = 'uq_lexora_progress';
