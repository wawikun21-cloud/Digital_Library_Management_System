-- Migration: Create audit_logs table for activity tracking
--
-- NOTE: This table is now created automatically on every server start
-- by initDatabase() in server/config/db.js. This file is kept as the
-- manual/phpMyAdmin fallback for hosts where the server has not been
-- able to reach the database yet.
--
-- The column contract is defined by the code that writes and reads it:
--   server/models/AuditLog.js   (CRUD, pagination, stats, purge)
--   server/utils/auditHelper.js (logAudit helper used by controllers)
-- Keep all four in sync.

CREATE TABLE IF NOT EXISTS `audit_logs` (
  id            BIGINT       AUTO_INCREMENT PRIMARY KEY,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  user_id       INT          NULL,
  user_username VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50)  NULL,
  entity_id     INT          NULL,
  action        VARCHAR(50)  NOT NULL,
  old_data      JSON         NULL,
  new_data      JSON         NULL,
  ip_address    VARCHAR(45)  NULL,
  user_agent    TEXT         NULL,
  INDEX idx_created (created_at),
  INDEX idx_user (user_id),
  INDEX idx_user_username (user_username),
  INDEX idx_action (action),
  INDEX idx_entity (entity_type, entity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify
-- SELECT COUNT(*) FROM audit_logs;
-- DESCRIBE audit_logs;
