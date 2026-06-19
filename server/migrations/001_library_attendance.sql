-- Migration: Add Library Attendance Support
-- Run: mysql -u root -p lexora < server/migrations/001_library_attendance.sql

-- 1. Create library_students table (RFID-specific registration)
CREATE TABLE IF NOT EXISTS `library_students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rfid_id` VARCHAR(100) UNIQUE NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `course` VARCHAR(100),
  `school_year` VARCHAR(20),
  `email` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` TINYINT(1) DEFAULT 0,
  `deleted_at` DATETIME NULL,
  INDEX `idx_rfid` (`rfid_id`),
  INDEX `idx_course` (`course`),
  INDEX `idx_deleted` (`is_deleted`, `deleted_at`)
);

-- 2. Extend existing attendance table
ALTER TABLE `attendance` 
ADD COLUMN IF NOT EXISTS `rfid_id` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `library_type` ENUM('regular', 'library') DEFAULT 'regular',
ADD INDEX `idx_rfid` (`rfid_id`),
ADD INDEX `idx_library_type` (`library_type`);

-- Sample data (optional)
INSERT IGNORE INTO `library_students` (`rfid_id`, `full_name`, `course`, `school_year`, `email`) VALUES
('RFID123456', 'Sample Student', 'BSIT', '2024-2025', 'student@example.com');

-- View for library live data (active checked_in library attendance)
DROP VIEW IF EXISTS `library_live`;
CREATE VIEW `library_live` AS
SELECT 
  a.*, ls.full_name, ls.course, ls.school_year, ls.rfid_id
FROM attendance a
JOIN library_students ls ON a.rfid_id = ls.rfid_id
WHERE a.status = 'checked_in' AND a.library_type = 'library'
ORDER BY a.check_in_time DESC;

-- Success message
SELECT 'Library Attendance Migration Complete!' AS status;
