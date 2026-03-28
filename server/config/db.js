// ─────────────────────────────────────────────────────────
//  config/db.js
//  MySQL Database Connection & Initialization
// ─────────────────────────────────────────────────────────

const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host:               process.env.DB_HOST     || "localhost",
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "lexora",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
};

const pool = mysql.createPool(dbConfig);

async function initDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: dbConfig.host, port: dbConfig.port,
      user: dbConfig.user, password: dbConfig.password,
    });

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    console.log(`✅ Database '${dbConfig.database}' ready`);
    await conn.query(`USE \`${dbConfig.database}\``);

    // ── books: one row per unique title ──────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS books (
        id            INT          AUTO_INCREMENT PRIMARY KEY,
        title         VARCHAR(255) NOT NULL,
        subtitle      VARCHAR(255) NULL,
        author        VARCHAR(255) NULL,
        authors       TEXT         NULL,
        genre         VARCHAR(100) NULL,
        isbn          VARCHAR(50)  NULL,
        issn          VARCHAR(20)  NULL,
        lccn          VARCHAR(20)  NULL,
        accessionNumber VARCHAR(50) NULL,
        callNumber    VARCHAR(100) NULL,
        year          INT          NULL,
        date          INT          NULL,
        publisher     VARCHAR(255) NULL,
        edition       VARCHAR(50)  NULL,
        materialType  VARCHAR(50)  NULL,
        subtype       VARCHAR(50)  NULL,
        extent        VARCHAR(100) NULL,
        size          VARCHAR(50)  NULL,
        volume        VARCHAR(20)  NULL,
        authorName    VARCHAR(255) NULL,
        authorDates   VARCHAR(50)  NULL,
        place         VARCHAR(255) NULL,
        description   TEXT         NULL,
        otherDetails  TEXT         NULL,
        shelf         VARCHAR(100) NULL,
        pages         VARCHAR(20)  NULL,
        collection    VARCHAR(50)  NULL,
        status        VARCHAR(50)  DEFAULT 'Available',
        cover         TEXT         NULL,
        quantity      INT          DEFAULT 1,
        created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_accession  (accessionNumber),
        INDEX idx_authors    (authors(100)),
        INDEX idx_callNumber (callNumber),
        INDEX idx_title      (title)
      )
    `);
    console.log("✅ Books table ready");

    // ── book_copies: one row per physical copy ────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS book_copies (
        id               INT         AUTO_INCREMENT PRIMARY KEY,
        book_id          INT         NOT NULL,
        accession_number VARCHAR(50) NOT NULL UNIQUE,
        status           ENUM('Available','Borrowed','Reserved','Lost','Damaged')
                                     DEFAULT 'Available',
        date_acquired    DATE        NULL,
        condition_notes  TEXT        NULL,
        created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        INDEX idx_book_id   (book_id),
        INDEX idx_acc       (accession_number),
        INDEX idx_status    (status)
      )
    `);
    console.log("✅ Book copies table ready");

    // ── borrowed_books (legacy — keep for existing data) ──
    await conn.query(`
      CREATE TABLE IF NOT EXISTS borrowed_books (
        id               INT          AUTO_INCREMENT PRIMARY KEY,
        book_id          INT          NOT NULL,
        borrower_name    VARCHAR(255) NOT NULL,
        borrower_contact VARCHAR(100),
        borrow_date      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        due_date         DATE         NOT NULL,
        return_date      DATE,
        status           VARCHAR(50)  DEFAULT 'Borrowed',
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    console.log("✅ Borrowed books table ready");

    await migrateSchema(conn);
    await conn.end();
    console.log("✅ Database initialization complete\n");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    throw error;
  }
}

async function migrateSchema(conn) {
  const migrations = [
    `ALTER TABLE books MODIFY COLUMN author    VARCHAR(255) NULL`,
    `ALTER TABLE books MODIFY COLUMN genre     VARCHAR(100) NULL`,
    `ALTER TABLE books MODIFY COLUMN isbn      VARCHAR(50)  NULL`,
    `ALTER TABLE books MODIFY COLUMN publisher VARCHAR(255) NULL`,
    `ALTER TABLE books ADD COLUMN shelf      VARCHAR(100) NULL`,
    `ALTER TABLE books ADD COLUMN pages      VARCHAR(20)  NULL`,
    `ALTER TABLE books ADD COLUMN collection VARCHAR(50)  NULL`,
    `ALTER TABLE books DROP INDEX isbn`,
    // book_copies columns added after initial release
    `ALTER TABLE book_copies ADD COLUMN date_acquired   DATE NULL`,
    `ALTER TABLE book_copies ADD COLUMN condition_notes TEXT NULL`,
    // Ensure accession_number is truly unique at DB level
    `ALTER TABLE book_copies ADD UNIQUE INDEX idx_acc_unique (accession_number)`,
  ];

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log(`  ✅ Migration: ${sql.slice(0, 65)}…`);
    } catch (err) {
      if ([1091, 1060, 1054, 1061].includes(err.errno)) {
        console.log(`  ⏭️  Already applied: ${sql.slice(0, 65)}…`);
      } else {
        console.warn(`  ⚠️  Migration warning: ${err.message}`);
      }
    }
  }
}

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

module.exports = { pool, initDatabase, testConnection };
