// ─────────────────────────────────────────────────────────
//  controllers/searchController.js
//  Public search endpoints for the landing page.
//  No auth required — these are publicly accessible.
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

/**
 * GET /api/search?q=harry
 *
 * Full search — matches title, author, authors, authorName.
 * Returns up to 10 results from books + lexora_books combined.
 * Uses LIKE '%keyword%' for partial matching.
 * Uses prepared statements → SQL injection safe.
 */
async function search(req, res) {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.json({ success: true, data: [] });
  }

  // Wrap keyword for LIKE '%keyword%'
  const like = `%${q}%`;

  try {
    // ── NEMCO books ──────────────────────────────────────
    const [nemcoRows] = await pool.query(
      `SELECT
         b.id,
         b.title,
         b.author,
         b.authors,
         b.authorName,
         b.cover,
         b.status,
         b.quantity,
         b.shelf,
         b.accessionNumber,
         b.callNumber,
         b.year,
         b.isbn,
         b.pages,
         b.sublocation,
         COALESCE(cc.total_copies,    b.quantity) AS total_copies,
         COALESCE(cc.avail_copies,    b.quantity) AS available_copies,
         CASE
           WHEN cc.total_copies IS NULL THEN b.status
           WHEN cc.avail_copies = 0     THEN 'OutOfStock'
           ELSE 'Available'
         END AS display_status,
         'nemco' AS source
       FROM books b
       LEFT JOIN (
         SELECT book_id,
                COUNT(*)                  AS total_copies,
                SUM(status = 'Available') AS avail_copies
         FROM book_copies
         GROUP BY book_id
       ) cc ON cc.book_id = b.id
       WHERE
         b.title      LIKE ? OR
         b.author     LIKE ? OR
         b.authors    LIKE ? OR
         b.authorName LIKE ?
       ORDER BY
         CASE WHEN b.title LIKE ? THEN 0 ELSE 1 END,
         b.title ASC
       LIMIT 10`,
      [like, like, like, like, `${q}%`]
    );

    // ── Lexora books ─────────────────────────────────────
    const [lexoraRows] = await pool.query(
      `SELECT
         id,
         title,
         author,
         NULL          AS authors,
         NULL          AS authorName,
         NULL          AS cover,
         'Available'   AS status,
         NULL          AS quantity,
         NULL          AS shelf,
         NULL          AS accessionNumber,
         NULL          AS callNumber,
         year,
         NULL          AS isbn,
         NULL          AS pages,
         NULL          AS sublocation,
         NULL          AS total_copies,
         NULL          AS available_copies,
         'Available'   AS display_status,
         'lexora'      AS source,
         collection,
         resource_type,
         program,
         subject_course,
         source        AS source_url,
         format
       FROM lexora_books
       WHERE
         title  LIKE ? OR
         author LIKE ?
       ORDER BY
         CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
         title ASC
       LIMIT 10`,
      [like, like, `${q}%`]
    );

    // Merge: nemco first, then lexora, cap at 20 total
    const combined = [...nemcoRows, ...lexoraRows].slice(0, 20);

    return res.json({ success: true, data: combined });
  } catch (err) {
    console.error("[searchController.search]", err.message);
    return res.status(500).json({ success: false, error: "Search failed" });
  }
}

/**
 * GET /api/suggestions?q=har
 *
 * Fast autocomplete — prefix match on title only.
 * Returns up to 5 title strings.
 * Called on every keystroke (debounced on frontend).
 */
async function suggestions(req, res) {
  const q = (req.query.q || "").trim();
  const field = req.query.field || 'title'; // 'title' or 'author'

  if (q.length < 2) {
    return res.json({ success: true, data: [] });
  }

  const prefix = `${q}%`;
  const like   = `%${q}%`;

  try {
    let nemcoQuery, lexoraQuery;

    if (field === 'author') {
      // Author suggestions from books + lexora_books
      nemcoQuery = `
        SELECT DISTINCT COALESCE(authors, author, authorName) as suggestion
        FROM books 
        WHERE COALESCE(authors, author, authorName) LIKE ?
        ORDER BY CASE WHEN COALESCE(authors, author, authorName) LIKE ? THEN 0 ELSE 1 END, suggestion ASC
        LIMIT 5`;
      
      lexoraQuery = `
        SELECT DISTINCT author as suggestion
        FROM lexora_books 
        WHERE author LIKE ?
        ORDER BY CASE WHEN author LIKE ? THEN 0 ELSE 1 END, suggestion ASC
        LIMIT 5`;
    } else {
      // Default: title suggestions
      nemcoQuery = `
        SELECT DISTINCT title as suggestion FROM books
        WHERE title LIKE ?
        ORDER BY CASE WHEN title LIKE ? THEN 0 ELSE 1 END, suggestion ASC
        LIMIT 5`;
      
      lexoraQuery = `
        SELECT DISTINCT title as suggestion FROM lexora_books
        WHERE title LIKE ?
        ORDER BY CASE WHEN title LIKE ? THEN 0 ELSE 1 END, suggestion ASC
        LIMIT 5`;
    }

    const [nemco] = await pool.query(nemcoQuery, [like, prefix]);
    const [lexora] = await pool.query(lexoraQuery, [like, prefix]);

    // Merge unique, prefix first, max 5
    const seen = new Set();
    const results = [];

    for (const row of [...nemco, ...lexora]) {
      if (!seen.has(row.suggestion) && results.length < 5 && row.suggestion) {
        seen.add(row.suggestion);
        results.push(row.suggestion);
      }
    }

    return res.json({ success: true, data: results });
  } catch (err) {
    console.error("[searchController.suggestions]", err.message);
    return res.status(500).json({ success: false, error: "Suggestions failed" });
  }
}

module.exports = { search, suggestions };