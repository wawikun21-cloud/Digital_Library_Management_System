# Lexora Digital Library Management System - Database Schema

## Overview
This document describes the database schema for the Lexora Digital Library Management System.

## Tables

### `attendance`
Tracks student/library user check-in and check-out times using RFID cards.
- **Purpose**: Library attendance/kiosk system
- **Key fields**: `student_id_number`, `check_in_time`, `check_out_time`, `status`

### `audit_logs`
Maintains an audit trail of all user actions in the system.
- **Purpose**: Activity logging
- **Key fields**: `user_username`, `entity_type`, `entity_id`, `action`, `old_data`, `new_data`

### `books`
Main book catalog with comprehensive bibliographic metadata (MARC-like fields).
- **Purpose**: Physical book inventory
- **Key fields**: `title`, `author`, `isbn`, `callNumber`, `accessionNumber`, `quantity`, `status`

### `book_copies`
Individual physical copies of books with unique accession numbers.
- **Purpose**: Track specific copies
- **Key fields**: `book_id`, `accession_number`, `status` (Available/Borrowed/Reserved/Lost/Damaged)

### `borrowed_books`
Records of book borrowing transactions.
- **Purpose**: Loan management
- **Key fields**: `book_id`, `borrower_name`, `borrower_id_number`, `borrow_date`, `due_date`, `return_date`, `status`
- **Note**: Supports both students and faculty via `borrower_type`

### `faculty`
Faculty/staff member records.
- **Purpose**: Faculty information
- **Key fields**: `faculty_name`, `department` (CIT/CCJE/CEAS/CBE/HS)

### `lexora_books`
Digital e-book collection (PLR - Private Label Rights).
- **Purpose**: Digital resource catalog
- **Key fields**: `title`, `source`, `resource_type`, `format`, `subject_course`
- **Features**: Generated columns for case-insensitive search (`title_lower`, `author_lower`)

### `rfid_cards`
RFID card registration for automated attendance.
- **Purpose**: Map RFID codes to students
- **Key fields**: `rfid_code`, `student_id_number` (FK to students)

### `students`
Student records.
- **Purpose**: Student information
- **Key fields**: `student_id_number`, `student_name`, `student_course`, `student_yr_level`

### `trash_log`
Soft-deleted items with automatic 30-day expiration.
- **Purpose**: Trash/recycle bin functionality
- **Key fields**: `entity_type`, `entity_id`, `deleted_at`, `expires_at` (generated)

### `users`
User authentication and role management.
- **Purpose**: System users
- **Roles**: admin, staff, librarian
- **Key fields**: `username`, `password` (bcrypt hashed), `role`

## Views

### `active_borrows`
Currently borrowed books (status='Borrowed', not deleted)

### `book_inventory`
Books with inventory status:
- `InStock`: quantity >= 5
- `LowStock`: quantity < 5 && quantity > 0
- `OutOfStock`: quantity = 0

### `overdue_borrows`
Overdue borrowed books with calculated `days_overdue`

## Relationships

```
students ──< rfid_cards
students ──< attendance
students ──< borrowed_books (via borrower_id_number)
faculty ──< borrowed_books (via borrower_id_number)
books ──< book_copies (via book_id)
books ──< borrowed_books (via book_id)
```

## Installation

1. Import `database_schema.sql` into MySQL/MariaDB
2. Enable event scheduler for automatic cleanup (optional)
3. Create initial admin user with bcrypt-hashed password

## Notes
- All tables use soft-delete (`is_deleted` flag)
- Audit trail captures before/after values in JSON format
- Views use LEFT JOIN to include books even if deleted from main table