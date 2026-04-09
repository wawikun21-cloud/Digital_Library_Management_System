// ─────────────────────────────────────────────────────────
//  models/Book.js
//  Book Model — MySQL CRUD + Copies support
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");
const TrashModel = require("./Trash");

// Reusable SELECT fragment with live copy counts
const BOOK_SELECT = `
  SELECT
    b.*,
    COALESCE(cc.total_copies,    b.quantity) AS quantity,
    COALESCE(cc.total_copies,    b.quantity) AS total_copies,
    COALESCE(cc.avail_copies,    b.quantity) AS available_copies,
    COALESCE(cc.borrowed_copies, 0)          AS borrowed_copies,
    cc.accession_list,
    CASE
      WHEN cc.total_copies IS NULL THEN b.status
      WHEN cc.avail_copies = 0     THEN 'OutOfStock'
      ELSE 'Available'
    END AS display_status
  FROM books b
  LEFT JOIN (
    SELECT
      book_id,
      COUNT(*)                                        AS total_copies,
      SUM(status = 'Available')                       AS avail_copies,
      SUM(status = 'Borrowed')                        AS borrowed_copies,
      GROUP_CONCAT(accession_number ORDER BY accession_number SEPARATOR ', ') AS accession_list
    FROM book_copies
    GROUP BY book_id
  ) cc ON cc.book_id = b.id
`;

const BookModel = {

  // ── GET ALL ───────────────────────────────────────────
  async getAll() {
    try {
      const [rows] = await pool.query(
        `${BOOK_SELECT} WHERE b.deleted_at IS NULL ORDER BY b.created_at DESC`
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET BY ID ─────────────────────────────────────────
  async getById(id) {
    try {
      const [rows] = await pool.query(
        `${BOOK_SELECT} WHERE b.id = ? AND b.deleted_at IS NULL`, [id]
      );
      if (!rows.length) return { success: false, error: "Book not found" };

      const [copies] = await pool.query(
        `SELECT id, accession_number, status, date_acquired, condition_notes
         FROM book_copies WHERE book_id = ? ORDER BY accession_number`,
        [id]
      );

      return { success: true, data: { ...rows[0], copies } };
    } catch (error) {
      console.error("[BookModel.getById]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET COPIES FOR A BOOK ─────────────────────────────
  async getCopies(bookId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, accession_number, status, date_acquired, condition_notes
         FROM book_copies WHERE book_id = ? ORDER BY accession_number`,
        [bookId]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getCopies]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── SEARCH ────────────────────────────────────────────
  async search(query) {
    try {
      const t = `%${query}%`;
      const [rows] = await pool.query(
        `${BOOK_SELECT}
         WHERE b.deleted_at IS NULL AND (b.title LIKE ? OR b.author LIKE ? OR b.genre LIKE ?
            OR b.isbn LIKE ? OR b.accessionNumber LIKE ? OR cc.accession_list LIKE ?)
         ORDER BY b.title ASC`,
        [t, t, t, t, t, t]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.search]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── FILTER ────────────────────────────────────────────
  // FIX: OutOfStock filter now uses the derived display_status (from copy counts)
  // instead of filtering on the raw books.status column, which is often stale.
  async filter(status, genre) {
    try {
      let q = `${BOOK_SELECT} WHERE b.deleted_at IS NULL AND 1=1`;
      const params = [];

      if (status && status !== "All") {
        if (status === "OutOfStock") {
          // Match books where all copies are borrowed OR quantity is 0
          q += ` AND (
            (cc.total_copies IS NOT NULL AND cc.avail_copies = 0)
            OR (cc.total_copies IS NULL AND (b.quantity = 0 OR b.status = 'OutOfStock'))
          )`;
        } else if (status === "Available") {
          q += ` AND (
            (cc.total_copies IS NOT NULL AND cc.avail_copies > 0)
            OR (cc.total_copies IS NULL AND b.quantity > 0 AND b.status = 'Available')
          )`;
        } else {
          q += " AND b.status = ?";
          params.push(status);
        }
      }

      if (genre) {
        q += " AND b.genre = ?";
        params.push(genre);
      }

      q += " ORDER BY b.created_at DESC";

      const [rows] = await pool.query(q, params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.filter]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── CREATE (single book, no copies) ──────────────────
  async create(bookData) {
    try {
      const {
        title, subtitle = null, author = null, authors = null,
        genre = null, isbn = null, issn = null, lccn = null,
        accessionNumber = null, callNumber = null,
        year = null, date = null, publisher = null,
        edition = null, materialType = "Book", subtype = null,
        extent = null, size = null, volume = null,
        authorName = null, authorDates = null, place = null,
        description = null, otherDetails = null,
        shelf = null, pages = null, collection = null,
        status = "Available", cover = null,
        quantity = null,
        sublocation = null,
      } = bookData;

      const qty = quantity != null ? Number(quantity) : null;
      const finalStatus = qty === 0 ? "OutOfStock" : status;

      const [result] = await pool.query(
        `INSERT INTO books (
          title, subtitle, author, authors, genre, isbn, issn, lccn,
          accessionNumber, callNumber, year, date, publisher, edition,
          materialType, subtype, extent, size, volume, authorName, authorDates,
          place, description, otherDetails, shelf, pages, collection,
          status, cover, quantity, sublocation
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          title, subtitle, author || authors, authors,
          genre, isbn, issn, lccn,
          accessionNumber, callNumber, year || date, date,
          publisher, edition, materialType, subtype,
          extent, size, volume, authorName, authorDates,
          place, description, otherDetails,
          shelf, pages, collection,
          finalStatus, cover, qty,
          sublocation,
        ]
      );

      const [rows] = await pool.query("SELECT * FROM books WHERE id = ?", [result.insertId]);
      console.log(`✅ Book added: "${title}" (ID: ${result.insertId})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[BookModel.create]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── IMPORT WITH COPIES (bulk import) ─────────────────
  async importWithCopies(bookData) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const {
        title, subtitle = null, author = null, authors = null,
        genre = null, isbn = null, issn = null, lccn = null,
        callNumber = null, year = null, date = null,
        publisher = null, edition = null,
        materialType = "Book", subtype = null,
        extent = null, size = null, volume = null,
        authorName = null, authorDates = null, place = null,
        description = null, otherDetails = null,
        shelf = null, pages = null, collection = null,
        cover = null,
        accessionNumbers = [],
        dateAcquired = null,
        sublocation = null,
      } = bookData;

      // 1. Find existing book by ISBN → title+author → title only
      let bookId = null;

      if (isbn) {
        const [existing] = await conn.query(
          "SELECT id FROM books WHERE isbn = ? AND deleted_at IS NULL LIMIT 1", [isbn]
        );
        if (existing.length) bookId = existing[0].id;
      }

      if (!bookId) {
        const authorVal = (author || authors || "").trim();
        if (authorVal) {
          const [existing] = await conn.query(
            `SELECT id FROM books
             WHERE LOWER(TRIM(title)) = LOWER(TRIM(?))
               AND LOWER(TRIM(COALESCE(author,''))) = LOWER(?) LIMIT 1`,
            [title, authorVal]
          );
          if (existing.length) bookId = existing[0].id;
        }
      }

      if (!bookId) {
        const [existing] = await conn.query(
          "SELECT id FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1",
          [title]
        );
        if (existing.length) bookId = existing[0].id;
      }

      // 2. Insert book if new
      const isNewBook = !bookId;
      if (isNewBook) {
        const authorVal = author || authors || null;
        const [result] = await conn.query(
          `INSERT INTO books (
            title, subtitle, author, authors, genre, isbn, issn, lccn,
            accessionNumber, callNumber, year, date, publisher, edition,
            materialType, subtype, extent, size, volume, authorName, authorDates,
            place, description, otherDetails, shelf, pages, collection,
            status, cover, quantity, sublocation
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            title, subtitle, authorVal, authorVal,
            genre, isbn, issn, lccn,
            accessionNumbers[0] || null,
            callNumber, year || date, date,
            publisher, edition, materialType, subtype,
            extent, size, volume, authorName, authorDates,
            place, description, otherDetails,
            shelf, pages, collection,
            "Available", cover,
            accessionNumbers.length || null,
            sublocation,
          ]
        );
        bookId = result.insertId;
      }

      // 3. Insert each copy, skip duplicates
      const insertedCopies = [];
      const skippedCopies  = [];

      for (const accNo of accessionNumbers) {
        if (!accNo || !accNo.trim()) continue;
        const acc = accNo.trim();

        const [dup] = await conn.query(
          "SELECT id FROM book_copies WHERE accession_number = ? LIMIT 1", [acc]
        );
        if (dup.length) {
          skippedCopies.push({ accession: acc, reason: "Duplicate accession number" });
          continue;
        }

        let da = null;
        if (dateAcquired) {
          try { da = new Date(dateAcquired).toISOString().split("T")[0]; } catch (_) {}
        }

        await conn.query(
          `INSERT INTO book_copies (book_id, accession_number, status, date_acquired)
           VALUES (?, ?, 'Available', ?)`,
          [bookId, acc, da]
        );
        insertedCopies.push(acc);
      }

      // 4. Sync quantity to actual copy count
      await conn.query(
        `UPDATE books
         SET quantity       = (SELECT COUNT(*) FROM book_copies WHERE book_id = ?),
             accessionNumber = (SELECT accession_number FROM book_copies
                                WHERE book_id = ? ORDER BY accession_number LIMIT 1)
         WHERE id = ?`,
        [bookId, bookId, bookId]
      );

      await conn.commit();

      const [bookRows] = await conn.query("SELECT * FROM books WHERE id = ?", [bookId]);
      const [copies]   = await conn.query(
        `SELECT id, accession_number, status, date_acquired
         FROM book_copies WHERE book_id = ? ORDER BY accession_number`,
        [bookId]
      );

      console.log(`✅ Imported: "${title}" — ${insertedCopies.length} copies (book_id: ${bookId})`);
      if (skippedCopies.length) {
        console.log(`  ⏭️  Skipped ${skippedCopies.length} duplicate accessions`);
      }

      return {
        success: true,
        isNewBook,
        data:          { ...bookRows[0], copies },
        insertedCopies,
        skippedCopies,
      };
    } catch (error) {
      await conn.rollback();
      console.error("[BookModel.importWithCopies]", error.message);
      return { success: false, error: error.message };
    } finally {
      conn.release();
    }
  },

  // ── UPDATE ────────────────────────────────────────────
  // FIX: no longer blindly overwrites quantity from form data when copies exist.
  // If book_copies rows exist for this book, quantity is re-derived from them.
  async update(id, bookData) {
    try {
      const {
        title, subtitle = null, author = null, authors = null,
        genre = null, isbn = null, issn = null, lccn = null,
        accessionNumber = null, callNumber = null,
        year = null, date = null, publisher = null,
        edition = null, materialType = null, subtype = null,
        extent = null, size = null, volume = null,
        authorName = null, authorDates = null, place = null,
        description = null, otherDetails = null,
        shelf = null, pages = null, collection = null,
        status = "Available", cover = null, quantity = null,
        sublocation = null,
      } = bookData;

      const [current] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      if (!current.length) return { success: false, error: "Book not found" };

      // Check whether this book has copy rows; if so, use the live count
      const [[{ copyCount }]] = await pool.query(
        "SELECT COUNT(*) AS copyCount FROM book_copies WHERE book_id = ?", [id]
      );

      let qty;
      if (copyCount > 0) {
        // Copies table is the source of truth — recount available copies
        const [[{ availCount }]] = await pool.query(
          "SELECT SUM(status = 'Available') AS availCount FROM book_copies WHERE book_id = ?",
          [id]
        );
        qty = Number(availCount);
      } else {
        // No copies table — use form value or keep existing
        qty = quantity != null ? Number(quantity) : current[0].quantity;
      }

      const finalStatus = qty === 0 ? "OutOfStock" : (status || current[0].status);

      await pool.query(
        `UPDATE books SET
          title=?, subtitle=?, author=?, authors=?, genre=?, isbn=?, issn=?, lccn=?,
          accessionNumber=?, callNumber=?, year=?, date=?, publisher=?, edition=?,
          materialType=?, subtype=?, extent=?, size=?, volume=?,
          authorName=?, authorDates=?, place=?, description=?, otherDetails=?,
          shelf=?, pages=?, collection=?, status=?, cover=?, quantity=?,
          sublocation=?
         WHERE id=?`,
        [
          title, subtitle, author || authors, authors,
          genre, isbn, issn, lccn,
          accessionNumber, callNumber, year || date, date,
          publisher, edition, materialType, subtype,
          extent, size, volume, authorName, authorDates,
          place, description, otherDetails,
          shelf, pages, collection, finalStatus, cover, qty,
          sublocation,
          id,
        ]
      );

      const [rows] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      console.log(`✅ Book updated: "${title}" (ID: ${id})`);
      return { success: true, data: rows[0] };
    } catch (error) {
      console.error("[BookModel.update]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── DELETE (Soft-Delete) ────────────────────────────────
  async delete(id) {
    try {
      const result = await TrashModel.softDelete("book", id);
      return result;
    } catch (error) {
      console.error("[BookModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET COUNT ─────────────────────────────────────────
  async getCount() {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) as count FROM books WHERE deleted_at IS NULL");
      return { success: true, count: rows[0].count };
    } catch (error) {
      console.error("[BookModel.getCount]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET DASHBOARD STATS ───────────────────────────────
  async getStats() {
    try {
      const [[{ total }]]      = await pool.query("SELECT COUNT(*) AS total FROM books WHERE deleted_at IS NULL");
      const [[{ outOfStock }]] = await pool.query(
        "SELECT COUNT(*) AS outOfStock FROM books WHERE deleted_at IS NULL AND (status = 'OutOfStock' OR quantity = 0)"
      );
      const [[{ returned }]]   = await pool.query(
        "SELECT COUNT(*) AS returned FROM borrowed_books WHERE status = 'Returned'"
      );
      return {
        success: true,
        data: {
          nemco: { total: Number(total), outOfStock: Number(outOfStock), returned: Number(returned) },
        },
      };
    } catch (error) {
      console.error("[BookModel.getStats]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET BY STATUS ─────────────────────────────────────
  async getByStatus(status) {
    try {
      const [rows] = await pool.query(
        "SELECT * FROM books WHERE status = ? ORDER BY title ASC", [status]
      );
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getByStatus]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── BATCH DUPLICATE CHECK ─────────────────────────────
  async checkDuplicatesBatch(books) {
    try {
      if (!Array.isArray(books) || books.length === 0) {
        return { success: true, duplicateTitles: [], duplicateAccessions: [] };
      }

      const titles       = books.map(b => b.title).filter(Boolean);
      const allAccessions = books.flatMap(b => (b.accessionNumbers || [])).filter(Boolean);

      const duplicateTitles     = [];
      const duplicateAccessions = [];

      if (titles.length > 0) {
        const placeholders = titles.map(() => "?").join(",");
        const [titleMatches] = await pool.query(
          `SELECT id, title FROM books WHERE LOWER(TRIM(title)) IN (${placeholders})`,
          titles.map(t => t.toLowerCase().trim())
        );
        for (const match of titleMatches) {
          const book = books.find(
            b => b.title.toLowerCase().trim() === match.title.toLowerCase().trim()
          );
          if (book) duplicateTitles.push({ title: book.title, existingId: match.id });
        }
      }

      if (allAccessions.length > 0) {
        const placeholders = allAccessions.map(() => "?").join(",");
        const [accMatches] = await pool.query(
          `SELECT accession_number, book_id FROM book_copies
           WHERE accession_number IN (${placeholders})`,
          allAccessions
        );
        for (const match of accMatches) {
          const book = books.find(
            b => (b.accessionNumbers || []).includes(match.accession_number)
          );
          if (book) {
            duplicateAccessions.push({
              accession:     match.accession_number,
              book:          book.title,
              existingBookId: match.book_id,
            });
          }
        }
      }

      return {
        success: true,
        hasDuplicates: duplicateTitles.length > 0 || duplicateAccessions.length > 0,
        duplicateTitles,
        duplicateAccessions,
      };
    } catch (error) {
      console.error("[BookModel.checkDuplicatesBatch]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── BULK IMPORT ───────────────────────────────────────
  // FIX: removed the outer getConnection/beginTransaction wrapper.
  // importWithCopies() manages its own transaction per book — wrapping it in
  // another outer transaction on a different connection had no effect and
  // wasted a connection.
  async bulkImport(books) {
    try {
      const results = [];
      const errors  = [];

      for (const bookData of books) {
        const result = await this.importWithCopies(bookData);
        if (result.success) {
          results.push(result);
        } else {
          errors.push({ title: bookData.title || "Unknown", error: result.error });
        }
      }

      return {
        success:      true,
        imported:     results.filter(r =>  r.isNewBook).length,
        updated:      results.filter(r => !r.isNewBook).length,
        errors:       errors.length,
        data:         results.map(r => r.data),
        errorsDetail: errors,
      };
    } catch (error) {
      console.error("[BookModel.bulkImport]", error.message);
      return { success: false, error: error.message };
    }
  },
};

module.exports = BookModel;