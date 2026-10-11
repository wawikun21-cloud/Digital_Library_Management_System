/**
 * features/books/hooks/useBookFilters.js
 *
 * Catalog filters + derived list: search, status, genre, collection, sort
 * and pagination. Extracted from the former pages/Books.jsx, following the
 * same concern split as the attendance filters hook.
 */

import { useState, useEffect, useMemo } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { filterBooks, sortBooks, distinctSorted } from "../utils/bookFilters";

const ITEMS_PER_PAGE = 10;

export function useBookFilters(books) {
  const [query, setQuery]               = useState("");
  const debouncedQuery                  = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState("All");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [genreFilter, setGenreFilter]   = useState("");
  const [sortBy, setSortBy]             = useState("");
  const [currentPage, setCurrentPage]   = useState(1);

  const collections = useMemo(() => distinctSorted(books, "collection"), [books]);
  const genres      = useMemo(() => distinctSorted(books, "genre"),      [books]);

  const filtered = useMemo(() => {
    const result = filterBooks(books, { query: debouncedQuery, statusFilter, genreFilter, collectionFilter });
    return sortBooks(result, sortBy);
  }, [books, debouncedQuery, statusFilter, genreFilter, collectionFilter, sortBy]);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [debouncedQuery, statusFilter, genreFilter, collectionFilter, sortBy]);

  const hasActiveFilters = Boolean(query || statusFilter !== "All" || collectionFilter || genreFilter);

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setGenreFilter("");
    setCollectionFilter("");
  };

  return {
    itemsPerPage: ITEMS_PER_PAGE,
    query, setQuery,
    statusFilter, setStatusFilter,
    collectionFilter, setCollectionFilter,
    genreFilter, setGenreFilter,
    sortBy, setSortBy,
    collections, genres,
    filtered, paginatedBooks,
    currentPage, setCurrentPage, totalPages,
    hasActiveFilters, clearFilters,
  };
}
