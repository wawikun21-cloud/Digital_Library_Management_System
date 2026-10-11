/**
 * features/books/hooks/useBooksCatalog.js
 *
 * Catalog data for the books page: fetch, optimistic list mutations and the
 * soft-delete flow (confirmation state + mutation). Extracted from the
 * former pages/Books.jsx.
 */

import { useState, useCallback } from "react";
import booksApi from "../../../services/api/booksApi";

export function useBooksCatalog({ showToast }) {
  const [books, setBooks] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ open: false, bookId: null, bookTitle: "" });

  const fetchBooks = useCallback(async () => {
    try {
      const data = await booksApi.fetchBooks();
      if (data.success) setBooks(data.data || []);
      else showToast("Failed to load books from database", "error");
    } catch {
      showToast("Could not connect to server", "error");
    }
  }, [showToast]);

  const prependBook = useCallback((book) => {
    setBooks(prev => [book, ...prev]);
  }, []);

  const replaceBook = useCallback((book) => {
    setBooks(prev => prev.map(b => (b.id === book.id ? book : b)));
  }, []);

  const removeBookById = useCallback((id) => {
    setBooks(prev => prev.filter(b => b.id !== id));
  }, []);

  const requestDelete = useCallback((book) => {
    setDeleteModal({ open: true, bookId: book.id, bookTitle: book.title });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteModal({ open: false, bookId: null, bookTitle: "" });
  }, []);

  /**
   * ── SOFT DELETE: sets deleted_at on the server, logs to trash_log ──
   * @param {Function} [onDeleted] runs after a successful delete (used by the
   *        page to close the book modal, mirroring the original flow).
   */
  const confirmDelete = useCallback(async (onDeleted) => {
    if (!deleteModal.bookId) return;
    try {
      const result = await booksApi.deleteBook(deleteModal.bookId);
      if (result.success) {
        // Remove from local list — soft-deleted books won't appear in /api/books
        removeBookById(deleteModal.bookId);
        onDeleted?.();
        setDeleteModal({ open: false, bookId: null, bookTitle: "" });
        showToast("Book moved to Recently Deleted.", "success");
      } else {
        showToast(result.error || "Failed to delete book", "error");
      }
    } catch {
      showToast("Failed to connect to server", "error");
    }
  }, [deleteModal.bookId, removeBookById, showToast]);

  return {
    books, fetchBooks,
    prependBook, replaceBook, removeBookById,
    deleteModal, requestDelete, cancelDelete, confirmDelete,
  };
}
