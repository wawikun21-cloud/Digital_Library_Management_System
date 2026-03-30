// ─────────────────────────────────────────────────────────
//  models/Transaction.js  (UPDATED)
//  - lookupStudent now supports partial ID match (live search)
//  - searchFaculty unchanged
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

// Returns today's date as "YYYY-MM-DD" in local server time (not UTC).
// Using new Date().toISOString() returns UTC which can be 1 day behind
// in UTC+8 (Philippines) before 8am.
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const FINE_PER_DAY = 5; // ₱5 per day overdue

// Compute fine SQL fragment — used in every SELECT.
// Fine accrues on overdue Borrowed books; once Returned it's frozen at return_date.
// fine_amount column stores any manually overridden or paid amount.
const FINE_SQL = `
  CASE
    WHEN t.status = 'Returned' THEN
      GREATEST(0, DATEDIFF(t.return_date, t.due_date)) * ${FINE_PER_DAY}
    WHEN t.due_date < CURDATE() THEN
      DATEDIFF(CURDATE(), t.due_date) * ${FINE_PER_DAY}
    ELSE 0
  END AS computed_fine
`;

const TransactionModel = {

  async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        ORDER BY t.borrow_date DESC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);
      if (!rows.length) return { success: false, error: "Transaction not found" };
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.getById]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getByBookId(bookId) {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.book_id = ?
        ORDER BY t.borrow_date DESC
      `, [bookId]);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getByBookId]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getActiveBorrows() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed'
        ORDER BY t.due_date ASC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getActiveBorrows]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getOverdueBorrows() {
    try {
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed' AND t.due_date < CURDATE()
        ORDER BY t.due_date ASC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getOverdueBorrows]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Look up student by ID number ──────────────────────
  // Supports both EXACT match (used when confirming) and
  // PARTIAL match (used for live dropdown search).
  // The route passes the raw query string so we do LIKE search.
  async lookupStudent(studentIdNumber) {
    try {
      // Try exact match first
      const [exact] = await pool.query(
        `SELECT student_id_number, student_name, first_name, last_name,
                student_course, student_yr_level, student_contact, student_email
         FROM students
         WHERE student_id_number = ? AND is_active = 1
         LIMIT 1`,
        [studentIdNumber]
      );
      if (exact.length) return { success: true, data: exact[0], multiple: false };

      // Fallback: partial match (for live typing)
      const [rows] = await pool.query(
        `SELECT student_id_number, student_name, first_name, last_name,
                student_course, student_yr_level, student_contact, student_email
         FROM students
         WHERE (student_id_number LIKE ? OR student_name LIKE ?
                OR first_name LIKE ? OR last_name LIKE ?)
           AND is_active = 1
         LIMIT 10`,
        [`%${studentIdNumber}%`, `%${studentIdNumber}%`,
         `%${studentIdNumber}%`, `%${studentIdNumber}%`]
      );

      if (!rows.length) return { success: false, error: "Student not found" };

      // If multiple results, return them all so the frontend can show a list
      return { success: true, data: rows, multiple: rows.length > 1 };
    } catch (error) {
      console.error("[TransactionModel.lookupStudent]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Look up faculty by name (partial search) ──────────
  async searchFaculty(query) {
    try {
      const [rows] = await pool.query(
        `SELECT id, faculty_name, department FROM faculty
         WHERE faculty_name LIKE ? AND is_active = 1 LIMIT 10`,
        [`%${query}%`]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.searchFaculty]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Search books by accession number or title ─────────
  async searchBooks(query) {
    try {
      const t = `%${query}%`;
      const [rows] = await pool.query(`
        SELECT
          b.id, b.title, b.author, b.accessionNumber,
          b.quantity, b.status,
          COALESCE(cc.avail_copies,  b.quantity) AS available_copies,
          COALESCE(cc.total_copies,  b.quantity) AS total_copies,
          COALESCE(
            (SELECT accession_number
             FROM book_copies
             WHERE book_id = b.id AND status = 'Available'
             ORDER BY accession_number
             LIMIT 1),
            b.accessionNumber
          ) AS first_available_accession,
          cc.accession_list
        FROM books b
        LEFT JOIN (
          SELECT book_id,
            COUNT(*)                  AS total_copies,
            SUM(status = 'Available') AS avail_copies,
            GROUP_CONCAT(accession_number ORDER BY accession_number SEPARATOR ', ') AS accession_list
          FROM book_copies
          GROUP BY book_id
        ) cc ON cc.book_id = b.id
        WHERE
          -- Match title or accession number (books table or any copy)
          (b.title LIKE ? OR b.accessionNumber LIKE ? OR cc.accession_list LIKE ?)
          -- Only show books that have at least 1 available copy
          AND COALESCE(cc.avail_copies, b.quantity) > 0
        ORDER BY b.title ASC
        LIMIT 10`,
        [t, t, t]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.searchBooks]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Check how many books a borrower currently has ─────
  async getActiveBorrowCount(borrowerIdNumber, borrowerName) {
    try {
      let rows;
      if (borrowerIdNumber) {
        [rows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM borrowed_books
           WHERE borrower_id_number = ? AND status = 'Borrowed'`,
          [borrowerIdNumber]
        );
      } else {
        [rows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM borrowed_books
           WHERE borrower_name = ? AND borrower_id_number IS NULL AND status = 'Borrowed'`,
          [borrowerName]
        );
      }
      return { success: true, count: Number(rows[0].cnt) };
    } catch (error) {
      console.error("[TransactionModel.getActiveBorrowCount]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Create transaction (single book) ─────────────────
async create(transactionData) {
    try {
      const {
        book_id, accession_number, borrower_name, borrower_id_number,
        borrower_contact, borrower_email,
        borrower_course, borrower_yr_level,
        borrower_type,
        borrow_date, due_date,
      } = transactionData;

      // Use provided accession or fallback to book's primary
      const finalAccession = accession_number || book[0].accessionNumber;
      if (!finalAccession) {
        return { success: false, error: "Accession number required for accurate availability tracking" };
      }
      const useAccession = finalAccession;

      // Check book availability
      const [book] = await pool.query("SELECT * FROM books WHERE id = ?", [book_id]);
      if (!book.length)          return { success: false, error: "Book not found" };
      if (book[0].quantity <= 0) return { success: false, error: "Book is not available" };

      // Enforce max 2 books per borrower
      const countResult = await this.getActiveBorrowCount(borrower_id_number, borrower_name);
      if (countResult.success && countResult.count >= 2) {
        return { success: false, error: "Borrower already has 2 books borrowed (maximum reached)" };
      }

      // 1. Mark specific copy as borrowed
      await pool.query(
        `UPDATE book_copies SET status = 'Borrowed' 
         WHERE book_id = ? AND accession_number = ?`,
        [book_id, useAccession]
      );

      // 2. Create transaction record
      const [result] = await pool.query(
        `INSERT INTO borrowed_books
           (book_id, accession_number, borrower_name, borrower_id_number, borrower_contact,
            borrower_email, borrower_course, borrower_yr_level, borrower_type,
            borrow_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Borrowed')`,
        [
          book_id, useAccession, borrower_name, borrower_id_number || null,
          borrower_contact || null, borrower_email || null,
          borrower_course || null, borrower_yr_level || null,
          borrower_type || 'student',
          borrow_date || localDateStr(),
          due_date,
        ]
      );

      // Decrease quantity
      await pool.query("UPDATE books SET quantity = quantity - 1 WHERE id = ?", [book_id]);

      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [result.insertId]);

      console.log(`✅ Borrowed: "${book[0].title}" by ${borrower_name}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.create]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Update transaction details ─────────────────────────
  async update(id, data) {
    try {
      const {
        borrower_name, borrower_id_number, borrower_contact,
        borrower_email, borrower_course, borrower_yr_level,
        borrow_date, due_date,
      } = data;

      await pool.query(
        `UPDATE borrowed_books
         SET borrower_name = ?, borrower_id_number = ?, borrower_contact = ?,
             borrower_email = ?, borrower_course = ?, borrower_yr_level = ?,
             borrow_date = ?, due_date = ?
         WHERE id = ?`,
        [
          borrower_name, borrower_id_number || null, borrower_contact || null,
          borrower_email || null, borrower_course || null, borrower_yr_level || null,
          borrow_date, due_date, id,
        ]
      );

      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);

      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Extend due date by N days ─────────────────────────
  async extend(id, days = 1) {
    try {
      const [rows] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (!rows.length)                    return { success: false, error: "Transaction not found" };
      if (rows[0].status === "Returned")   return { success: false, error: "Cannot extend a returned book" };

      await pool.query(
        `UPDATE borrowed_books
         SET due_date = DATE_ADD(due_date, INTERVAL ? DAY)
         WHERE id = ?`,
        [days, id]
      );

      const [updated] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);

      console.log(`✅ Extended transaction ${id} by ${days} day(s)`);
      return { success: true, data: updated[0] };
    } catch (error) {
      console.error("[TransactionModel.extend]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Return a book ─────────────────────────────────────
async returnBook(id) {
    try {
      const [transaction] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (!transaction.length)                    return { success: false, error: "Transaction not found" };
      if (transaction[0].status === "Returned")   return { success: false, error: "Book already returned" };

      const returnDate = localDateStr();
      
      // 1. Mark specific copy available again
      await pool.query(
        `UPDATE book_copies SET status = 'Available' 
         WHERE book_id = ? AND accession_number = ?`,
        [transaction[0].book_id, transaction[0].accession_number]
      );

      // 2. Mark transaction returned
      await pool.query(
        `UPDATE borrowed_books SET status = 'Returned', return_date = ? WHERE id = ?`,
        [returnDate, id]
      );

      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession, t.accession_number
        FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);

      console.log(`✅ Returned: ${rows[0].book_title} (${rows[0].accession_number})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.returnBook]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Delete ────────────────────────────────────────────
  async delete(id) {
    try {
      const [transaction] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (!transaction.length) return { success: false, error: "Transaction not found" };

      if (transaction[0].status === "Borrowed") {
        await pool.query(
          "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
          [transaction[0].book_id]
        );
      }
      await pool.query("DELETE FROM borrowed_books WHERE id = ?", [id]);
      return { success: true, data: transaction[0] };
    } catch (error) {
      console.error("[TransactionModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getStats() {
    try {
      const [[{ total }]]    = await pool.query("SELECT COUNT(*) AS total FROM borrowed_books");
      const [[{ active }]]   = await pool.query("SELECT COUNT(*) AS active FROM borrowed_books WHERE status = 'Borrowed'");
      const [[{ returned }]] = await pool.query("SELECT COUNT(*) AS returned FROM borrowed_books WHERE status = 'Returned'");
      const [[{ overdue }]]  = await pool.query("SELECT COUNT(*) AS overdue FROM borrowed_books WHERE status = 'Borrowed' AND due_date < CURDATE()");
      return { success: true, data: { total, active, returned, overdue } };
    } catch (error) {
      console.error("[TransactionModel.getStats]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Mark fine as paid ────────────────────────────────
  async payFine(id) {
    try {
      const [rows] = await pool.query("SELECT * FROM borrowed_books WHERE id = ?", [id]);
      if (!rows.length) return { success: false, error: "Transaction not found" };

      // Compute the fine amount at time of payment and store it
      const t = rows[0];
      let fineAmount = 0;
      if (t.due_date) {
        const refDate  = t.status === "Returned" && t.return_date ? t.return_date : localDateStr();
        const daysLate = Math.max(0, Math.floor(
          (new Date(refDate) - new Date(t.due_date)) / (1000 * 60 * 60 * 24)
        ));
        fineAmount = daysLate * FINE_PER_DAY;
      }

      await pool.query(
        `UPDATE borrowed_books SET fine_paid = 1, fine_amount = ? WHERE id = ?`,
        [fineAmount, id]
      );

      const [updated] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession,
               ${FINE_SQL}
        FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id
        WHERE t.id = ?
      `, [id]);

      console.log(`✅ Fine paid: transaction ${id} — ₱${fineAmount}`);
      return { success: true, data: updated[0] };
    } catch (error) {
      console.error("[TransactionModel.payFine]", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = TransactionModel;