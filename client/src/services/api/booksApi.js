/**
 * Books API Service
 * Centralised API calls for book-related operations.
 *
 * createBook / updateBook now forward a `copies` array so the server can
 * insert / sync rows in book_copies.  Each element has:
 *   { accession_number, date_acquired?, condition_notes? }
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise the copies array coming from the form before sending to the API.
 * Filters out rows with no accession_number so we never send blank entries.
 */
function normaliseCopies(copies = []) {
  return copies
    .filter((c) => c.accession_number?.trim())
    .map((c) => ({
      accession_number: c.accession_number.trim(),
      date_acquired:    c.date_acquired    || null,
      condition_notes:  c.condition_notes?.trim() || null,
    }));
}

/**
 * Build the canonical payload that both createBook and updateBook send.
 * - `quantity` is derived from the number of valid copies (so the books table
 *   stays consistent with book_copies row count).
 * - `accessionNumber` on the books row is set to the first copy's accession
 *   number for backwards-compatibility with places that still read that column.
 */
function buildPayload(bookData) {
  const copies = normaliseCopies(bookData.copies);

  return {
    // ── books table columns ─────────────────────────────────────────────
    title:         bookData.title        ?? "",
    subtitle:      bookData.subtitle     ?? null,
    author:        bookData.authors      ?? bookData.author ?? null,   // books.author
    authors:       bookData.authors      ?? null,                      // books.authors
    genre:         bookData.genre        ?? null,
    isbn:          bookData.isbn         ?? null,
    issn:          bookData.issn         ?? null,
    lccn:          bookData.lccn         ?? null,
    callNumber:    bookData.callNumber   ?? null,
    // Legacy single-accession field — keep first copy's value for compat
    accessionNumber: copies[0]?.accession_number ?? bookData.accessionNumber ?? null,
    year:          Number(bookData.date  || bookData.year) || null,
    date:          Number(bookData.date  || bookData.year) || null,
    publisher:     bookData.publisher    ?? null,
    edition:       bookData.edition      ?? null,
    extent:        bookData.extent       ?? null,
    size:          bookData.size         ?? null,
    volume:        bookData.volume       ?? null,
    place:         bookData.place        ?? null,
    description:   bookData.description  ?? null,
    otherDetails:  bookData.otherDetails ?? null,
    shelf:         bookData.shelf        ?? null,
    pages:         bookData.pages        ?? null,
    sublocation:   bookData.sublocation?.trim() || null,
    collection:    bookData.collection   ?? null,
    // quantity = number of copy rows (auto-derived)
    quantity: copies.length || Number(bookData.quantity) || 1,
    // ── book_copies rows ────────────────────────────────────────────────
    copies,
  };
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function fetchBooks(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.status && options.status !== "All") params.append("status", options.status);
    if (options.genre)  params.append("genre",  options.genre);
    if (options.search) params.append("search", options.search);

    const qs  = params.toString();
    const url = qs ? `${API_BASE}/books?${qs}` : `${API_BASE}/books`;

    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] fetchBooks:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchBookById(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] fetchBookById:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchBookCopies(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}/copies`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] fetchBookCopies:", error);
    return { success: false, error: error.message };
  }
}

export async function createBook(bookData) {
  try {
    const response = await fetch(`${API_BASE}/books`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildPayload(bookData)),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] createBook:", error);
    return { success: false, error: error.message };
  }
}

export async function updateBook(id, bookData) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(buildPayload(bookData)),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] updateBook:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBook(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] deleteBook:", error);
    return { success: false, error: error.message };
  }
}

export async function getBookCount() {
  try {
    const response = await fetch(`${API_BASE}/books/count/all`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] getBookCount:", error);
    return { success: false, error: error.message };
  }
}

export async function checkDuplicates(books) {
  try {
    const response = await fetch(`${API_BASE}/books/check-duplicates`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ books }),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] checkDuplicates:", error);
    return { success: false, error: error.message };
  }
}

export async function lexoraImport(books) {
  try {
    const response = await fetch(`${API_BASE}/books/lexora-import`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ books }),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] lexoraImport:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchLexoraBooks() {
  try {
    const response = await fetch(`${API_BASE}/books/lexora`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] fetchLexoraBooks:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkImport(books) {
  try {
    const response = await fetch(`${API_BASE}/books/bulk-import`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ books }),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] bulkImport:", error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchBooks,
  fetchLexoraBooks,
  fetchBookById,
  fetchBookCopies,
  createBook,
  updateBook,
  deleteBook,
  getBookCount,
  checkDuplicates,
  bulkImport,
  lexoraImport,
};