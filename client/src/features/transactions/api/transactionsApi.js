/**
 * client/src/features/transactions/api/transactionsApi.js
 *
 * Transactions API Service — centralized HTTP for borrow/return operations.
 * Moved from client/src/services/api/transactionsApi.js (Borrowed.jsx was
 * its only live consumer — and in fact fetched around it with raw calls).
 *
 * EXTENDED: the former page issued raw `fetch()` calls for the lookup,
 * search, update, extend and pay-fine endpoints; those are now first-class
 * functions here so no page or component performs transport itself.
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Fetch all transactions (borrowed books)
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status (Borrowed, Returned, Overdue)
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
export async function fetchTransactions(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.status) params.append("status", options.status);

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE}/transactions?${queryString}`
      : `${API_BASE}/transactions`;

    const response = await fetch(url, { credentials: "include" });
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("[TransactionsAPI] Error fetching transactions:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch a single transaction by ID
 * @param {number|string} id - Transaction ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function fetchTransactionById(id) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}`, { credentials: "include" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[TransactionsAPI] Error fetching transaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new borrow transaction
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createTransaction(transactionData) {
  try {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(transactionData),
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error creating transaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Return a borrowed book (update transaction)
 * @param {number|string} id - Transaction ID
 * @param {Object} returnData - Return data
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function returnBook(id, returnData = {}) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}/return`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(returnData),
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error returning book:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete/remove a transaction
 * @param {number|string} id - Transaction ID
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function deleteTransaction(id) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error deleting transaction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transaction statistics
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function getTransactionStats() {
  try {
    const response = await fetch(`${API_BASE}/transactions/stats`, { credentials: "include" });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[TransactionsAPI] Error fetching stats:", error);
    return { success: false, error: error.message };
  }
}

/* ── Endpoints the former page fetched with raw fetch() ─────────────────── */

/** Look up a student by ID number (returns array or single object). */
export async function lookupStudent(idNumber) {
  try {
    const response = await fetch(
      `${API_BASE}/transactions/lookup/student/${encodeURIComponent(idNumber)}`,
      { credentials: "include" }
    );
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error looking up student:", error);
    return { success: false, error: error.message };
  }
}

/** Search faculty by name. */
export async function lookupFaculty(query) {
  try {
    const response = await fetch(
      `${API_BASE}/transactions/lookup/faculty?q=${encodeURIComponent(query)}`,
      { credentials: "include" }
    );
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error looking up faculty:", error);
    return { success: false, error: error.message };
  }
}

/** Search available books by accession number or title. */
export async function searchBooks(query) {
  try {
    const response = await fetch(
      `${API_BASE}/transactions/search/books?q=${encodeURIComponent(query)}`,
      { credentials: "include" }
    );
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error searching books:", error);
    return { success: false, error: error.message };
  }
}

/** Update an existing transaction (borrower fields + dates). */
export async function updateTransaction(id, transactionData) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(transactionData),
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error updating transaction:", error);
    return { success: false, error: error.message };
  }
}

/** Extend a transaction's due date by `days`. */
export async function extendDueDate(id, days) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}/extend`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ days }),
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error extending due date:", error);
    return { success: false, error: error.message };
  }
}

/** Mark a transaction's fine as paid. */
export async function payFine(id) {
  try {
    const response = await fetch(`${API_BASE}/transactions/${id}/pay-fine`, {
      method: "PUT",
      credentials: "include",
    });
    return await response.json();
  } catch (error) {
    console.error("[TransactionsAPI] Error paying fine:", error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchTransactions,
  fetchTransactionById,
  createTransaction,
  returnBook,
  deleteTransaction,
  getTransactionStats,
  lookupStudent,
  lookupFaculty,
  searchBooks,
  updateTransaction,
  extendDueDate,
  payFine,
};
