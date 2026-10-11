/**
 * features/landing/hooks/useSearchSuggestions.js
 *
 * Debounced autocomplete suggestions. Extracted from the suggestion effect
 * of the former landing/landingpage.jsx — drop-down visibility and keyboard
 * navigation live in SearchCard.
 */

import { useState, useEffect, useCallback } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { fetchSuggestions } from "../api/publicSearchApi";

const DEBOUNCE_MS = 300;
const MIN_CHARS   = 2;

export function useSearchSuggestions(query) {
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading,  setSugLoading]  = useState(false);

  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed || trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSugLoading(true);
    fetchSuggestions(trimmed)
      .then(d => {
        if (!cancelled) {
          setSuggestions(d.success ? d.data : []);
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setSugLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const resetSuggestions = useCallback(() => setSuggestions([]), []);

  return { suggestions, sugLoading, resetSuggestions };
}
