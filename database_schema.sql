-- Lexora Digital Library Management System - Database Schema
-- Generated from lexora.sql

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- --------------------------------------------------------
-- Table structure for table `attendance`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_course` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_yr_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_year` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `check_in_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `check_out_time` timestamp NULL DEFAULT NULL,
  `duration` int DEFAULT NULL,
  `status` enum('checked_in','checked_out') COLLATE utf8mb4_unicode_ci DEFAULT 'checked_in',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attendance_tap` (`student_id_number`,`status`,`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `audit_logs`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int DEFAULT NULL,
  `action` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `summary` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_data` json DEFAULT NULL,
  `new_data` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `books`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subtitle` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authors` text COLLATE utf8mb4_unicode_ci,
  `genre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isbn` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issn` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lccn` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accessionNumber` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `callNumber` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` int DEFAULT NULL,
  `date` int DEFAULT NULL,
  `publisher` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edition` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `materialType` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subtype` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extent` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `volume` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `authorDates` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `otherDetails` text COLLATE utf8mb4_unicode_ci,
  `shelf` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pages` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sublocation` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `cover` text COLLATE utf8mb4_unicode_ci,
  `quantity` int DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_accession` (`accessionNumber`),
  KEY `idx_authors` (`authors`(100)),
  KEY `idx_callNumber` (`callNumber`),
  KEY `idx_title` (`title`(250)),
  KEY `idx_books_title` (`title`(250)),
  KEY `idx_books_author` (`author`(250)),
  KEY `idx_books_genre` (`genre`),
  KEY `idx_books_isbn` (`isbn`),
  KEY `idx_books_status` (`status`),
  KEY `idx_books_deleted` (`is_deleted`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `book_copies`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `book_copies` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_id` int NOT NULL,
  `accession_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Available','Borrowed','Reserved','Lost','Damaged') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Available',
  `date_acquired` date DEFAULT NULL,
  `condition_notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_accession_number` (`accession_number`),
  UNIQUE KEY `idx_acc_unique` (`accession_number`),
  KEY `idx_book_id` (`book_id`),
  KEY `idx_status` (`status`),
  KEY `idx_book_copies_book_id` (`book_id`),
  KEY `idx_book_copies_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `borrowed_books`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `borrowed_books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_id` int NOT NULL,
  `accession_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `borrower_id_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_course` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_yr_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `borrower_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `borrow_date` date NOT NULL DEFAULT (curdate()),
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Borrowed',
  `fine_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `fine_paid` tinyint(1) NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_borrowed_books_book_id` (`book_id`),
  KEY `idx_borrowed_books_borrower_name` (`borrower_name`(250)),
  KEY `idx_borrowed_books_status` (`status`),
  KEY `idx_borrowed_books_borrow_date` (`borrow_date`),
  KEY `idx_borrowed_books_due_date` (`due_date`),
  KEY `idx_borrower_id` (`borrower_id_number`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_accession_number` (`accession_number`),
  KEY `idx_borrowed_deleted` (`is_deleted`,`deleted_at`),
  KEY `idx_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `faculty`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `faculty` (
  `id` int NOT NULL AUTO_INCREMENT,
  `faculty_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `department` enum('CIT','CCJE','CEAS','CBE','HS') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_faculty_name` (`faculty_name`(250)),
  KEY `idx_faculty_department` (`department`),
  KEY `idx_faculty_deleted` (`is_deleted`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `lexora_books`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `lexora_books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `author` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year` smallint DEFAULT NULL,
  `collection` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` text COLLATE utf8mb4_unicode_ci,
  `resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `program` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject_course` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `title_lower` varchar(500) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (lower(trim(`title`))) STORED,
  `author_lower` varchar(500) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS (lower(trim(coalesce(`author`,_utf8mb4'')))) STORED,
  PRIMARY KEY (`id`),
  KEY `idx_subject_course` (`subject_course`(191)),
  KEY `idx_program` (`program`),
  KEY `idx_resource_type` (`resource_type`),
  KEY `idx_title_author_lower` (`title_lower`(250),`author_lower`(250))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `rfid_cards`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rfid_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id_number` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `registered_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_code` (`rfid_code`),
  KEY `student_id_number` (`student_id_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `students`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_course` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_yr_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_school_year` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_contact` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `senior_high_school` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `strand` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id_number` (`student_id_number`),
  UNIQUE KEY `idx_student_id_unique` (`student_id_number`),
  KEY `idx_students_deleted` (`is_active`,`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `trash_log`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `trash_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('book','lexora_book','student','faculty','transaction','attendance') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` int NOT NULL,
  `entity_title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_meta` json DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp GENERATED ALWAYS AS ((`deleted_at` + interval 30 day)) STORED NULL,
  PRIMARY KEY (`id`),
  KEY `idx_trash_entity_type` (`entity_type`),
  KEY `idx_trash_deleted_at` (`deleted_at`),
  KEY `idx_trash_expires_at` (`expires_at`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','staff','librarian') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `avatar_url` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Foreign Key Constraints
-- --------------------------------------------------------

ALTER TABLE `rfid_cards`
  ADD CONSTRAINT `fk_rfid_student` FOREIGN KEY (`student_id_number`) REFERENCES `students` (`student_id_number`) ON DELETE CASCADE ON UPDATE CASCADE;

-- --------------------------------------------------------
-- Views
-- --------------------------------------------------------

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `active_borrows` AS 
SELECT `b`.`id` AS `id`, 
       `b`.`book_id` AS `book_id`, 
       `b`.`borrower_name` AS `borrower_name`, 
       `b`.`borrower_contact` AS `borrower_contact`, 
       `b`.`borrow_date` AS `borrow_date`, 
       `b`.`due_date` AS `due_date`, 
       `b`.`status` AS `status`, 
       `books`.`title` AS `book_title`, 
       `books`.`author` AS `book_author`, 
       `books`.`genre` AS `book_genre` 
FROM (`borrowed_books` `b` left join `books` on((`b`.`book_id` = `books`.`id`))) 
WHERE ((`b`.`is_deleted` = 0) AND (`books`.`is_deleted` = 0) AND (`b`.`status` = 'Borrowed'));

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `book_inventory` AS 
SELECT `books`.`id` AS `id`, 
       `books`.`title` AS `title`, 
       `books`.`author` AS `author`, 
       `books`.`genre` AS `genre`, 
       `books`.`isbn` AS `isbn`, 
       `books`.`quantity` AS `quantity`, 
       `books`.`status` AS `status`, 
       (case when (`books`.`quantity` = 0) then 'OutOfStock' 
             when (`books`.`quantity` < 5) then 'LowStock' 
             else 'InStock' end) AS `inventory_status` 
FROM `books` 
WHERE (`books`.`is_deleted` = 0);

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `overdue_borrows` AS 
SELECT `b`.`id` AS `id`, 
       `b`.`book_id` AS `book_id`, 
       `b`.`borrower_name` AS `borrower_name`, 
       `b`.`borrower_contact` AS `borrower_contact`, 
       `b`.`borrow_date` AS `borrow_date`, 
       `b`.`due_date` AS `due_date`, 
       `b`.`status` AS `status`, 
       `books`.`title` AS `book_title`, 
       `books`.`author` AS `book_author`, 
       `books`.`genre` AS `book_genre`, 
       (to_days(curdate()) - to_days(`b`.`due_date`)) AS `days_overdue` 
FROM (`borrowed_books` `b` left join `books` on((`b`.`book_id` = `books`.`id`))) 
WHERE ((`b`.`is_deleted` = 0) AND (`books`.`is_deleted` = 0) AND (`b`.`status` = 'Borrowed') AND (`b`.`due_date` < curdate()));

-- --------------------------------------------------------
-- Cleanup Event (Optional - requires event scheduler enabled)
-- --------------------------------------------------------

-- DROP EVENT IF EXISTS `cleanup_soft_deleted`;
-- CREATE DEFINER=`root`@`localhost` EVENT `cleanup_soft_deleted` 
-- ON SCHEDULE EVERY 1 DAY STARTS '2026-04-03 22:30:56' 
-- ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
--     DELETE FROM books WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
--     DELETE FROM students WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
--     DELETE FROM faculty WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
--     DELETE FROM borrowed_books WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
--     DELETE FROM attendance WHERE is_deleted = 1 AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
-- END$$

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;;