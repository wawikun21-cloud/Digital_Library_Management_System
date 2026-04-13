// ─────────────────────────────────────────────────────────
//  models/Book.js
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

// ── column whitelist for books INSERT / UPDATE ──────────────────────────────
const BOOK_COLUMNS = [
  "title", "subtitle", "author", "authors", "genre",
  "isbn", "issn", "lccn",
  "accessionNumber", "callNumber",
  "year", "date",
  "publisher", "edition",
  "materialType", "subtype",
  "extent", "size", "volume",
  "authorName", "authorDates",
  "place", "description", "otherDetails",
  "shelf", "pages", "sublocation", "collection",
  "status", "quantity",
];

// ─────────────────────────────────────────────────────────────────────────────
//  pickBookFields — strip unknown keys before DB writes
// ─────────────────────────────────────────────────────────────────────────────
function pickBookFields(data) {
  const out = {};
  for (const col of BOOK_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(data, col)) {
      out[col] = data[col] ?? null;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
//  normaliseCopiesFromImport
//
//  THE ROOT CAUSE OF THE OUTOFSTOCK BUG:
//  The Excel parser (BookImport.jsx) attaches copies as:
//    accessionNumbers: ["ACC1", "ACC2", ...]   ← plain string array
//
//  But importWithCopies was reading:
//    bookData.copies || []                     ← always undefined for Excel
//
//  So zero rows were ever inserted into book_copies, making every imported
//  book appear OutOfStock.
//
//  This helper normalises all three shapes into one canonical format:
//    [{ accession_number, date_acquired, condition_notes }]
//
//  Shape 1 — manual BookForm:
//    copies: [{ accession_number, date_acquired?, condition_notes? }]
//
//  Shape 2 — Excel / bulk import (BookImport.jsx):
//    accessionNumbers: ["ACC1", "ACC2", ...]
//
//  Shape 3 — legacy single string:
//    accessionNumber: "ACC1"
// ─────────────────────────────────────────────────────────────────────────────
function normaliseCopiesFromImport(bookData) {
  // Shape 1 — manual form copies[]
  if (Array.isArray(bookData.copies) && bookData.copies.length > 0) {
    return bookData.copies
      .filter((c) => c && String(c.accession_number ?? "").trim())
      .map((c) => ({
        accession_number: String(c.accession_number).trim(),
        date_acquired:    c.date_acquired   || null,
        condition_notes:  c.condition_notes || null,
      }));
  }

  // Shape 2 — Excel parser: accessionNumbers[] plain string array
  // Also pick up the book-level dateAcquired that the Excel parser stores.
  if (Array.isArray(bookData.accessionNumbers) && bookData.accessionNumbers.length > 0) {
    const sharedDate = bookData.dateAcquired || null;
    return bookData.accessionNumbers
      .filter((a) => String(a ?? "").trim())
      .map((a) => ({
        accession_number: String(a).trim(),
        date_acquired:    sharedDate,
        condition_notes:  null,
      }));
  }

  // Shape 3 — legacy single accessionNumber string
  const single = String(bookData.accessionNumber ?? "").trim();
  if (single) {
    return [{ accession_number: single, date_acquired: null, condition_notes: null }];
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
//  getAll
// ─────────────────────────────────────────────────────────────────────────────
async function getAll() {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,
              COALESCE(cc.total_copies,  b.quantity) AS total_copies,
              COALESCE(cc.avail_copies,  b.quantity) AS available_copies,
              CASE
                WHEN cc.total_copies IS NULL THEN b.status
                WHEN cc.avail_copies = 0     THEN 'OutOfStock'
                ELSE 'Available'
              END AS display_status
       FROM   books b
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                    AS total_copies,
                SUM(status = 'Available')   AS avail_copies
         FROM   book_copies
         WHERE  is_deleted = 0
         GROUP  BY book_id
       ) cc ON cc.book_id = b.id
       WHERE  b.is_deleted = 0
       ORDER  BY b.created_at DESC LIMIT 1000`
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error("[BookModel] getAll:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  getById
// ─────────────────────────────────────────────────────────────────────────────
async function getById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT b.*,
              COALESCE(cc.total_copies,  b.quantity) AS total_copies,
              COALESCE(cc.avail_copies,  b.quantity) AS available_copies,
              CASE
                WHEN cc.total_copies IS NULL THEN b.status
                WHEN cc.avail_copies = 0     THEN 'OutOfStock'
                ELSE 'Available'
              END AS display_status
       FROM   books b
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                    AS total_copies,
                SUM(status = 'Available')   AS avail_copies
         FROM   book_copies
         WHERE  is_deleted = 0
         GROUP  BY book_id
       ) cc ON cc.book_id = b.id
       WHERE  b.id = ? AND b.is_deleted = 0`,
      [id]
    );
    if (!rows.length) return { success: false, error: "Book not found" };
    return { success: true, data: rows[0] };
  } catch (err) {
    console.error("[BookModel] getById:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  filter
// ─────────────────────────────────────────────────────────────────────────────
async function filter(status, genre) {
  try {
    const conditions = ["b.is_deleted = 0"];
    const params     = [];
    if (genre === "__NULL__") {
      conditions.push("b.collection IS NULL OR b.collection = ''");
    } else if (genre) {
      conditions.push("b.collection = ?"); 
      params.push(genre);
    }
    if (status && status !== "All") {
      if (status === "OutOfStock") {
        conditions.push("cc.avail_copies = 0");
      } else if (status === "Available") {
        conditions.push("cc.avail_copies > 0");
      } else {
        conditions.push("b.status = ?");
        params.push(status);
      }
    }

    const [rows] = await pool.query(
      `SELECT b.*,
              COALESCE(cc.total_copies,  b.quantity) AS total_copies,
              COALESCE(cc.avail_copies,  b.quantity) AS available_copies
       FROM   books b
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                    AS total_copies,
                SUM(status = 'Available')   AS avail_copies
         FROM   book_copies WHERE is_deleted = 0 GROUP BY book_copies
       ) cc ON cc.book_id = b.id
       WHERE  ${conditions.join(" AND ")}
       ORDER  BY b.created_at DESC`,
      params
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error("[BookModel] filter:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  search
// ─────────────────────────────────────────────────────────────────────────────
async function search(query) {
  try {
    const like = `%${query}%`;
    const [rows] = await pool.query(
      `SELECT b.*,
              COALESCE(cc.total_copies,  b.quantity) AS total_copies,
              COALESCE(cc.avail_copies,  b.quantity) AS available_copies
       FROM   books b
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                    AS total_copies,
                SUM(status = 'Available')   AS avail_copies
         FROM   book_copies WHERE is_deleted = 0 GROUP BY book_id
       ) cc ON cc.book_id = b.id
       WHERE  b.is_deleted = 0
         AND (b.title LIKE ? OR b.author LIKE ? OR b.authors LIKE ?
              OR b.isbn  LIKE ? OR b.genre LIKE ?
              OR b.accessionNumber LIKE ? OR b.callNumber LIKE ?)
       ORDER  BY b.created_at DESC`,
      [like, like, like, like, like, like, like]
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error("[BookModel] search:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  create  (legacy — metadata only, no copies)
// ─────────────────────────────────────────────────────────────────────────────
async function create(data) {
  try {
    const fields = pickBookFields(data);
    const cols   = Object.keys(fields);
    const vals   = Object.values(fields);
    const [result] = await pool.query(
      `INSERT INTO books (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      vals
    );
    return { success: true, data: { id: result.insertId, ...fields } };
  } catch (err) {
    console.error("[BookModel] create:", err.message);
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "A book with this title and author already exists." };
    }
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  createWithCopies  — manual BookForm via POST /api/books
// ─────────────────────────────────────────────────────────────────────────────
async function createWithCopies(bookData, copies) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fields = pickBookFields(bookData);
    const cols   = Object.keys(fields);
    const vals   = Object.values(fields);
    const [bookResult] = await conn.query(
      `INSERT INTO books (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
      vals
    );
    const bookId = bookResult.insertId;

    const copyErrors = [];
    for (const copy of copies) {
      try {
        await conn.query(
          `INSERT INTO book_copies (book_id, accession_number, date_acquired, condition_notes)
           VALUES (?, ?, ?, ?)`,
          [bookId, copy.accession_number.trim(), copy.date_acquired || null, copy.condition_notes || null]
        );
      } catch (copyErr) {
        if (copyErr.code === "ER_DUP_ENTRY") {
          copyErrors.push(`Accession "${copy.accession_number}" is already used by another copy.`);
        } else {
          throw copyErr;
        }
      }
    }

    if (copyErrors.length > 0) {
      await conn.rollback();
      return { success: false, error: copyErrors.join(" | ") };
    }

    await conn.query("UPDATE books SET quantity = ? WHERE id = ?", [copies.length, bookId]);
    await conn.commit();
    return { success: true, data: { id: bookId, ...fields, quantity: copies.length } };
  } catch (err) {
    await conn.rollback();
    console.error("[BookModel] createWithCopies:", err.message);
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "A book with this title and author already exists." };
    }
    return { success: false, error: err.message };
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  update  (metadata only)
// ─────────────────────────────────────────────────────────────────────────────
async function update(id, data) {
  try {
    const fields = pickBookFields(data);
    const cols   = Object.keys(fields);
    const vals   = Object.values(fields);
    if (!cols.length) return { success: false, error: "No fields to update" };
    await pool.query(
      `UPDATE books SET ${cols.map((c) => `\`${c}\` = ?`).join(", ")} WHERE id = ? AND is_deleted = 0`,
      [...vals, id]
    );
    return { success: true, data: { id, ...fields } };
  } catch (err) {
    console.error("[BookModel] update:", err.message);
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "A book with this title and author already exists." };
    }
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  updateWithCopies  — manual BookForm via PUT /api/books/:id
// ─────────────────────────────────────────────────────────────────────────────
async function updateWithCopies(id, bookData, copies) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fields = pickBookFields(bookData);
    const cols   = Object.keys(fields);
    const vals   = Object.values(fields);
    if (cols.length) {
      await conn.query(
        `UPDATE books SET ${cols.map((c) => `\`${c}\` = ?`).join(", ")} WHERE id = ? AND is_deleted = 0`,
        [...vals, id]
      );
    }

    const [existingRows] = await conn.query(
      "SELECT id, accession_number FROM book_copies WHERE book_id = ? AND is_deleted = 0",
      [id]
    );
    const existingMap        = new Map(existingRows.map((r) => [r.accession_number, r.id]));
    const incomingAccessions = new Set(copies.map((c) => c.accession_number.trim()));

    // Soft-delete removed copies
    for (const [acc, copyId] of existingMap.entries()) {
      if (!incomingAccessions.has(acc)) {
        await conn.query(
          "UPDATE book_copies SET is_deleted = 1, deleted_at = NOW() WHERE id = ?",
          [copyId]
        );
      }
    }

    // Insert new copies
    const copyErrors = [];
    for (const copy of copies) {
      const acc = copy.accession_number.trim();
      if (existingMap.has(acc)) continue;
      try {
        await conn.query(
          `INSERT INTO book_copies (book_id, accession_number, date_acquired, condition_notes)
           VALUES (?, ?, ?, ?)`,
          [id, acc, copy.date_acquired || null, copy.condition_notes || null]
        );
      } catch (copyErr) {
        if (copyErr.code === "ER_DUP_ENTRY") {
          copyErrors.push(`Accession "${acc}" is already used by another book's copy.`);
        } else {
          throw copyErr;
        }
      }
    }

    if (copyErrors.length > 0) {
      await conn.rollback();
      return { success: false, error: copyErrors.join(" | ") };
    }

    const [[{ cnt }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM book_copies WHERE book_id = ? AND is_deleted = 0",
      [id]
    );
    await conn.query("UPDATE books SET quantity = ? WHERE id = ?", [cnt, id]);

    await conn.commit();
    return { success: true, data: { id, ...fields, quantity: cnt } };
  } catch (err) {
    await conn.rollback();
    console.error("[BookModel] updateWithCopies:", err.message);
    if (err.code === "ER_DUP_ENTRY") {
      return { success: false, error: "A book with this title and author already exists." };
    }
    return { success: false, error: err.message };
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  delete (soft) — also soft-deletes all book_copies
// ─────────────────────────────────────────────────────────────────────────────
async function deleteBook(id) {
  try {
    const TrashModel = require("./Trash");
    const [book] = await pool.query("SELECT * FROM books WHERE id = ? AND is_deleted = 0", [id]);
    if (book.length === 0) {
      return { success: false, error: "Book not found" };
    }

    // Soft-delete all copies first
    await pool.query(
      "UPDATE book_copies SET is_deleted = 1, deleted_at = NOW() WHERE book_id = ? AND is_deleted = 0",
      [id]
    );

    // Then move book to trash
    const result = await TrashModel.softDelete("book", Number(id));
    return result;
  } catch (error) {
    console.error("[BookModel.deleteBook]", error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  getCopies
// ─────────────────────────────────────────────────────────────────────────────
async function getCopies(bookId) {
  try {
    const [rows] = await pool.query(
      `SELECT id, book_id, accession_number, status, date_acquired, condition_notes, created_at
       FROM   book_copies
       WHERE  book_id = ? AND is_deleted = 0
       ORDER  BY id ASC`,
      [bookId]
    );
    return { success: true, data: rows };
  } catch (err) {
    console.error("[BookModel] getCopies:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  getCount
// ─────────────────────────────────────────────────────────────────────────────
async function getCount() {
  try {
    const [[row]] = await pool.query("SELECT COUNT(*) AS count FROM books WHERE is_deleted = 0");
    return { success: true, count: row.count };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  getStats
// ─────────────────────────────────────────────────────────────────────────────
async function getStats() {
  try {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN (
           SELECT COUNT(*) FROM book_copies
           WHERE book_id = b.id AND is_deleted = 0 AND status = 'Available'
         ) = 0 THEN 1 ELSE 0 END) AS outOfStock,
         0 AS returned
       FROM books b
       WHERE b.is_deleted = 0`
    );
    return {
      success: true,
      data: {
        nemco: {
          total:      Number(stats.total),
          outOfStock: Number(stats.outOfStock),
          returned:   Number(stats.returned),
        },
      },
    };
  } catch (err) {
    console.error("[BookModel] getStats:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  checkDuplicatesBatch
//
//  We only warn about duplicate ACCESSION NUMBERS now.
//  Duplicate titles are intentionally allowed — two books can share a title
//  and author but have different accession numbers (different physical copies
//  catalogued as separate book records).
// ─────────────────────────────────────────────────────────────────────────────
async function checkDuplicatesBatch(books) {
  try {
    if (!Array.isArray(books) || !books.length) {
      return { success: false, error: "No books provided" };
    }

    // normaliseCopiesFromImport handles all three accession shapes
    const accessions = books.flatMap((b) =>
      normaliseCopiesFromImport(b).map((c) => c.accession_number)
    );

    const duplicateAccessions = [];

    if (accessions.length) {
      const [aRows] = await pool.query(
        `SELECT accession_number FROM book_copies WHERE accession_number IN (${accessions.map(() => "?").join(",")}) AND is_deleted = 0`,
        accessions
      );
      duplicateAccessions.push(...aRows.map((r) => r.accession_number));
    }

    return {
      success:             true,
      hasDuplicates:       duplicateAccessions.length > 0,
      duplicateTitles:     [],   // no longer flagged — titles may repeat
      duplicateAccessions,
    };
  } catch (err) {
    console.error("[BookModel] checkDuplicatesBatch:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  importWithCopies
//
//  Each call represents ONE distinct book record from the Excel sheet.
//  We NEVER merge by title+author because two rows with the same title/author
//  but different accession numbers are genuinely different physical items.
//
//  Duplicate-accession detection strategy:
//    1. Check which of this record's accession numbers already exist in
//       book_copies across ANY book (globally unique constraint).
//    2. If ALL copies for this record already exist → treat as fully existing
//       (isNewBook = false, no new book row, no new copy rows).
//    3. If SOME copies are new → always create a fresh book row and insert
//       only the new copies.  The already-used accessions are skipped.
//    4. If the book row INSERT itself hits a UNIQUE constraint (title+author
//       unique index) we fall back to attaching new copies to the existing
//       book row for that title+author — this preserves the old behaviour for
//       the manual-add flow while still being safe for imports.
// ─────────────────────────────────────────────────────────────────────────────
async function importWithCopies(bookData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fields = pickBookFields(bookData);
    const cols   = Object.keys(fields);
    const vals   = Object.values(fields);

    // Normalise copies — handles accessionNumbers[], copies[], accessionNumber
    const copies = normaliseCopiesFromImport(bookData);

    // ── Step 1: find which accession numbers already exist in the DB ─────────
    const skippedCopies    = [];
    const copiesToInsert   = [];

    if (copies.length > 0) {
      const accNums = copies.map((c) => c.accession_number);
      const [existingCopyRows] = await conn.query(
        `SELECT accession_number FROM book_copies
         WHERE  accession_number IN (${accNums.map(() => "?").join(",")})
           AND  is_deleted = 0`,
        accNums
      );
      const existingAccSet = new Set(existingCopyRows.map((r) => r.accession_number));

      for (const copy of copies) {
        if (existingAccSet.has(copy.accession_number)) {
          skippedCopies.push({ accession_number: copy.accession_number, reason: "duplicate" });
        } else {
          copiesToInsert.push(copy);
        }
      }
    }

    // ── Step 2: if every copy already existed, nothing new to do ─────────────
    if (copies.length > 0 && copiesToInsert.length === 0) {
      // All accessions were duplicates — find the existing book to return its id
      const firstAcc = copies[0].accession_number;
      const [[existingCopy]] = await conn.query(
        "SELECT book_id FROM book_copies WHERE accession_number = ? AND is_deleted = 0 LIMIT 1",
        [firstAcc]
      );
      const bookId = existingCopy?.book_id ?? null;
      await conn.commit();
      return {
        success:      true,
        isNewBook:    false,
        data:         { id: bookId, ...fields },
        skippedCopies,
      };
    }

    // ── Step 3: insert a new book row for this import record ──────────────────
    let bookId;
    let isNewBook = false;

    try {
      const [res] = await conn.query(
        `INSERT INTO books (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`,
        vals
      );
      bookId    = res.insertId;
      isNewBook = true;
    } catch (insertErr) {
      if (insertErr.code === "ER_DUP_ENTRY") {
        // title+author unique constraint hit — attach to the existing book row
        const [existing] = await conn.query(
          "SELECT id FROM books WHERE title = ? AND author = ? AND is_deleted = 0 LIMIT 1",
          [bookData.title, bookData.author || bookData.authors]
        );
        if (!existing.length) throw insertErr; // unexpected — rethrow
        bookId    = existing[0].id;
        isNewBook = false;
      } else {
        throw insertErr;
      }
    }

    // ── Step 4: insert the new copies ────────────────────────────────────────
    for (const copy of copiesToInsert) {
      try {
        await conn.query(
          `INSERT INTO book_copies (book_id, accession_number, date_acquired, condition_notes)
           VALUES (?, ?, ?, ?)`,
          [bookId, copy.accession_number, copy.date_acquired, copy.condition_notes]
        );
      } catch (e) {
        if (e.code === "ER_DUP_ENTRY") {
          // Race condition — another request inserted it between our check and insert
          skippedCopies.push({ accession_number: copy.accession_number, reason: "duplicate" });
        } else {
          throw e;
        }
      }
    }

    // ── Step 5: sync quantity = actual live copy count ────────────────────────
    const [[{ cnt }]] = await conn.query(
      "SELECT COUNT(*) AS cnt FROM book_copies WHERE book_id = ? AND is_deleted = 0",
      [bookId]
    );
    await conn.query("UPDATE books SET quantity = ? WHERE id = ?", [cnt, bookId]);

    await conn.commit();
    return {
      success:      true,
      isNewBook,
      data:         { id: bookId, ...fields, quantity: cnt },
      skippedCopies,
    };
  } catch (err) {
    await conn.rollback();
    console.error("[BookModel] importWithCopies:", err.message);
    return { success: false, error: err.message };
  } finally {
    conn.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  bulkImport
// ─────────────────────────────────────────────────────────────────────────────
async function bulkImport(books) {
  try {
    let imported = 0, updated = 0, errors = 0;
    const data         = [];
    const errorsDetail = [];

    for (const bookData of books) {
      const result = await importWithCopies(bookData);
      if (result.success) {
        result.isNewBook ? imported++ : updated++;
        data.push(result.data);
      } else {
        errors++;
        errorsDetail.push({ title: bookData.title, error: result.error });
      }
    }
    return { success: true, imported, updated, errors, data, errorsDetail };
  } catch (err) {
    console.error("[BookModel] bulkImport:", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  getAll,
  getById,
  filter,
  search,
  create,
  createWithCopies,
  update,
  updateWithCopies,
  delete:              deleteBook,
  getCopies,
  getCount,
  getStats,
  checkDuplicatesBatch,
  importWithCopies,
  bulkImport,
};