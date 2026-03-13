/**
 * Transactions API Service
 * Centralized API calls for borrowed/transaction operations
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all transactions (borrowed books)
 * @param {Object} options - Filter options
 * @param {string} options.status - Filter by status (Borrowed, Returned, Overdue)
 * @returns {Promise<{success: boolean, data?: array, error?: string}>}
 */
export async function fetchTransactions(options = {}) {
  try {
    const params = new URLSearchParams();
    
    if (options.status) {
      params.append("status", options.status);
    }

    const queryString = params.toString();
    const url = queryString 
      ? `${API_BASE}/api/transactions?${queryString}` 
      : `${API_BASE}/api/transactions`;

    const response = await fetch(url);
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
    const response = await fetch(`${API_BASE}/api/transactions/${id}`);
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
    const response = await fetch(`${API_BASE}/api/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });
    
    const result = await response.json();
    return result;
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
    const response = await fetch(`${API_BASE}/api/transactions/${id}/return`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(returnData),
    });
    
    const result = await response.json();
    return result;
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
    const response = await fetch(`${API_BASE}/api/transactions/${id}`, {
      method: "DELETE",
    });
    
    const result = await response.json();
    return result;
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
    const response = await fetch(`${API_BASE}/api/transactions/stats`);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error("[TransactionsAPI] Error fetching stats:", error);
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
};

