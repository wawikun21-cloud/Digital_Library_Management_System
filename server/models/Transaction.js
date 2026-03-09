// ─────────────────────────────────────────────────────────
//  models/Transaction.js
//  Transaction Model - MySQL CRUD Operations
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const TransactionModel = {
  /**
   * Get all transactions
   */
  async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        ORDER BY t.borrow_date DESC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getAll] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get transaction by ID
   */
  async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);
      if (rows.length === 0) {
        return { success: false, error: "Transaction not found" };
      }
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.getById] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get transactions by book ID
   */
  async getByBookId(bookId) {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.book_id = ?
        ORDER BY t.borrow_date DESC
      `, [bookId]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getByBookId] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get active borrows (not returned)
   */
  async getActiveBorrows() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed'
        ORDER BY t.due_date ASC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getActiveBorrows] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get overdue borrows
   */
  async getOverdueBorrows() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed' AND t.due_date < CURDATE()
        ORDER BY t.due_date ASC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getOverdueBorrows] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Create a new transaction (borrow a book)
   */
  async create(transactionData) {
    try {
      const {
        book_id,
        borrower_name,
        borrower_id_number,
        borrower_contact,
        borrower_email,
        borrower_course,
        borrower_yr_level,
        borrow_date,
        due_date,
      } = transactionData;

      // Check if book is available
      const [book] = await pool.query("SELECT * FROM books WHERE id = ?", [book_id]);
      if (book.length === 0) {
        return { success: false, error: "Book not found" };
      }
      if (book[0].quantity <= 0) {
        return { success: false, error: "Book is not available" };
      }

      // Create transaction with all new fields
      const [result] = await pool.query(
        `INSERT INTO borrowed_books (book_id, borrower_name, borrower_id_number, borrower_contact, borrower_email, borrower_course, borrower_yr_level, borrow_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Borrowed')`,
        [book_id, borrower_name, borrower_id_number || null, borrower_contact || null, borrower_email || null, borrower_course || null, borrower_yr_level || null, borrow_date || null, due_date]
      );

      // Decrease book quantity
      await pool.query(
        "UPDATE books SET quantity = quantity - 1 WHERE id = ?",
        [book_id]
      );

      // Get the created transaction
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [result.insertId]);
      
      console.log(`✅ Book borrowed: ${book[0].title} by ${borrower_name}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.create] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Return a book (update transaction)
   */
  async returnBook(id) {
    try {
      // Get transaction
      const [transaction] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (transaction.length === 0) {
        return { success: false, error: "Transaction not found" };
      }
      if (transaction[0].status === "Returned") {
        return { success: false, error: "Book already returned" };
      }

      // Update transaction
      const returnDate = new Date().toISOString().slice(0, 10);
      await pool.query(
        `UPDATE borrowed_books SET status = 'Returned', return_date = ? WHERE id = ?`,
        [returnDate, id]
      );

      // Increase book quantity
      await pool.query(
        "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
        [transaction[0].book_id]
      );

      // Get updated transaction
      const [rows] = await pool.query(`
        SELECT t.*, b.title as book_title, b.author as book_author 
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);
      
      console.log(`✅ Book returned: ID ${id}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.returnBook] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a transaction
   */
  async delete(id) {
    try {
      // Get transaction first
      const [transaction] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (transaction.length === 0) {
        return { success: false, error: "Transaction not found" };
      }

      // If book not returned, restore quantity
      if (transaction[0].status === "Borrowed") {
        await pool.query(
          "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
          [transaction[0].book_id]
        );
      }

      await pool.query("DELETE FROM borrowed_books WHERE id = ?", [id]);
      
      console.log(`✅ Transaction deleted: ID ${id}`);
      return { success: true, data: transaction[0] };
    } catch (error) {
      console.error("[TransactionModel.delete] Error:", error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get transaction statistics
   */
  async getStats() {
    try {
      const [total] = await pool.query("SELECT COUNT(*) as count FROM borrowed_books");
      const [active] = await pool.query("SELECT COUNT(*) as count FROM borrowed_books WHERE status = 'Borrowed'");
      const [returned] = await pool.query("SELECT COUNT(*) as count FROM borrowed_books WHERE status = 'Returned'");
      const [overdue] = await pool.query("SELECT COUNT(*) as count FROM borrowed_books WHERE status = 'Borrowed' AND due_date < CURDATE()");

      return { 
        success: true, 
        data: {
          total: total[0].count,
          active: active[0].count,
          returned: returned[0].count,
          overdue: overdue[0].count
        }
      };
    } catch (error) {
      console.error("[TransactionModel.getStats] Error:", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = TransactionModel;

