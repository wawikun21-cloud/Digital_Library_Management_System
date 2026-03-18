// ─────────────────────────────────────────────────────────
//  models/Book.js
//  Book Model — MySQL CRUD + Copies support
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const BookModel = {

  // ── GET ALL (with copy counts + accessions) ────────────
  async getAll() {
    try {
      const [rows] = await pool.query(`
        SELECT
          b.*,
          COALESCE(cc.total_copies,   b.quantity) AS quantity,
          COALESCE(cc.total_copies,   b.quantity) AS total_copies,
          COALESCE(cc.avail_copies,   0)          AS available_copies,
          COALESCE(cc.borrowed_copies,0)          AS borrowed_copies,
          cc.accession_list
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
        ORDER BY b.created_at DESC
      `);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.getAll]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET BY ID (with copies array) ─────────────────────
  async getById(id) {
    try {
      const [rows] = await pool.query(`
        SELECT b.*,
          COALESCE(cc.total_copies, b.quantity) AS quantity,
          cc.accession_list
        FROM books b
        LEFT JOIN (
          SELECT book_id,
            COUNT(*) AS total_copies,
            GROUP_CONCAT(accession_number ORDER BY accession_number SEPARATOR ', ') AS accession_list
          FROM book_copies GROUP BY book_id
        ) cc ON cc.book_id = b.id
        WHERE b.id = ?
      `, [id]);

      if (!rows.length) return { success: false, error: "Book not found" };

      // Also fetch individual copies
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

  // ── GET COPIES FOR A BOOK ──────────────────────────────
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
        `SELECT b.*,
           COALESCE(cc.total_copies, b.quantity) AS quantity,
           cc.accession_list
         FROM books b
         LEFT JOIN (
           SELECT book_id, COUNT(*) AS total_copies,
             GROUP_CONCAT(accession_number ORDER BY accession_number SEPARATOR ', ') AS accession_list
           FROM book_copies GROUP BY book_id
         ) cc ON cc.book_id = b.id
         WHERE b.title LIKE ? OR b.author LIKE ? OR b.genre LIKE ?
            OR b.isbn LIKE ? OR b.accessionNumber LIKE ? OR cc.accession_list LIKE ?
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
  async filter(status, genre) {
    try {
      let q = `SELECT b.*,
        COALESCE(cc.total_copies, b.quantity) AS quantity,
        cc.accession_list
        FROM books b
        LEFT JOIN (
          SELECT book_id, COUNT(*) AS total_copies,
            GROUP_CONCAT(accession_number ORDER BY accession_number SEPARATOR ', ') AS accession_list
          FROM book_copies GROUP BY book_id
        ) cc ON cc.book_id = b.id
        WHERE 1=1`;
      const params = [];

      if (status && status !== "All") { q += " AND b.status = ?"; params.push(status); }
      if (genre)                       { q += " AND b.genre = ?";  params.push(genre);  }
      q += " ORDER BY b.created_at DESC";

      const [rows] = await pool.query(q, params);
      return { success: true, data: rows };
    } catch (error) {
      console.error("[BookModel.filter]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── CREATE (single book, no copies) ───────────────────
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
      } = bookData;

      const qty = quantity != null ? Number(quantity) : null;
      const finalStatus = qty === 0 ? "OutOfStock" : status;

      const [result] = await pool.query(
        `INSERT INTO books (
          title, subtitle, author, authors, genre, isbn, issn, lccn,
          accessionNumber, callNumber, year, date, publisher, edition,
          materialType, subtype, extent, size, volume, authorName, authorDates,
          place, description, otherDetails, shelf, pages, collection,
          status, cover, quantity
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          title, subtitle, author || authors, authors,
          genre, isbn, issn, lccn,
          accessionNumber, callNumber, year || date, date,
          publisher, edition, materialType, subtype,
          extent, size, volume, authorName, authorDates,
          place, description, otherDetails,
          shelf, pages, collection,
          finalStatus, cover, qty,
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

  // ── IMPORT WITH COPIES (bulk import) ──────────────────
  // bookData.accessionNumbers = ["14023C1", "14024C2", ...]
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
        accessionNumbers = [],   // array of accession strings
        dateAcquired = null,
      } = bookData;

      // ── 1. Check if book already exists (by ISBN → title+author → title only) ──
      let bookId = null;

      // 1a. ISBN match (most reliable)
      if (isbn) {
        const [existing] = await conn.query(
          "SELECT id FROM books WHERE isbn = ? LIMIT 1", [isbn]
        );
        if (existing.length) bookId = existing[0].id;
      }

      // 1b. Title + author match
      if (!bookId) {
        const authorVal = (author || authors || "").trim();
        if (authorVal) {
          const [existing] = await conn.query(
            "SELECT id FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) AND LOWER(TRIM(COALESCE(author,''))) = LOWER(?) LIMIT 1",
            [title, authorVal]
          );
          if (existing.length) bookId = existing[0].id;
        }
      }

      // 1c. Title-only match (catches blank-author duplicates from Excel)
      if (!bookId) {
        const [existing] = await conn.query(
          "SELECT id FROM books WHERE LOWER(TRIM(title)) = LOWER(TRIM(?)) LIMIT 1",
          [title]
        );
        if (existing.length) bookId = existing[0].id;
      }

      // ── 2. Insert book if not exists ──────────────────────────────
      const isNewBook = !bookId;
      if (isNewBook) {
        const authorVal = author || authors || null;
        const [result] = await conn.query(
          `INSERT INTO books (
            title, subtitle, author, authors, genre, isbn, issn, lccn,
            accessionNumber, callNumber, year, date, publisher, edition,
            materialType, subtype, extent, size, volume, authorName, authorDates,
            place, description, otherDetails, shelf, pages, collection,
            status, cover, quantity
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            title, subtitle, authorVal, authorVal,
            genre, isbn, issn, lccn,
            accessionNumbers[0] || null,   // first accession as primary
            callNumber, year || date, date,
            publisher, edition, materialType, subtype,
            extent, size, volume, authorName, authorDates,
            place, description, otherDetails,
            shelf, pages, collection,
            "Available", cover,
            accessionNumbers.length || null,
          ]
        );
        bookId = result.insertId;
      }

      // ── 3. Insert each copy — skip duplicates ─────────────────────
      const insertedCopies = [];
      const skippedCopies  = [];

      for (const accNo of accessionNumbers) {
        if (!accNo || !accNo.trim()) continue;
        const acc = accNo.trim();

        // Check duplicate
        const [dup] = await conn.query(
          "SELECT id FROM book_copies WHERE accession_number = ? LIMIT 1", [acc]
        );
        if (dup.length) {
          skippedCopies.push({ accession: acc, reason: "Duplicate accession number" });
          continue;
        }

        // Parse date_acquired
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

      // ── 4. Update quantity to actual copy count ───────────────────
      await conn.query(
        `UPDATE books
         SET quantity      = (SELECT COUNT(*) FROM book_copies WHERE book_id = ?),
             accessionNumber = (SELECT accession_number FROM book_copies WHERE book_id = ? ORDER BY accession_number LIMIT 1)
         WHERE id = ?`,
        [bookId, bookId, bookId]
      );

      await conn.commit();

      // ── 5. Return full book + copies ──────────────────────────────
      const [bookRows] = await conn.query("SELECT * FROM books WHERE id = ?", [bookId]);
      const [copies]   = await conn.query(
        "SELECT id, accession_number, status, date_acquired FROM book_copies WHERE book_id = ? ORDER BY accession_number",
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
      } = bookData;

      const [current] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      if (!current.length) return { success: false, error: "Book not found" };

      const qty = quantity != null ? Number(quantity) : current[0].quantity;
      const finalStatus = qty === 0 ? "OutOfStock" : (status || current[0].status);

      await pool.query(
        `UPDATE books SET
          title=?, subtitle=?, author=?, authors=?, genre=?, isbn=?, issn=?, lccn=?,
          accessionNumber=?, callNumber=?, year=?, date=?, publisher=?, edition=?,
          materialType=?, subtype=?, extent=?, size=?, volume=?,
          authorName=?, authorDates=?, place=?, description=?, otherDetails=?,
          shelf=?, pages=?, collection=?, status=?, cover=?, quantity=?
         WHERE id=?`,
        [
          title, subtitle, author || authors, authors,
          genre, isbn, issn, lccn,
          accessionNumber, callNumber, year || date, date,
          publisher, edition, materialType, subtype,
          extent, size, volume, authorName, authorDates,
          place, description, otherDetails,
          shelf, pages, collection, finalStatus, cover, qty, id,
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

  // ── DELETE ────────────────────────────────────────────
  async delete(id) {
    try {
      const [book] = await pool.query("SELECT * FROM books WHERE id = ?", [id]);
      if (!book.length) return { success: false, error: "Book not found" };

      await pool.query("DELETE FROM books WHERE id = ?", [id]);
      console.log(`✅ Book deleted: "${book[0].title}" (ID: ${id})`);
      return { success: true, data: book[0] };
    } catch (error) {
      console.error("[BookModel.delete]", error.message);
      return { success: false, error: error.message };
    }
  },

  // ── GET COUNT ─────────────────────────────────────────
  async getCount() {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) as count FROM books");
      return { success: true, count: rows[0].count };
    } catch (error) {
      console.error("[BookModel.getCount]", error.message);
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
};

module.exports = BookModel;