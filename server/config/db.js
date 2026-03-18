// ─────────────────────────────────────────────────────────
//  config/db.js
//  MySQL Database Connection & Initialization
// ─────────────────────────────────────────────────────────

const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host:     process.env.DB_HOST || "localhost",
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "lexora",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Initialize database - create tables if they don't exist
 */
async function initDatabase() {
  try {
    // First connect without database to create it if needed
    const tempConnection = await mysql.createConnection({
      host:     dbConfig.host,
      port:     dbConfig.port,
      user:     dbConfig.user,
      password: dbConfig.password,
    });

    // Create database if not exists
    await tempConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``
    );
    console.log(`✅ Database '${dbConfig.database}' ready`);

    // Use the database
    await tempConnection.query(`USE \`${dbConfig.database}\``);

    // Create users table (for system authentication)
    await tempConnection.query(`
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
      )
    `);
    console.log("✅ Users table ready");

    // Create books table (full schema)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NULL,
        author VARCHAR(255) NOT NULL,
        authors TEXT NULL,
        genre VARCHAR(100) NOT NULL,
        isbn VARCHAR(20) NOT NULL UNIQUE,
        issn VARCHAR(20) NULL,
        lccn VARCHAR(20) NULL,
        accessionNumber VARCHAR(50) NULL,
        callNumber VARCHAR(100) NULL,
        year INT NULL,
        date INT NULL,
        publisher VARCHAR(255) NOT NULL,
        edition VARCHAR(50) NULL,
        materialType VARCHAR(50) NULL,
        subtype VARCHAR(50) NULL,
        extent VARCHAR(100) NULL,
        size VARCHAR(50) NULL,
        volume VARCHAR(20) NULL,
        authorName VARCHAR(255) NULL,
        authorDates VARCHAR(50) NULL,
        place VARCHAR(255) NULL,
        description TEXT NULL,
        otherDetails TEXT NULL,
        status VARCHAR(50) DEFAULT 'Available',
        cover TEXT NULL,
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_accession (accessionNumber),
        INDEX idx_authors (authors),
        INDEX idx_callNumber (callNumber)
      )
    `);
    console.log("✅ Books table ready (full schema)");

    // Create borrowed_books table (for tracking borrowed books)
    await tempConnection.query(`
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
      )
    `);
    console.log("✅ Borrowed books table ready");

    // Create book_copies table (for inventory management)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS book_copies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        copy_number VARCHAR(50) NOT NULL,
        status ENUM('Available', 'Borrowed', 'Lost', 'Damaged') DEFAULT 'Available',
        barcode VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Book copies table ready");

    // Create genres table (predefined book genres)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS genres (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Genres table ready");

    // Create publishers table (predefined book publishers)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS publishers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        address TEXT,
        contact_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Publishers table ready");

    // Create authors table (predefined book authors)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        biography TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ Authors table ready");

    // Create book_authors table (many-to-many relationship between books and authors)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS book_authors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        author_id INT NOT NULL,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
        UNIQUE KEY unique_book_author (book_id, author_id)
      )
    `);
    console.log("✅ Book authors table ready");

     // Create logs table (system activity logs)
     await tempConnection.query(`
       CREATE TABLE IF NOT EXISTS logs (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id INT,
         action VARCHAR(255) NOT NULL,
         description TEXT,
         ip_address VARCHAR(45),
         user_agent TEXT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
       )
     `);
     console.log("✅ Logs table ready");

     // Create students table (stores student information)
     await tempConnection.query(`
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
       )
     `);
     console.log("✅ Students table ready");

     // Create attendance table (tracks student check-in/check-out)
     await tempConnection.query(`
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
       )
     `);
     console.log("✅ Attendance table ready");

     await tempConnection.end();
     console.log("✅ Database initialization complete\n");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    throw error;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ MySQL connection established");
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return false;
  }
}

module.exports = {
  pool,
  initDatabase,
  testConnection,
};

