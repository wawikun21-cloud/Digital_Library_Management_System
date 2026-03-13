/**
 * Books API Service
 * Centralized API calls for book-related operations
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all books with optional filters
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status (Available, OutOfStock)
 * @param {string} options.genre - Filter by genre
 * @param {string} options.search - Search query
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
export async function fetchBooks(options = {}) {
  try {
    const params = new URLSearchParams();
    
    if (options.status && options.status !== "All") {
      params.append("status", options.status);
    }
    if (options.genre) {
      params.append("genre", options.genre);
    }
    if (options.search) {
      params.append("search", options.search);
    }

    const queryString = params.toString();
    const url = queryString 
      ? `${API_BASE}/api/books?${queryString}` 
      : `${API_BASE}/api/books`;

    const response = await fetch(url);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error("[BooksAPI] Error fetching books:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch a single book by ID
 * @param {number|string} id - Book ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function fetchBookById(id) {
  try {
    const response = await fetch(`${API_BASE}/api/books/${id}`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error("[BooksAPI] Error fetching book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new book
 * @param {Object} bookData - Book data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createBook(bookData) {
  try {
    const response = await fetch(`${API_BASE}/api/books`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...bookData,
        year: Number(bookData.year),
        quantity: Number(bookData.quantity) || 0,
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[BooksAPI] Error creating book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update an existing book
 * @param {number|string} id - Book ID
 * @param {Object} bookData - Updated book data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function updateBook(id, bookData) {
  try {
    const response = await fetch(`${API_BASE}/api/books/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...bookData,
        year: Number(bookData.year),
        quantity: Number(bookData.quantity) || 0,
      }),
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[BooksAPI] Error updating book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a book
 * @param {number|string} id - Book ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function deleteBook(id) {
  try {
    const response = await fetch(`${API_BASE}/api/books/${id}`, {
      method: "DELETE",
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[BooksAPI] Error deleting book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get total book count
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function getBookCount() {
  try {
    const response = await fetch(`${API_BASE}/api/books/count/all`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error("[BooksAPI] Error getting book count:", error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchBooks,
  fetchBookById,
  createBook,
  updateBook,
  deleteBook,
  getBookCount,
};

