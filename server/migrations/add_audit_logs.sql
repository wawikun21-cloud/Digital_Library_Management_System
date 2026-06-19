-- Migration: Create audit_logs table for activity tracking
-- Run: node server/index.js (triggers db.init)

CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INT NULL,
  username VARCHAR(100) NOT NULL,
  \`role\` ENUM('admin','staff') NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT NULL,
  summary VARCHAR(255),
  changes JSON NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_created (created_at DESC),
  INDEX idx_user (user_id),
  INDEX idx_role_action (\`role\`, action),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_ip (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify
-- SELECT COUNT(*) FROM audit_logs;
-- DESCRIBE audit_logs;

