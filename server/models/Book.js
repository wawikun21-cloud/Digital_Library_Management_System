// ─────────────────────────────────────────────────────────
//  models/Book.js
//  Book Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const BookModel = {
  /**
   * Get all books
   */
  async getAll() {
    try {
      const [rows] = await pool.query("SELECT * FROM books ORDER BY created_at DESC");
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get book by ID
   */
  async getById(id) {
    try {
      const [rows] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      if (rows.length === 0) {
        return { success: false, error: "Book not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[BookModel.getById] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Search books by query
   */
  async search(query) {
    try {
      const searchTerm = `%${query}%`;
      const [rows] = await pool.query(
        `SELECT * FROM books 
         WHERE title LIKE ? OR author LIKE ? OR genre LIKE ? OR isbn LIKE ? 
         ORDER BY title ASC`,
        [searchTerm, searchTerm, searchTerm, searchTerm]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.search] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Filter books by status or genre
   */
  async filter(status, genre) {
    try {
      let query = "SELECT * FROM books WHERE 1=1";
      const params = [];

      if (status && status !== "All") {
        query += " AND status = ?";
        params.push(status);
      }

      if (genre) {
        query += " AND genre = ?";
        params.push(genre);
      }

      query += " ORDER BY created_at DESC";

      const [rows] = await pool.query(query, params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.filter] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new book
   */
  async create(bookData) {
    try {
      const {
        title,
        author,
        genre,
        isbn,
        year,
        publisher,
        description = "",
        status = "Available",
        cover = null,
        quantity = 1,
      } = bookData;

      // Auto-set status based on quantity
      const finalStatus = quantity === 0 ? "OutOfStock" : status;

      const [result] = await pool.query(
        `INSERT INTO books (title, author, genre, isbn, year, publisher, description, status, cover, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, author, genre, isbn, year, publisher, description, finalStatus, cover, quantity]
      );

      // Get the created book
      const [rows] = await pool.query("SELECT * FROM books WHERE id = ?", [result.insertId]);
      
      console.log(`✅ Book added: ${title} (ID: ${result.insertId})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[BookModel.create] Error:", error.message);
      if (error.code === "ER_DUP_ENTRY") {
        return { success: false, error: "A book with this ISBN already exists" };
      }
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an existing book
   */
  async update(id, bookData) {
    try {
      const {
        title,
        author,
        genre,
        isbn,
        year,
        publisher,
        description,
        status,
        cover,
        quantity,
      } = bookData;

      // Get current book to check quantity changes
      const [current] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      if (current.length === 0) {
        return { success: false, error: "Book not found" };
      }

      // Auto-set status based on quantity if not explicitly provided
      const finalStatus = quantity === 0 ? "OutOfStock" : (status || current[0].status);

      await pool.query(
        `UPDATE books SET 
          title = ?, author = ?, genre = ?, isbn = ?, year = ?, 
          publisher = ?, description = ?, status = ?, cover = ?, quantity = ?
         WHERE id = ?`,
        [title, author, genre, isbn, year, publisher, description, finalStatus, cover, quantity, id]
      );

      // Get updated book
      const [rows] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      
      console.log(`✅ Book updated: ${title} (ID: ${id})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[BookModel.update] Error:", error.message);
      if (error.code === "ER_DUP_ENTRY") {
        return { success: false, error: "A book with this ISBN already exists" };
      }
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a book
   */
  async delete(id) {
    try {
      // First get the book to return its info
      const [book] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      
      if (book.length === 0) {
        return { success: false, error: "Book not found" };
      }

      await pool.query("DELETE FROM books WHERE id = ?", [id]);
      
      console.log(`✅ Book deleted: ${book[0].title} (ID: ${id})`);
      return { success: true, data: book[0] };
    } catch (error) {
      console.error("[BookModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get books by status (Available, OutOfStock)
   */
  async getByStatus(status) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM books WHERE status = ? ORDER BY title ASC",
        [status]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getByStatus] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get book count
   */
  async getCount() {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) as count FROM books");
      return { success: true, count: rows[0].count };
    } catch (error) {
      console.error("[BookModel.getCount] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = BookModel;

