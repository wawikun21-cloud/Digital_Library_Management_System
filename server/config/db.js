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

    // Create books table
    await tempConnection.query(`
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
      )
    `);
    console.log("✅ Books table ready");

    // Create borrowed_books table (for tracking borrowed books)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS borrowed_books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        book_id INT NOT NULL,
        borrower_name VARCHAR(255) NOT NULL,
        borrower_contact VARCHAR(100),
        borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date DATE NOT NULL,
        return_date DATE,
        status VARCHAR(50) DEFAULT 'Borrowed',
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Borrowed books table ready");

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

