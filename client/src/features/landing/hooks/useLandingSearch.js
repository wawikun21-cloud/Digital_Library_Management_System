/**
 * features/landing/hooks/useLandingSearch.js
 *
 * Catalog search for the landing page: query, results, loading/error/empty
 * state, selection and the abort-aware doSearch. Extracted from the
 * component body of the former landing/landingpage.jsx.
 *
 * Dropdown UI state deliberately lives in SearchCard (kept as low in the
 * tree as possible); this hook owns only the search itself.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { searchBooks } from "../api/publicSearchApi";
import { addHistory, getHistory } from "../utils/searchHistory";

export function useLandingSearch() {
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searchError,  setSearchError]  = useState(null);

  const resultsRef = useRef(null);
  // Always holds the latest query value — avoids stale closure in doSearch
  const queryRef   = useRef(query);
  // Holds the AbortController for the current in-flight search fetch
  const abortRef   = useRef(null);

  // Keep queryRef in sync with query state on every render
  useEffect(() => { queryRef.current = query; }, [query]);

  // ── Full search ───────────────────────────────────────
  const doSearch = useCallback(async (term) => {
    // Use the explicit term arg, or fall back to the ref (always current — no stale closure)
    const q = (term ?? queryRef.current).trim();
    if (!q) return;

    // Cancel any previous in-flight request so a slow old response
    // can never overwrite a fast new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setSearched(true);
    setSearchError(null);
    addHistory(q);

    try {
      const data = await searchBooks(q, { signal: abortRef.current.signal });
      const rows = data.data || [];
      setResults(rows);
      setSelectedBook(rows[0] || null);
    } catch (err) {
      // AbortError is intentional (user started a new search) — ignore it silently
      if (err.name !== "AbortError") {
        setResults([]);
        setSearchError("Search failed. Please check your connection and try again.");
      }
    } finally {
      // Only clear loading if this controller wasn't already replaced by a newer search
      if (!abortRef.current?.signal.aborted) {
        setLoading(false);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }
    }
  }, []); // no dependencies needed — queryRef always holds the latest value

  /** Reset everything except the dropdown (owned by SearchCard). */
  const clearSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setSelectedBook(null);
    setSearchError(null);
  }, []);

  return {
    query, setQuery,
    results, loading, searched, searchError,
    selectedBook, setSelectedBook,
    resultsRef,
    doSearch, clearSearch,
  };
}
