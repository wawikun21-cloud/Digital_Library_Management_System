-- ─────────────────────────────────────────────────────────
--  migration_analytics.sql
--  Run once to add the attendance table (if not already
--  created by your existing schema) and performance indexes.
--  Safe to re-run — all statements use IF NOT EXISTS / IF EXISTS.
-- ─────────────────────────────────────────────────────────

-- 1. Attendance table (already created in db.js initDatabase,
--    but provided here for reference / manual DB setups)
CREATE TABLE IF NOT EXISTS attendance (
  id                 INT          AUTO_INCREMENT PRIMARY KEY,
  student_name       VARCHAR(255) NOT NULL,
  student_id_number  VARCHAR(50)  NOT NULL,
  student_course     VARCHAR(100) NULL,
  student_yr_level   VARCHAR(20)  NULL,
  check_in_time      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out_time     DATETIME     NULL,
  duration           INT          NULL COMMENT 'Minutes',
  status             ENUM('checked_in','checked_out') NOT NULL DEFAULT 'checked_in',
  created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_att_student   (student_id_number),
  INDEX idx_att_checkin   (check_in_time),
  INDEX idx_att_status    (status),
  INDEX idx_att_month_yr  (check_in_time)   -- used by analytics GROUP BY MONTH/YEAR
);

-- 2. Analytics performance indexes on borrowed_books
--    These speed up the GROUP BY queries in analyticsService.js

-- Fast borrow-date lookups for chart aggregation
ALTER TABLE borrowed_books
  ADD INDEX IF NOT EXISTS idx_bb_borrow_month (borrow_date, status);

-- Fast overdue queries
ALTER TABLE borrowed_books
  ADD INDEX IF NOT EXISTS idx_bb_overdue (status, due_date);

-- Fast fine aggregation
ALTER TABLE borrowed_books
  ADD INDEX IF NOT EXISTS idx_bb_fine (fine_paid, fine_amount, borrow_date);

-- 3. Analytics performance index on books
ALTER TABLE books
  ADD INDEX IF NOT EXISTS idx_books_status_qty (status, quantity);