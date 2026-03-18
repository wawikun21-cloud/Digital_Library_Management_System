-- ============================================================
-- Digital Library Management System - Database Schema
-- ============================================================
-- Version: 1.0
-- Database: MySQL
-- ============================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS lexora CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lexora;

-- ============================================================
-- Table: users
-- Description: Stores user accounts for the system
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'librarian', 'user') DEFAULT 'user',
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: books
-- Description: Stores book information
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    year INT NOT NULL,
    publisher VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Available',
    cover TEXT,
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: borrowed_books
-- Description: Tracks book borrowing transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS borrowed_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    borrower_name VARCHAR(255) NOT NULL,
    borrower_id_number VARCHAR(100),
    borrower_contact VARCHAR(100),
    borrower_email VARCHAR(100),
    borrower_course VARCHAR(100),
    borrower_yr_level VARCHAR(50),
    borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(50) DEFAULT 'Borrowed',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: book_copies
-- Description: Tracks individual book copies (for inventory)
-- ============================================================
CREATE TABLE IF NOT EXISTS book_copies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    copy_number VARCHAR(50) NOT NULL,
    status ENUM('Available', 'Borrowed', 'Lost', 'Damaged') DEFAULT 'Available',
    barcode VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- ============================================================
-- Table: genres
-- Description: Predefined book genres (for consistent categorization)
-- ============================================================
CREATE TABLE IF NOT EXISTS genres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: publishers
-- Description: Predefined book publishers
-- ============================================================
CREATE TABLE IF NOT EXISTS publishers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address TEXT,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: authors
-- Description: Predefined book authors
-- ============================================================
CREATE TABLE IF NOT EXISTS authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    biography TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: book_authors
-- Description: Many-to-many relationship between books and authors
-- ============================================================
CREATE TABLE IF NOT EXISTS book_authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_book_author (book_id, author_id)
);

-- ============================================================
-- Table: logs
-- Description: System activity logs
-- ============================================================
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- Insert initial data
-- ============================================================

-- Insert default admin user (password: admin123)
-- Note: Password is hashed using bcrypt
INSERT INTO users (username, email, password, full_name, role) VALUES 
('admin', 'admin@lexora.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Insert common book genres
INSERT INTO genres (name, description) VALUES 
('Fiction', 'Imaginative or invented stories'),
('Non-Fiction', 'Factual information or real events'),
('Mystery', 'Stories involving crime or puzzles'),
('Science Fiction', 'Stories based on science and technology'),
('Fantasy', 'Stories involving magic and imaginary worlds'),
('Romance', 'Stories focusing on love and relationships'),
('Thriller', 'Exciting and suspenseful stories'),
('Horror', 'Stories intended to scare or frighten'),
('Biography', 'Life story of a real person'),
('Autobiography', 'Life story written by the person themselves'),
('History', 'Study of past events'),
('Science', 'Systematic study of natural world'),
('Mathematics', 'Study of numbers, quantity, and space'),
('Computer Science', 'Study of computation and information'),
('Literature', 'Written works of art and creativity'),
('Poetry', 'Literary work in verse form');

-- Insert sample publishers
INSERT INTO publishers (name) VALUES 
('Penguin Random House'),
('HarperCollins'),
('Simon & Schuster'),
('Hachette Book Group'),
('Macmillan Publishers'),
('Oxford University Press'),
('Cambridge University Press'),
('Pearson Education'),
('McGraw-Hill Education'),
('Scholastic');

-- Insert sample books
INSERT INTO books (title, author, genre, isbn, year, publisher, description, status, quantity) VALUES 
('The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', '9780743273565', 1925, 'Scribner', 'A story of wealth, love, and the American Dream', 'Available', 5),
('1984', 'George Orwell', 'Science Fiction', '9780451524935', 1949, 'Signet Classics', 'A dystopian novel about totalitarianism', 'Available', 3),
('To Kill a Mockingbird', 'Harper Lee', 'Fiction', '9780061120084', 1960, 'HarperPerennial Modern Classics', 'A story of racial injustice and childhood innocence', 'Available', 4),
('Pride and Prejudice', 'Jane Austen', 'Romance', '9780141439518', 1813, 'Penguin Classics', 'A classic story of love and social class', 'Available', 6),
('The Hobbit', 'J.R.R. Tolkien', 'Fantasy', '9780547928227', 1937, 'Houghton Mifflin Harcourt', 'An adventure story in Middle-earth', 'Available', 2);

-- ============================================================
-- Create indexes for performance optimization
-- ============================================================
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_status ON books(status);

CREATE INDEX idx_borrowed_books_book_id ON borrowed_books(book_id);
CREATE INDEX idx_borrowed_books_borrower_name ON borrowed_books(borrower_name);
CREATE INDEX idx_borrowed_books_status ON borrowed_books(status);
CREATE INDEX idx_borrowed_books_borrow_date ON borrowed_books(borrow_date);
CREATE INDEX idx_borrowed_books_due_date ON borrowed_books(due_date);

CREATE INDEX idx_book_copies_book_id ON book_copies(book_id);
CREATE INDEX idx_book_copies_status ON book_copies(status);
CREATE INDEX idx_book_copies_barcode ON book_copies(barcode);

CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_action ON logs(action);
CREATE INDEX idx_logs_created_at ON logs(created_at);

-- ============================================================
-- Create views for common queries
-- ============================================================

-- View for active borrows with book details
CREATE OR REPLACE VIEW active_borrows AS
SELECT 
    b.id,
    b.book_id,
    b.borrower_name,
    b.borrower_contact,
    b.borrow_date,
    b.due_date,
    b.status,
    books.title AS book_title,
    books.author AS book_author,
    books.genre AS book_genre
FROM borrowed_books b
LEFT JOIN books ON b.book_id = books.id
WHERE b.status = 'Borrowed';

-- View for overdue borrows
CREATE OR REPLACE VIEW overdue_borrows AS
SELECT 
    b.id,
    b.book_id,
    b.borrower_name,
    b.borrower_contact,
    b.borrow_date,
    b.due_date,
    b.status,
    books.title AS book_title,
    books.author AS book_author,
    books.genre AS book_genre,
    DATEDIFF(CURDATE(), b.due_date) AS days_overdue
FROM borrowed_books b
LEFT JOIN books ON b.book_id = books.id
WHERE b.status = 'Borrowed' AND b.due_date < CURDATE();

-- View for book inventory status
CREATE OR REPLACE VIEW book_inventory AS
SELECT 
    id,
    title,
    author,
    genre,
    isbn,
    quantity,
    status,
    CASE 
        WHEN quantity = 0 THEN 'OutOfStock'
        WHEN quantity < 5 THEN 'LowStock'
        ELSE 'InStock'
    END AS inventory_status
FROM books;

-- ============================================================
-- Database configuration options
-- ============================================================
SET GLOBAL time_zone = '+8:00'; -- Set to Philippine time (UTC+8)
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Table: students
-- Description: Stores student information for the library
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id_number VARCHAR(100) NOT NULL UNIQUE,
    student_name VARCHAR(255) NOT NULL,
    student_course VARCHAR(100),
    student_yr_level VARCHAR(50),
    student_email VARCHAR(100),
    student_contact VARCHAR(100),
    display_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Table: attendance
-- Description: Tracks student check-in/check-out times and duration
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    student_id_number VARCHAR(100) NOT NULL,
    student_course VARCHAR(100),
    student_yr_level VARCHAR(50),
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP,
    duration INT,
    status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- Create indexes for students table
-- ============================================================
CREATE INDEX idx_students_student_id ON students(student_id_number);
CREATE INDEX idx_students_name ON students(student_name);

-- ============================================================
-- Create indexes for attendance table
-- ============================================================
CREATE INDEX idx_attendance_student_id ON attendance(student_id_number);
CREATE INDEX idx_attendance_check_in ON attendance(check_in_time);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ============================================================
-- END OF DATABASE SCHEMA
-- ============================================================
