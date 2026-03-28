/**
 * Books API Service
 * Centralized API calls for book-related operations
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function fetchBooks(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.status && options.status !== "All") params.append("status", options.status);
    if (options.genre)  params.append("genre",  options.genre);
    if (options.search) params.append("search", options.search);

    const queryString = params.toString();
    const url = queryString ? `${API_BASE}/books?${queryString}` : `${API_BASE}/books`;

    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error fetching books:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchBookById(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error fetching book:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchBookCopies(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}/copies`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error fetching book copies:", error);
    return { success: false, error: error.message };
  }
}

export async function createBook(bookData) {
  try {
    const response = await fetch(`${API_BASE}/books`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...bookData,
        year:        Number(bookData.year),
        quantity:    Number(bookData.quantity) || 0,
        // sublocation is optional — send null when empty
        sublocation: bookData.sublocation?.trim() || null,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error creating book:", error);
    return { success: false, error: error.message };
  }
}

export async function updateBook(id, bookData) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...bookData,
        year:        Number(bookData.year),
        quantity:    Number(bookData.quantity) || 0,
        // sublocation is optional — send null when empty
        sublocation: bookData.sublocation?.trim() || null,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error updating book:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteBook(id) {
  try {
    const response = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error deleting book:", error);
    return { success: false, error: error.message };
  }
}

export async function getBookCount() {
  try {
    const response = await fetch(`${API_BASE}/books/count/all`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error getting book count:", error);
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
    console.error("[BooksAPI] Error checking duplicates:", error);
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
    console.error("[BooksAPI] Error lexora importing:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchLexoraBooks() {
  try {
    const response = await fetch(`${API_BASE}/books/lexora`);
    return await response.json();
  } catch (error) {
    console.error("[BooksAPI] Error fetching Lexora books:", error);
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
    console.error("[BooksAPI] Error bulk importing:", error);
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