// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useAssignedBooks.js
//
//  Assigned-books picker state for ONE category: the assigned
//  lists, debounced-free search of physical/digital books, and
//  assign / unassign toggles. The API replaces a book's whole
//  category list, so every toggle first reads the book's current
//  categories and adds or removes only this category — other
//  departments' assignments are never wiped.
// ─────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, useRef } from "react";
import {
  fetchCategoryBooks,
  fetchBookCategories,
  fetchLexoraBookCategories,
  searchBooksForAssignment,
  searchLexoraBooksForAssignment,
  setBookCategories,
  setLexoraBookCategories,
  assignCategoryBooks,
} from "../api/organizationApi";

export function useAssignedBooks(categoryId) {
  const [assigned, setAssigned] = useState({ books: [], lexoraBooks: [] });
  const [loading, setLoading] = useState(false);
  const [physicalResults, setPhysicalResults] = useState([]);
  const [lexoraResults, setLexoraResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // Bulk assignment has its own search channel so its filter results
  // never mix with the manual per-book picker above it.
  const [bulkPhysicalResults, setBulkPhysicalResults] = useState([]);
  const [bulkLexoraResults, setBulkLexoraResults] = useState([]);
  const [bulkSearching, setBulkSearching] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [error, setError] = useState(null);
  const searchRequest = useRef(0);
  // Per-type guards: the physical and e-book bulk panels search
  // independently and must not discard each other's responses.
  const bulkSearchRequest = useRef({ physical: 0, lexora: 0 });

  const loadAssigned = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCategoryBooks(categoryId);
      if (result.success) {
        setAssigned({
          books: result.data?.books || [],
          lexoraBooks: result.data?.lexoraBooks || [],
        });
      } else {
        setError(result.error || "Failed to load assigned books");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    loadAssigned();
    setPhysicalResults([]);
    setLexoraResults([]);
  }, [loadAssigned]);

  const search = useCallback(async (term, filters = {}) => {
    const requestId = ++searchRequest.current;
    const hasQuery = Boolean(term?.trim());
    const hasFilters = Object.values(filters).some((value) => Boolean(value));
    if (!hasQuery && !hasFilters) {
      setPhysicalResults([]);
      setLexoraResults([]);
      return;
    }
    setSearching(true);
    try {
      const [physical, lexora] = await Promise.all([
        searchBooksForAssignment(term?.trim() || "", filters),
        searchLexoraBooksForAssignment(term?.trim() || "", filters),
      ]);
      if (requestId !== searchRequest.current) return;
      setPhysicalResults(physical.success ? physical.data || [] : []);
      setLexoraResults(lexora.success ? lexora.data || [] : []);
    } catch {
      if (requestId === searchRequest.current) {
        setPhysicalResults([]);
        setLexoraResults([]);
      }
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }, []);

  const assignBook = useCallback(async (book, type) => {
    setTogglingId(`${type}-${book.id}`);
    setError(null);
    try {
      const isLexora = type === "lexora";
      const current = isLexora
        ? await fetchLexoraBookCategories(book.id)
        : await fetchBookCategories(book.id);
      if (!current.success) {
        setError(current.error || "Failed to read current assignments");
        return false;
      }
      const next = [...new Set([...(current.data?.categoryIds || []), categoryId])];
      const result = isLexora
        ? await setLexoraBookCategories(book.id, next)
        : await setBookCategories(book.id, next);
      if (!result.success) {
        setError(result.error || "Failed to assign book");
        return false;
      }
      await loadAssigned();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, [categoryId, loadAssigned]);

  const unassignBook = useCallback(async (book, type) => {
    setTogglingId(`${type}-${book.id}`);
    setError(null);
    try {
      const isLexora = type === "lexora";
      const current = isLexora
        ? await fetchLexoraBookCategories(book.id)
        : await fetchBookCategories(book.id);
      if (!current.success) {
        setError(current.error || "Failed to read current assignments");
        return false;
      }
      const next = (current.data?.categoryIds || []).filter((id) => Number(id) !== Number(categoryId));
      const result = isLexora
        ? await setLexoraBookCategories(book.id, next)
        : await setBookCategories(book.id, next);
      if (!result.success) {
        setError(result.error || "Failed to remove assignment");
        return false;
      }
      await loadAssigned();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setTogglingId(null);
    }
  }, [categoryId, loadAssigned]);

  /**
   * Bulk channel — TYPE-SCOPED: a panel's search queries only its own
   * endpoint and fills only its own results. Searching e-books must
   * never populate the physical panel's rows (and vice versa).
   */
  const searchBulk = useCallback(async (term, filters = {}, type = "physical") => {
    const isLexora = type === "lexora";
    const requestId = ++bulkSearchRequest.current[type];
    const hasQuery = Boolean(term?.trim());
    const hasFilters = Object.values(filters).some((value) => Boolean(value));
    if (!hasQuery && !hasFilters) {
      if (isLexora) setBulkLexoraResults([]);
      else setBulkPhysicalResults([]);
      return;
    }
    setBulkSearching(true);
    try {
      const result = isLexora
        ? await searchLexoraBooksForAssignment(term?.trim() || "", filters)
        : await searchBooksForAssignment(term?.trim() || "", filters);
      if (requestId !== bulkSearchRequest.current[type]) return;
      const rows = result.success ? result.data || [] : [];
      if (isLexora) setBulkLexoraResults(rows);
      else setBulkPhysicalResults(rows);
    } catch {
      if (requestId === bulkSearchRequest.current[type]) {
        if (isLexora) setBulkLexoraResults([]);
        else setBulkPhysicalResults([]);
      }
    } finally {
      if (requestId === bulkSearchRequest.current[type]) setBulkSearching(false);
    }
  }, []);

  /**
   * Bulk-assign books to this category: filter-driven ("everything
   * matching") with optional per-book exclusions, or explicit ids.
   * dry_run previews the counts without writing.
   */
  const bulkAssign = useCallback(async (payload) => {
    setError(null);
    setBulkAssigning(true);
    try {
      const result = await assignCategoryBooks(categoryId, payload);
      if (!result.success) {
        setError(result.error || "Failed to assign books");
        return result;
      }
      if (!payload.dry_run) await loadAssigned();
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setBulkAssigning(false);
    }
  }, [categoryId, loadAssigned]);

  return {
    assigned,
    loading,
    error,
    physicalResults,
    lexoraResults,
    searching,
    bulkPhysicalResults,
    bulkLexoraResults,
    bulkSearching,
    togglingId,
    bulkAssigning,
    search,
    searchBulk,
    assignBook,
    unassignBook,
    bulkAssign,
  };
}
