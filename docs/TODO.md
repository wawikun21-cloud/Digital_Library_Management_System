# TODO: Add Student Fields to Borrow Transaction Modal

## Plan
1. [x] Update Database - Add new columns to `borrowed_books` table
2. [x] Update Frontend - Add new form fields in Borrowed.jsx
3. [x] Update Backend Route - Accept new fields in transactions.js
4. [x] Update Model - Handle new fields in Transaction.js

## Database SQL (run in MySQL)
```sql
ALTER TABLE borrowed_books 
ADD COLUMN borrower_id_number VARCHAR(50) DEFAULT NULL,
ADD COLUMN borrower_email VARCHAR(100) DEFAULT NULL,
ADD COLUMN borrower_course VARCHAR(100) DEFAULT NULL,
ADD COLUMN borrower_yr_level VARCHAR(20) DEFAULT NULL,
ADD COLUMN borrow_date DATE DEFAULT NULL;

-- Set existing records borrow_date to current date
UPDATE borrowed_books SET borrow_date = CURDATE() WHERE borrow_date IS NULL;
```

## Implementation Summary
The following fields have been added to the Borrow Transaction modal:
- Student Name (already existed as borrower_name)
- ID Number (new field: borrower_id_number)
- Contact No. (already existed as borrower_contact)
- Email (new field: borrower_email)
- Course (new field: borrower_course)
- Yr Level (new field: borrower_yr_level)
- Date Borrowed (new field: borrow_date - auto-filled with current date)
- Due Date (already existed - manually set)

