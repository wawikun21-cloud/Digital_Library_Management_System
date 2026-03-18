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

    // Create books table (full schema)
    await tempConnection.query(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255) NULL,
        author VARCHAR(255) NULL,
        authors TEXT NULL,
        genre VARCHAR(100) NULL,
        isbn VARCHAR(50) NULL,
        issn VARCHAR(20) NULL,
        lccn VARCHAR(20) NULL,
        accessionNumber VARCHAR(50) NULL,
        callNumber VARCHAR(100) NULL,
        year INT NULL,
        date INT NULL,
        publisher VARCHAR(255) NULL,
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
        shelf VARCHAR(100) NULL,
        pages VARCHAR(20) NULL,
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

    // Migrate existing table — add new columns & relax constraints if needed
    await migrateSchema(tempConnection);

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
 * Migrate existing schema — runs ALTER TABLE statements safely (IF EXISTS / IF NOT EXISTS).
 * Safe to run on every startup; each statement is independent so one failure won't block others.
 */
async function migrateSchema(conn) {
  const migrations = [
    // Relax NOT NULL + change isbn from UNIQUE NOT NULL to nullable
    `ALTER TABLE books MODIFY COLUMN author VARCHAR(255) NULL`,
    `ALTER TABLE books MODIFY COLUMN genre VARCHAR(100) NULL`,
    `ALTER TABLE books MODIFY COLUMN isbn VARCHAR(50) NULL`,
    `ALTER TABLE books MODIFY COLUMN publisher VARCHAR(255) NULL`,
    // Add new columns introduced in the updated form (shelf, pages)
    `ALTER TABLE books ADD COLUMN shelf VARCHAR(100) NULL`,
    `ALTER TABLE books ADD COLUMN pages VARCHAR(20) NULL`,
    // Drop the UNIQUE index on isbn if it still exists
    `ALTER TABLE books DROP INDEX isbn`,
  ];

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log(`  ✅ Migration OK: ${sql.slice(0, 60)}…`);
    } catch (err) {
      // 1091 = Can't DROP, key doesn't exist
      // 1060 = Duplicate column name (column already added)
      // 1054 = Unknown column (already removed)
      if ([1091, 1060, 1054, 1061].includes(err.errno)) {
        console.log(`  ⏭️  Skipped (already applied): ${sql.slice(0, 60)}…`);
      } else {
        console.warn(`  ⚠️  Migration warning: ${err.message}`);
      }
    }
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