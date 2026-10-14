// ─────────────────────────────────────────────────────────
//  models/Transaction.js
//
//  CONSOLIDATION + SCOPING:
//    • lookupStudent reads student USERS (students table retired)
//      and is school-scoped — a scoped operator cannot find a
//      student patron of another school ("not found", no leak).
//      searchFaculty is deliberately UNSCOPED (faculty may borrow
//      at any school — patron rule).
//    • The loans list scopes through the borrowed book's category
//      assignments (bookAccess physical scope).
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");
const { physicalBookScopeSql } = require("../features/organization/bookAccess.service");

// Returns today's date as "YYYY-MM-DD" in local server time.
function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const FINE_PER_DAY = 5; // ₱5 per day overdue

// Compute fine SQL fragment — used in every SELECT.
const FINE_SQL = `
  CASE
    WHEN t.status = 'Returned' THEN
      GREATEST(0, DATEDIFF(t.return_date, t.due_date)) * ${FINE_PER_DAY}
    WHEN t.due_date < CURDATE() THEN
      DATEDIFF(CURDATE(), t.due_date) * ${FINE_PER_DAY}
    ELSE 0
  END AS computed_fine
`;

// Full SELECT fragment reused across queries
const SELECT_FULL = `
  SELECT t.*, b.title AS book_title, b.author AS book_author,
         b.accessionNumber AS book_accession,
         ${FINE_SQL}
  FROM borrowed_books t
  LEFT JOIN books b ON t.book_id = b.id
  WHERE t.deleted_at IS NULL
`;

const TransactionModel = {

  /** Loans list — scoped through the borrowed book's scope. */
  async getAll(scope = null) {
    try {
      const bookScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(
        `${SELECT_FULL} ${bookScope.sql} ORDER BY t.borrow_date DESC`,
        bookScope.params
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getById(id, scope = null) {
    try {
      const bookScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(
        `${SELECT_FULL} ${bookScope.sql} AND t.id = ?`, [...bookScope.params, id]
      );
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

  async getActiveBorrows(scope = null) {
    try {
      const bookScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author,
               b.accessionNumber AS book_accession
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed' ${bookScope.sql}
        ORDER BY t.due_date ASC
      `, bookScope.params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getActiveBorrows]", error.message);
      return { success: false, error: error.message };
    }
  },

  async getOverdueBorrows(scope = null) {
    try {
      const bookScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(`
        SELECT t.*, b.title AS book_title, b.author AS book_author
        FROM borrowed_books t
        LEFT JOIN books b ON t.book_id = b.id
        WHERE t.status = 'Borrowed' AND t.due_date < CURDATE() ${bookScope.sql}
        ORDER BY t.due_date ASC
      `, bookScope.params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.getOverdueBorrows]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Look up student patron by ID number ─────────────────
  // Reads student USERS (students table retired) and is
  // school-scoped: an out-of-scope student is simply "not found".
  async lookupStudent(studentIdNumber, scope = null) {
    try {
      const exactParams = [studentIdNumber];
      let exactScope = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        exactScope = "AND (school_id = ? OR school_id IS NULL)";
        exactParams.push(scope.schoolId);
      }
      const [exact] = await pool.query(
        `SELECT student_id_number, full_name AS student_name, full_name,
                student_course, student_yr_level, student_contact, student_email
         FROM users
         WHERE student_id_number = ? AND role = 'student' AND is_active = 1
         ${exactScope}
         LIMIT 1`,
        exactParams
      );
      if (exact.length) return { success: true, data: exact[0], multiple: false };

      const likeParams = [`%${studentIdNumber}%`, `%${studentIdNumber}%`, `%${studentIdNumber}%`];
      let likeScope = "";
      if (scope && scope.scoped && scope.schoolId != null) {
        likeScope = "AND (school_id = ? OR school_id IS NULL)";
        likeParams.push(scope.schoolId);
      }
      const [rows] = await pool.query(
        `SELECT student_id_number, full_name AS student_name, full_name,
                student_course, student_yr_level, student_contact, student_email
         FROM users
         WHERE (student_id_number LIKE ? OR full_name LIKE ? OR username LIKE ?)
           AND role = 'student' AND is_active = 1
         ${likeScope}
         LIMIT 10`,
        likeParams
      );

      if (!rows.length) return { success: false, error: "Student not found" };
      return { success: true, data: rows, multiple: rows.length > 1 };
    } catch (error) {
      console.error("[TransactionModel.lookupStudent]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Look up faculty by name ───────────────────────────
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

  // ── Search available books ────────────────────────────
  async searchBooks(query, scope = null) {
    try {
      const t = `%${query}%`;
      const bookScope = physicalBookScopeSql(scope);
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
          (b.title LIKE ? OR b.accessionNumber LIKE ? OR cc.accession_list LIKE ?)
          AND COALESCE(cc.avail_copies, b.quantity) > 0
          ${bookScope.sql}
        ORDER BY b.title ASC
        LIMIT 10`,
        [t, t, t, ...bookScope.params]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[TransactionModel.searchBooks]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Active borrow count for a borrower ───────────────
  async getActiveBorrowCount(borrowerIdNumber, borrowerName) {
    try {
      let rows;
      if (borrowerIdNumber) {
        [rows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM borrowed_books
           WHERE borrower_id_number = ? AND status = 'Borrowed'
             AND deleted_at IS NULL`,
          [borrowerIdNumber]
        );
      } else {
        [rows] = await pool.query(
          `SELECT COUNT(*) AS cnt FROM borrowed_books
           WHERE borrower_name = ? AND borrower_id_number IS NULL AND status = 'Borrowed'
             AND deleted_at IS NULL`,
          [borrowerName]
        );
      }
      return { success: true, count: Number(rows[0].cnt) };
    } catch (error) {
      console.error("[TransactionModel.getActiveBorrowCount]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Create transaction (single book borrow) ──────────
  // FIX: was using `book` before declaring it (ReferenceError crash).
  // FIX: wrapped in a DB transaction so copy status + quantity stay in sync.
  async create(transactionData) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        book_id, accession_number, borrower_name, borrower_id_number,
        borrower_contact, borrower_email,
        borrower_course, borrower_yr_level,
        borrower_type,
        borrow_date, due_date,
      } = transactionData;

      // 1. Fetch book FIRST (was referenced before declaration in original)
      const [book] = await conn.query(
        "SELECT * FROM books WHERE id = ? FOR UPDATE", [book_id]
      );
      if (!book.length) {
        await conn.rollback();
        return { success: false, error: "Book not found" };
      }

      // 2. Resolve which copy to borrow
      let useAccession = accession_number || null;

      if (useAccession) {
        // Verify the requested copy is still available
        const [copyCheck] = await conn.query(
          `SELECT id FROM book_copies
           WHERE book_id = ? AND accession_number = ? AND status = 'Available'
           LIMIT 1`,
          [book_id, useAccession]
        );
        if (!copyCheck.length) {
          await conn.rollback();
          return { success: false, error: `Copy ${useAccession} is not available` };
        }
      } else {
        // Auto-select the first available copy
        const [available] = await conn.query(
          `SELECT accession_number FROM book_copies
           WHERE book_id = ? AND status = 'Available'
           ORDER BY accession_number LIMIT 1`,
          [book_id]
        );
        if (available.length) {
          useAccession = available[0].accession_number;
        } else if (book[0].accessionNumber) {
          // No copies table entries — fall back to books.accessionNumber
          useAccession = book[0].accessionNumber;
        } else {
          await conn.rollback();
          return { success: false, error: "No available copy found for this book" };
        }
      }

      // 3. Check availability via quantity
      if (book[0].quantity <= 0) {
        await conn.rollback();
        return { success: false, error: "Book is not available (out of stock)" };
      }

      // 4. Enforce max 2 active borrows — students only, faculty are unlimited
      if ((borrower_type || "student") === "student") {
        const countResult = await this.getActiveBorrowCount(borrower_id_number, borrower_name);
        // Fail-closed: if the count query errors, block the borrow rather
        // than silently skipping the limit check (was fail-open before).
        if (!countResult.success) {
          await conn.rollback();
          return { success: false, error: "Could not verify borrower's active borrow count" };
        }
        if (countResult.count >= 2) {
          await conn.rollback();
          return { success: false, error: "Borrower already has 2 books borrowed (maximum reached)" };
        }
      }

      // 5. Mark specific copy as Borrowed
      await conn.query(
        `UPDATE book_copies SET status = 'Borrowed'
         WHERE book_id = ? AND accession_number = ?`,
        [book_id, useAccession]
      );

      // 6. Decrement quantity
      await conn.query(
        "UPDATE books SET quantity = quantity - 1 WHERE id = ?",
        [book_id]
      );

      // 7. Insert transaction record
      const [result] = await conn.query(
        `INSERT INTO borrowed_books
           (book_id, accession_number, borrower_name, borrower_id_number, borrower_contact,
            borrower_email, borrower_course, borrower_yr_level, borrower_type,
            borrow_date, due_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Borrowed')`,
        [
          book_id, useAccession, borrower_name, borrower_id_number || null,
          borrower_contact || null, borrower_email || null,
          borrower_course || null, borrower_yr_level || null,
          borrower_type || "student",
          borrow_date || localDateStr(),
          due_date,
        ]
      );

      await conn.commit();

      const [rows] = await pool.query(
        `${SELECT_FULL} AND t.id = ?`, [result.insertId]
      );

      console.log(`✅ Borrowed: "${book[0].title}" (${useAccession}) by ${borrower_name}`);
      return { success: true, data: rows[0] };
    } catch (error) {
      await conn.rollback();
      console.error("[TransactionModel.create]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Update transaction metadata (borrower details / dates) ──
  async update(id, data, scope = null) {
    try {
      const {
        borrower_name, borrower_id_number, borrower_contact,
        borrower_email, borrower_course, borrower_yr_level,
        borrow_date, due_date,
      } = data;

      // School scope: the loan must belong to the caller's school.
      const checkScope = physicalBookScopeSql(scope);
      const [existing] = await pool.query(
        `SELECT t.id FROM borrowed_books t
         LEFT JOIN books b ON t.book_id = b.id
         WHERE t.id = ? ${checkScope.sql} LIMIT 1`,
        [id, ...checkScope.params]
      );
      if (!existing.length) return { success: false, error: "Transaction not found" };

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

      const [rows] = await pool.query(`${SELECT_FULL} AND t.id = ?`, [id]);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[TransactionModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Extend due date ───────────────────────────────────
  async extend(id, days = 1, scope = null) {
    try {
      const checkScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(
        `SELECT t.id FROM borrowed_books t
         LEFT JOIN books b ON t.book_id = b.id
         WHERE t.id = ? ${checkScope.sql} LIMIT 1`,
        [id, ...checkScope.params]
      );
      if (!rows.length)                  return { success: false, error: "Transaction not found" };

      const [statusRows] = await pool.query(
        "SELECT status FROM borrowed_books WHERE id = ?", [id]
      );
      if (statusRows[0].status === "Returned") return { success: false, error: "Cannot extend a returned book" };

      await pool.query(
        `UPDATE borrowed_books
         SET due_date = DATE_ADD(due_date, INTERVAL ? DAY)
         WHERE id = ?`,
        [days, id]
      );

      const [updated] = await pool.query(`${SELECT_FULL} AND t.id = ?`, [id]);
      console.log(`✅ Extended transaction ${id} by ${days} day(s)`);
      return { success: true, data: updated[0] };
    } catch (error) {
      console.error("[TransactionModel.extend]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Return a book ─────────────────────────────────────
  // FIX: original never restored books.quantity on return — stock leaked forever.
  // FIX: now wrapped in DB transaction to keep copies + quantity in sync.
  // FIX: final SELECT now includes FINE_SQL so computed_fine is populated.
  async returnBook(id, scope = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const checkScope = physicalBookScopeSql(scope);
      const [scoped] = await conn.query(
        `SELECT t.id FROM borrowed_books t
         LEFT JOIN books b ON t.book_id = b.id
         WHERE t.id = ? ${checkScope.sql} LIMIT 1`,
        [id, ...checkScope.params]
      );
      if (!scoped.length) {
        await conn.rollback();
        return { success: false, error: "Transaction not found" };
      }

      const [transaction] = await conn.query(
        "SELECT * FROM borrowed_books WHERE id = ? FOR UPDATE", [id]
      );
      if (!transaction.length) {
        await conn.rollback();
        return { success: false, error: "Transaction not found" };
      }
      if (transaction[0].status === "Returned") {
        await conn.rollback();
        return { success: false, error: "Book already returned" };
      }

      const returnDate = localDateStr();

      // 1. Mark specific copy as Available again
      await conn.query(
        `UPDATE book_copies SET status = 'Available'
         WHERE book_id = ? AND accession_number = ?`,
        [transaction[0].book_id, transaction[0].accession_number]
      );

      // 2. Restore quantity on the books table
      await conn.query(
        "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
        [transaction[0].book_id]
      );

      // 3. Mark transaction as returned
      await conn.query(
        "UPDATE borrowed_books SET status = 'Returned', return_date = ? WHERE id = ?",
        [returnDate, id]
      );

      await conn.commit();

      // 4. Re-fetch with full FINE_SQL so computed_fine is populated
      const [rows] = await pool.query(`${SELECT_FULL} AND t.id = ?`, [id]);

      console.log(`✅ Returned: ${rows[0].book_title} (${rows[0].accession_number})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      await conn.rollback();
      console.error("[TransactionModel.returnBook]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── Delete transaction ────────────────────────────────
  // Restores book stock (if still borrowed) then soft-deletes via TrashModel.
  async delete(id, scope = null) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const checkScope = physicalBookScopeSql(scope);
      const [scoped] = await conn.query(
        `SELECT t.id FROM borrowed_books t
         LEFT JOIN books b ON t.book_id = b.id
         WHERE t.id = ? ${checkScope.sql} LIMIT 1`,
        [id, ...checkScope.params]
      );
      if (!scoped.length) {
        await conn.rollback();
        return { success: false, error: "Transaction not found" };
      }

      const [transaction] = await conn.query(
        "SELECT * FROM borrowed_books WHERE id = ?", [id]
      );
      if (!transaction.length) {
        await conn.rollback();
        return { success: false, error: "Transaction not found" };
      }

      const txn = transaction[0];

      // If still borrowed, restore stock atomically before soft-deleting
      if (txn.status === "Borrowed") {
        if (txn.accession_number) {
          await conn.query(
            `UPDATE book_copies SET status = 'Available'
             WHERE book_id = ? AND accession_number = ?`,
            [txn.book_id, txn.accession_number]
          );
        }
        await conn.query(
          "UPDATE books SET quantity = quantity + 1 WHERE id = ?",
          [txn.book_id]
        );
      }

      // Snapshot the borrowed book's school onto the trash entry.
      const [schoolRow] = await conn.query(
        `SELECT d.school_id
         FROM book_category_assignments a
         JOIN categories c  ON c.id = a.category_id AND c.deleted_at IS NULL
         JOIN departments d ON d.id = c.department_id
         WHERE a.book_id = ?
         LIMIT 1`,
        [txn.book_id]
      );

      await conn.commit();
      conn.release();

      // Soft-delete via TrashModel
      const TrashModel = require("./Trash");
      return TrashModel.softDelete("transaction", Number(id), null, schoolRow[0]?.school_id ?? null);
    } catch (error) {
      await conn.rollback();
      console.error("[TransactionModel.delete]", error.message);
      return { success: false, error: error.message };
    } finally {
      // Only release if not already released above
      try { conn.release(); } catch (_) {}
    }
  },

  async getStats(scope = null) {
    try {
      const bookScope = physicalBookScopeSql(scope);
      const join = `FROM borrowed_books t LEFT JOIN books b ON t.book_id = b.id WHERE 1=1 ${bookScope.sql}`;
      const [[{ total }]]    = await pool.query(`SELECT COUNT(*) AS total ${join}`, bookScope.params);
      const [[{ active }]]   = await pool.query(`SELECT COUNT(*) AS active ${join} AND t.status = 'Borrowed'`, bookScope.params);
      const [[{ returned }]] = await pool.query(`SELECT COUNT(*) AS returned ${join} AND t.status = 'Returned'`, bookScope.params);
      const [[{ overdue }]]  = await pool.query(`SELECT COUNT(*) AS overdue ${join} AND t.status = 'Borrowed' AND t.due_date < CURDATE()`, bookScope.params);
      return { success: true, data: { total, active, returned, overdue } };
    } catch (error) {
      console.error("[TransactionModel.getStats]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── Mark fine as paid ─────────────────────────────────
  async payFine(id, scope = null) {
    try {
      const checkScope = physicalBookScopeSql(scope);
      const [rows] = await pool.query(
        `${SELECT_FULL} ${checkScope.sql} AND t.id = ? LIMIT 1`,
        [...checkScope.params, id]
      );
      if (!rows.length) return { success: false, error: "Transaction not found" };

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
        "UPDATE borrowed_books SET fine_paid = 1, fine_amount = ? WHERE id = ?",
        [fineAmount, id]
      );

      const [updated] = await pool.query(`${SELECT_FULL} AND t.id = ?`, [id]);
      console.log(`✅ Fine paid: transaction ${id} — ₱${fineAmount}`);
      return { success: true, data: updated[0] };
    } catch (error) {
      console.error("[TransactionModel.payFine]", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = TransactionModel;