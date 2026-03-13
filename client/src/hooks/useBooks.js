/**
 * useBooks Hook
 * Custom hook for book management logic
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchBooks, createBook, updateBook, deleteBook } from "../services/api/booksApi";

export function useBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [genreFilter, setGenreFilter] = useState("");
  const [sortBy, setSortBy] = useState("");

  // Fetch books
  const fetchAllBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = {};
      if (statusFilter && statusFilter !== "All") {
        options.status = statusFilter;
      }
      if (genreFilter) {
        options.genre = genreFilter;
      }
      if (query) {
        options.search = query;
      }
      
      const result = await fetchBooks(options);
      
      if (result.success) {
        setBooks(result.data || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, genreFilter, query]);

  // Initial fetch
  useEffect(() => {
    fetchAllBooks();
  }, [fetchAllBooks]);

  // Derived: unique genres
  const genres = useMemo(
    () => [...new Set(books.map(b => b.genre))].sort(),
    [books]
  );

  // Filtered and sorted books
  const filteredBooks = useMemo(() => {
    let result = [...books];
    
    // Local filtering
    const q = query.toLowerCase().trim();
    if (q) {
      result = result.filter(b =>
        ["title", "author", "genre", "isbn", "publisher"].some(
          k => b[k]?.toLowerCase().includes(q)
        )
      );
    }
    
    if (statusFilter !== "All") {
      if (statusFilter === "OutOfStock") {
        result = result.filter(b => b.quantity === 0 || b.status === "OutOfStock");
      } else {
        result = result.filter(b => b.status === statusFilter);
      }
    }
    
    if (genreFilter) {
      result = result.filter(b => b.genre === genreFilter);
    }
    
    // Sorting
    if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "author") {
      result.sort((a, b) => a.author.localeCompare(b.author));
    } else if (sortBy === "year") {
      result.sort((a, b) => b.year - a.year);
    }
    
    return result;
  }, [books, query, statusFilter, genreFilter, sortBy]);

  // Add book
  const addBook = useCallback(async (bookData) => {
    const result = await createBook(bookData);
    
    if (result.success) {
      setBooks(prev => [...prev, result.data]);
      return { success: true, data: result.data };
    }
    
    return { success: false, error: result.error };
  }, []);

  // Update book
  const editBook = useCallback(async (id, bookData) => {
    const result = await updateBook(id, bookData);
    
    if (result.success) {
      setBooks(prev => prev.map(b => b.id === id ? result.data : b));
      return { success: true, data: result.data };
    }
    
    return { success: false, error: result.error };
  }, []);

  // Delete book
  const removeBook = useCallback(async (id) => {
    const result = await deleteBook(id);
    
    if (result.success) {
      setBooks(prev => prev.filter(b => b.id !== id));
      return { success: true };
    }
    
    return { success: false, error: result.error };
  }, []);

  // Book count
  const bookCount = books.length;
  const availableCount = books.filter(b => b.status === "Available" || b.quantity > 0).length;
  const outOfStockCount = books.filter(b => b.status === "OutOfStock" || b.quantity === 0).length;

  return {
    // State
    books,
    loading,
    error,
    query,
    statusFilter,
    genreFilter,
    sortBy,
    genres,
    filteredBooks,
    
    // Book statistics
    bookCount,
    availableCount,
    outOfStockCount,
    
    // Actions
    setQuery,
    setStatusFilter,
    setGenreFilter,
    setSortBy,
    refreshBooks: fetchAllBooks,
    addBook,
    editBook,
    removeBook,
  };
}

export default useBooks;

