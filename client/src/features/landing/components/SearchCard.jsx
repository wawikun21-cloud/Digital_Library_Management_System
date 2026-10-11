/**
 * features/landing/components/SearchCard.jsx
 *
 * Hero search card: input, inline clear, suggestions/history dropdown with
 * keyboard navigation, and Search/Clear actions. Dropdown UI state lives
 * here (kept as low in the tree as possible). Extracted from the former
 * landing/landingpage.jsx.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import SearchDropdown from "./SearchDropdown";

export default function SearchCard({ search, suggestions, history }) {
  const { query, setQuery, loading, searched, doSearch, clearSearch } = search;
  const { items: suggestionItems, loading: sugLoading, reset: resetSuggestions } = suggestions;
  const { items: historyItems, remove: removeHistoryItem } = history;

  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  // Dropdown UI state — local to the card
  const [showDropdown, setShowDropdown]   = useState(false);
  const [activeSugIdx, setActiveSugIdx]   = useState(-1); // keyboard nav

  // Close dropdown when clicking outside
  useEffect(() => {
    const fn = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── What to show in dropdown ──────────────────────────
  const showSuggestions = query.trim().length >= 2 && suggestionItems.length > 0;
  const showHistory     = !query.trim() && historyItems.length > 0;
  const dropdownVisible = showDropdown && (showSuggestions || showHistory);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    setShowDropdown(false);
    doSearch();
  }, [doSearch]);

  // ── Suggestion / history click ────────────────────────
  const pickSuggestion = useCallback((term) => {
    setQuery(term);
    resetSuggestions();
    setShowDropdown(false);
    doSearch(term);
  }, [setQuery, resetSuggestions, doSearch]);

  // ── Keyboard navigation in dropdown ──────────────────
  const handleKeyDown = (e) => {
    const items = query.trim().length >= 2 ? suggestionItems : historyItems;
    if (!showDropdown || items.length === 0) {
      if (e.key === "Enter") handleSubmit(e);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSugIdx(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSugIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSugIdx >= 0) {
        pickSuggestion(items[activeSugIdx]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // ── Show dropdown on focus ────────────────────────────
  const handleFocus = () => {
    setShowDropdown(true);
    setActiveSugIdx(-1);
  };

  // Inline clear — keeps results, only resets the input + suggestions
  const handleInlineClear = () => {
    setQuery("");
    resetSuggestions();
    setShowDropdown(true);
    inputRef.current?.focus();
  };

  // Full clear (the form's Clear button)
  const handleClear = () => {
    clearSearch();
    resetSuggestions();
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <form className="search-card" onSubmit={handleSubmit} autoComplete="off">
      <div className="search-card-label">Search by Title or Author</div>

      {/* Input + dropdown */}
      <div className="search-input-wrap" ref={dropdownRef}>
        <span className="field-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>

        <input
          ref={inputRef}
          className="search-input"
          type="text"
          placeholder="e.g. Harry Potter, Rizal, Noli Me Tangere…"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveSugIdx(-1); setShowDropdown(true); }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={dropdownVisible}
        />

        {/* Inline clear button */}
        {query && (
          <button
            type="button"
            className="input-clear-btn"
            onClick={handleInlineClear}
            aria-label="Clear search"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}

        {/* ── Dropdown ─────────────────────────────── */}
        {dropdownVisible && (
          <SearchDropdown
            showSuggestions={showSuggestions}
            showHistory={showHistory}
            suggestions={suggestionItems}
            sugLoading={sugLoading}
            history={historyItems}
            activeIdx={activeSugIdx}
            query={query}
            onPick={pickSuggestion}
            onRemoveHistory={removeHistoryItem}
            onHoverIdx={setActiveSugIdx}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="search-actions">
        <button className="btn-search" type="submit" disabled={loading}>
          {loading ? (
            <>
              <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Searching…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Search Library
            </>
          )}
        </button>
        {searched && (
          <button className="btn-clear" type="button" onClick={handleClear}>Clear</button>
        )}
      </div>
    </form>
  );
}
