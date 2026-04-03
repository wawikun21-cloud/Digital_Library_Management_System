import { useState, useEffect, useRef, useCallback } from "react";

// ── Constants ─────────────────────────────────────────────
const API_BASE       = import.meta.env.VITE_API_URL || "/api";
const HISTORY_KEY    = "lexora_search_history";
const MAX_HISTORY    = 5;
const DEBOUNCE_MS    = 300;

// ── localStorage helpers ──────────────────────────────────
function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}
function addHistory(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const prev    = getHistory().filter(h => h !== trimmed);
  const next    = [trimmed, ...prev].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}
function removeHistory(term) {
  const next = getHistory().filter(h => h !== term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

// ── Custom debounce hook ──────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────
export default function LandingPage() {
  // ── Search state ──────────────────────────────────────
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [searched,     setSearched]     = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // ── Autocomplete state ────────────────────────────────
  const [suggestions,    setSuggestions]    = useState([]);
  const [sugLoading,     setSugLoading]     = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [activeSugIdx,   setActiveSugIdx]   = useState(-1); // keyboard nav
  const [history,        setHistory]        = useState(getHistory);

  // ── UI state ──────────────────────────────────────────
  const [scrolled,  setScrolled]  = useState(false);
  const resultsRef  = useRef(null);
  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);

  // Debounce the typed query for suggestions only
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // Scroll detection for topbar
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

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

  // ── Fetch suggestions on debounced input ─────────────
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setSugLoading(true);
    fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setSuggestions(d.success ? d.data : []);
          setActiveSugIdx(-1);
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setSugLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Full search ───────────────────────────────────────
  const doSearch = useCallback(async (term) => {
    const q = (term || query).trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    setShowDropdown(false);
    addHistory(q);
    setHistory(getHistory());
    try {
      const res  = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      const rows = data.data || [];
      setResults(rows);
      setSelectedBook(rows[0] || null);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch();
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSearched(false);
    setSelectedBook(null);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // ── Suggestion / history click ────────────────────────
  const pickSuggestion = (term) => {
    setQuery(term);
    setSuggestions([]);
    setShowDropdown(false);
    doSearch(term);
  };

  // ── Keyboard navigation in dropdown ──────────────────
  const handleKeyDown = (e) => {
    const items = query.trim().length >= 2 ? suggestions : history;
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

  // Highlight matched substring in suggestion text
  const highlight = (text, keyword) => {
    if (!keyword) return text;
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong style={{ color: "var(--gold)" }}>{text.slice(idx, idx + keyword.length)}</strong>
        {text.slice(idx + keyword.length)}
      </>
    );
  };

  // ── What to show in dropdown ──────────────────────────
  const showSuggestions = query.trim().length >= 2 && suggestions.length > 0;
  const showHistory     = !query.trim() && history.length > 0;
  const dropdownVisible = showDropdown && (showSuggestions || showHistory);

  // ── Book display helpers ──────────────────────────────
  const formatYear = (val) => {
    if (!val) return null;
    if (typeof val === "string" && val.includes("-")) return val.slice(0, 4);
    return String(val);
  };

  const statusColor = (book) => {
    const eff  = book.display_status || book.status;
    const avail = book.available_copies;
    if (
      eff === "OutOfStock" ||
      (avail !== undefined && avail !== null && Number(avail) === 0) ||
      (avail === undefined && book.quantity === 0)
    ) return { bg: "#fee2e2", text: "#dc2626", label: "Out of Stock" };
    if (!eff || eff.toLowerCase() === "available")
      return { bg: "#e8f5e9", text: "#2e7d32", label: "Available" };
    if (eff.toLowerCase() === "borrowed")
      return { bg: "#fff3e0", text: "#e65100", label: "Borrowed" };
    return { bg: "#f3e5f5", text: "#6a1b9a", label: eff };
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #1a1410;
          --parchment: #faf7f2;
          --cream: #f3ede3;
          --gold: rgb(247 193 79);
          --gold-light: #e8d5a3;
          --navyblue: #1D3067;
          --sage: #5a6e5c;
          --warm-gray: #9e9189;
          --white: #ffffff;
          --shadow: 0 4px 24px rgba(26,20,16,0.10);
          --shadow-lg: 0 12px 48px rgba(26,20,16,0.16);
        }

        body { font-family: 'DM Sans', sans-serif; background: var(--parchment); color: var(--ink); }

        /* ── TOPBAR ─────────────────────────────────────── */
        .topbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2.5rem; height: 80px;
          background: #1D3067;
          transition: all 0.35s ease;
        }
        .topbar-brand {
          display: flex; align-items: center; gap: 0.6rem;
          text-decoration: none;
        }
        .topbar-brand-icon {
          margin-left: 5rem; width: 170px; height: 170px;
          border-radius: 32px; display: block;
          object-fit: contain; background: transparent;
        }
        .topbar-nav { display: flex; align-items: center; gap: 1rem; }
        .login-btn {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.5rem 1.25rem; background: #1D3067;
          color: var(--parchment); border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
          cursor: pointer; text-decoration: none; transition: all 0.2s ease;
        }
        .login-btn:hover { background: rgb(243,185,64); color: var(--ink); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(243,185,64,0.35); }
        .login-btn svg { width: 15px; height: 15px; }

        /* ── HERO ───────────────────────────────────────── */
        .hero {
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 8rem 1.5rem 4rem; position: relative; overflow: hidden;
          background: var(--parchment);
        }
        .hero-bg-image {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; opacity: 0.18; pointer-events: none; z-index: 0;
        }
        .hero-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .hero-bg-circle { position: absolute; border-radius: 50%; opacity: 0.07; }
        .hero-bg-circle:nth-child(1) {
          width: 700px; height: 700px; top: -200px; right: -150px;
          background: radial-gradient(circle, var(--gold) 0%, transparent 70%);
          animation: float1 8s ease-in-out infinite;
        }
        .hero-bg-circle:nth-child(2) {
          width: 500px; height: 500px; bottom: -100px; left: -100px;
          background: radial-gradient(circle, var(--rust) 0%, transparent 70%);
          animation: float2 10s ease-in-out infinite;
        }
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,20px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-15px)} }
        .hero-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; max-width: 720px;
          animation: fadeUp 0.8s ease both;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2.8rem, 6vw, 4.5rem); font-weight: 700;
          line-height: 1.1; color: var(--ink); margin-bottom: 1.2rem; letter-spacing: -0.02em;
        }
        .hero-title em { font-style: italic; color: #1D3067; }
        .hero-subtitle {
          font-size: 1.05rem; color: var(--warm-gray); font-weight: 300;
          line-height: 1.7; max-width: 520px; margin-bottom: 3rem;
        }

        /* ── SEARCH CARD ────────────────────────────────── */
        .search-card {
          width: 100%; max-width: 640px; background: var(--white);
          border-radius: 20px; padding: 2rem 2rem 1.75rem;
          box-shadow: var(--shadow-lg); border: 1px solid rgba(201,168,76,0.15);
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .search-card-label {
          font-size: 0.7rem; font-weight: 500; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--warm-gray); margin-bottom: 1rem;
        }

        /* ── SEARCH INPUT WRAPPER (with dropdown) ───────── */
        .search-input-wrap { position: relative; margin-bottom: 1.25rem; }

        .field-icon {
          position: absolute; left: 1rem; top: 50%; transform: translateY(-50%);
          color: var(--warm-gray); pointer-events: none;
          display: flex; align-items: center; z-index: 1;
        }
        .field-icon svg { width: 16px; height: 16px; }

        .search-input {
          width: 100%;
          padding: 0.9rem 3rem 0.9rem 2.7rem;
          border: 1.5px solid #e8e0d5; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; color: var(--ink);
          background: var(--parchment); outline: none; transition: all 0.2s ease;
        }
        .search-input::placeholder { color: #c5bab0; }
        .search-input:focus {
          border-color: var(--gold); background: var(--white);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
        }

        /* clear × button inside input */
        .input-clear-btn {
          position: absolute; right: 0.9rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--warm-gray); line-height: 1;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; transition: color 0.15s;
        }
        .input-clear-btn:hover { color: var(--ink); }
        .input-clear-btn svg { width: 14px; height: 14px; }

        /* ── DROPDOWN ───────────────────────────────────── */
.search-dropdown {
          position: absolute; left: 0; right: 0; top: calc(100% + 6px);
          background: var(--white); border: 1.5px solid #e8e0d5; border-radius: 12px;
          box-shadow: var(--shadow-lg); z-index: 9999; overflow: hidden;
          max-height: 220px; overflow-y: auto; padding-right: 1px;
          animation: fadeUp 0.15s ease both;
        }
        .dropdown-section-label {
          font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--warm-gray);
          padding: 0.65rem 1rem 0.3rem;
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 0.65rem;
          padding: 0.6rem 1rem; cursor: pointer;
          font-size: 0.9rem; color: var(--ink);
          transition: background 0.12s ease;
          border: none; background: none; width: 100%; text-align: left;
        }
        .dropdown-item:hover, .dropdown-item.active {
          background: rgba(201,168,76,0.09);
        }
        .dropdown-item svg { width: 13px; height: 13px; color: var(--warm-gray); flex-shrink: 0; }
        .dropdown-item-remove {
          margin-left: auto; padding: 2px 6px; border-radius: 4px;
          font-size: 0.7rem; color: var(--warm-gray);
          background: transparent; border: none; cursor: pointer;
          transition: color 0.12s, background 0.12s;
        }
        .dropdown-item-remove:hover { color: #dc2626; background: rgba(220,38,38,0.07); }
        .dropdown-loading {
          padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--warm-gray);
          display: flex; align-items: center; gap: 0.5rem;
        }

        /* ── SEARCH ACTIONS ─────────────────────────────── */
        .search-actions { display: flex; gap: 0.75rem; }
        .btn-search {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          padding: 0.85rem 1.5rem; background: #1D3067; color: #ffffff;
          border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.9rem; font-weight: 500;
          cursor: pointer; transition: all 0.2s ease; letter-spacing: 0.02em;
        }
        .btn-search:hover { background: rgb(243,185,64); color: var(--ink); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(243,185,64,0.3); }
        .btn-search:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-search svg { width: 16px; height: 16px; }
        .btn-clear {
          padding: 0.85rem 1rem; background: transparent; color: var(--warm-gray);
          border: 1.5px solid #e8e0d5; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 400;
          cursor: pointer; transition: all 0.2s ease;
        }
        .btn-clear:hover { border-color: rgb(243,185,64); color: #1D3067; background: rgba(243,185,64,0.08); }

        /* ── RESULTS ────────────────────────────────────── */
        .results-section {
          width: 100%; max-width: 1100px; margin: 0 auto;
          padding: 3.5rem 1.5rem 5rem;
          animation: fadeUp 0.5s ease both;
        }
        .results-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.25rem; padding-bottom: 1rem;
          border-bottom: 1px solid #e8e0d5;
        }
        .results-count {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem; font-weight: 600; color: var(--ink);
        }
        .results-count span { color: var(--navyblue); }

        /* Two-column split */
        .results-split {
          display: grid; grid-template-columns: 340px 1fr;
          gap: 1.25rem; align-items: start;
        }
        .results-list {
          display: flex; flex-direction: column; gap: 0;
          border: 1px solid #e8e0d5; border-radius: 14px;
          overflow: hidden; background: var(--white);
          max-height: 600px; overflow-y: auto;
        }
        .result-row {
          display: flex; align-items: flex-start; gap: 0.85rem;
          padding: 1rem 1.1rem; border-bottom: 1px solid #f0e9e0;
          cursor: pointer; transition: background 0.15s ease;
        }
        .result-row:last-child { border-bottom: none; }
        .result-row:hover { background: #faf7f2; }
        .result-row.active {
          background: linear-gradient(90deg, rgba(201,168,76,0.09), rgba(139,58,42,0.04));
          border-left: 3px solid var(--gold);
        }
        .result-row.active .result-row-title { color: var(--navyblue); }
        .result-row-icon {
          flex-shrink: 0; width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: var(--cream); color: var(--warm-gray); margin-top: 1px;
        }
        .result-row-icon svg { width: 16px; height: 16px; }
        .result-row.active .result-row-icon { background: rgba(201,168,76,0.15); color: var(--gold); }
        .result-row-body { flex: 1; min-width: 0; }
        .result-row-title {
          font-family: 'Playfair Display', serif; font-size: 0.88rem; font-weight: 600;
          color: var(--ink); line-height: 1.3;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.2rem;
        }
        .result-row-author {
          font-size: 0.75rem; color: var(--warm-gray); font-style: italic;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.3rem;
        }
        .result-row-badges { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
        .row-source-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .row-source-dot.nemco  { background: #132F45; }
        .row-source-dot.lexora { background: var(--gold); }
        .row-source-label { font-size: 0.65rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
        .row-source-label.nemco  { color: #132F45; }
        .row-source-label.lexora { color: var(--gold); }
        .row-status-pill { font-size: 0.63rem; font-weight: 500; padding: 0.1rem 0.4rem; border-radius: 100px; }

        /* Detail panel */
        .detail-panel {
          background: var(--white); border: 1px solid #e8e0d5;
          border-radius: 14px; padding: 2rem;
          min-height: 300px; position: sticky; top: 100px;
        }
        .detail-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 260px; color: var(--warm-gray); text-align: center; gap: 0.75rem;
        }
        .detail-empty svg { width: 40px; height: 40px; opacity: 0.25; }
        .detail-empty p { font-size: 0.85rem; }
        .detail-source-badge {
          display: inline-flex; align-items: center; gap: 0.35rem;
          padding: 0.25rem 0.75rem; border-radius: 100px;
          font-size: 0.7rem; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
          margin-bottom: 1.25rem;
        }
        .detail-source-badge.nemco  { background: rgba(19,47,69,0.07); color: #132F45; border: 1px solid rgba(19,47,69,0.14); }
        .detail-source-badge.lexora { background: rgba(201,168,76,0.1); color: var(--gold); border: 1px solid var(--gold); }
        .detail-source-badge svg { width: 11px; height: 11px; }
        .detail-title { font-family: 'Playfair Display', serif; font-size: 1.45rem; font-weight: 700; color: var(--ink); line-height: 1.25; margin-bottom: 0.4rem; }
        .detail-author { font-size: 0.9rem; color: var(--warm-gray); font-style: italic; margin-bottom: 1.5rem; }
        .detail-divider { border: none; border-top: 1px solid #ede6da; margin: 1.25rem 0; }
        .detail-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem 1.5rem; }
        .detail-field-label { font-size: 0.67rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--warm-gray); margin-bottom: 0.15rem; }
        .detail-field-value { font-size: 0.88rem; color: var(--ink); font-weight: 500; }
        .detail-field-full { grid-column: 1 / -1; }
        .detail-status-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; flex-wrap: wrap; }
        .detail-shelf {
          display: inline-flex; align-items: center; gap: 0.4rem;
          padding: 0.4rem 0.9rem; border-radius: 8px;
          background: rgba(90,110,92,0.09); color: var(--sage);
          font-size: 0.82rem; font-weight: 600; border: 1px solid rgba(90,110,92,0.18);
        }
        .detail-shelf svg { width: 14px; height: 14px; }
        .detail-copies { font-size: 0.82rem; color: var(--warm-gray); }
        .detail-copies strong { color: #2e7d32; font-size: 1rem; }
        .detail-lexora-btn {
          display: inline-flex; align-items: center; gap: 0.5rem;
          margin-top: 1.5rem; padding: 0.7rem 1.4rem; border-radius: 10px;
          background: #1D3067; color: #fff;
          font-size: 0.88rem; font-weight: 600; text-decoration: none; transition: all 0.2s ease;
        }
        .detail-lexora-btn:hover { background: rgb(243,185,64); color: var(--ink); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(243,185,64,0.35); }
        .detail-lexora-btn svg { width: 15px; height: 15px; }
        .detail-resource-type {
          display: inline-block; padding: 0.2rem 0.65rem; border-radius: 100px;
          font-size: 0.7rem; font-weight: 500;
          background: rgba(201,168,76,0.1); color: var(--gold); border: 1px solid var(--gold);
          margin-left: 0.5rem;
        }

        /* State boxes */
        .state-box {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 4rem 2rem; text-align: center; color: var(--warm-gray); grid-column: 1 / -1;
        }
        .state-box-icon { font-size: 3rem; margin-bottom: 1rem; opacity: 0.4; }
        .state-box-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; color: var(--ink); margin-bottom: 0.4rem; }
        .state-box-text { font-size: 0.85rem; }
        .spinner {
          width: 36px; height: 36px; border: 3px solid var(--cream); border-top-color: var(--gold);
          border-radius: 50%; animation: spin 0.7s linear infinite; margin-bottom: 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Stats + footer */
        .stats-strip {
          display: flex; justify-content: center; gap: 3rem;
          padding: 0 1.5rem 4rem; animation: fadeUp 0.8s 0.4s ease both;
        }
        .stat-item { text-align: center; }
        .stat-num { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--ink); }
        .stat-label { font-size: 0.75rem; color: var(--warm-gray); text-transform: uppercase; letter-spacing: 0.08em; }
        .footer {
          text-align: center; padding: 2rem 1.5rem;
          font-size: 0.8rem; color: var(--parchment);
          background-image: url(/pattern.png); background-size: cover; background-position: center;
        }
        .footer strong { color: var(--parchment); font-family: 'Playfair Display', serif; }

        @media (max-width: 700px) {
          .results-split { grid-template-columns: 1fr; }
          .detail-panel { position: static; }
          .detail-fields { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .topbar { padding: 0 1.2rem; }
          .search-card { padding: 1.5rem; }
          .stats-strip { gap: 1.5rem; }
        }
      `}</style>

      {/* ── TOPBAR ─────────────────────────────────────── */}
      <nav className="topbar">
        <a href="/" className="topbar-brand">
          <img src="/Landing-page-logo.png" alt="NEMCO Library" className="topbar-brand-icon" />
        </a>
        <div className="topbar-nav">
          <a href="/login" className="login-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            Admin Login
          </a>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-bg-circle" />
          <div className="hero-bg-circle" />
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            Find Any Book,<br /><em>Instantly.</em>
          </h1>
          <p className="hero-subtitle">
            Search our entire library collection by title or author.
            Discover availability, shelf location, and more — all in one place.
          </p>

          {/* ── SEARCH CARD ──────────────────────────────── */}
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
                  onClick={() => { setQuery(""); setSuggestions([]); setShowDropdown(true); inputRef.current?.focus(); }}
                  aria-label="Clear search"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}

              {/* ── Dropdown ─────────────────────────────── */}
              {dropdownVisible && (
                <div className="search-dropdown" role="listbox">
                  {/* Suggestions while typing */}
                  {showSuggestions && (
                    <>
                      <div className="dropdown-section-label">Suggestions</div>
                      {sugLoading ? (
                        <div className="dropdown-loading">
                          <div style={{ width:14,height:14,border:"2px solid #e8e0d5",borderTopColor:"var(--gold)",borderRadius:"50%",animation:"spin 0.6s linear infinite" }} />
                          Searching…
                        </div>
                      ) : suggestions.map((sug, i) => (
                        <button
                          key={sug}
                          type="button"
                          role="option"
                          className={`dropdown-item${i === activeSugIdx ? " active" : ""}`}
                          onClick={() => pickSuggestion(sug)}
                          onMouseEnter={() => setActiveSugIdx(i)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          </svg>
                          <span>{highlight(sug, query)}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Recent history when input is empty */}
                  {showHistory && (
                    <>
                      <div className="dropdown-section-label">Recent Searches</div>
                      {history.map((h, i) => (
                        <div
                          key={h}
                          className={`dropdown-item${i === activeSugIdx ? " active" : ""}`}
                          onMouseEnter={() => setActiveSugIdx(i)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10"/>
                            <path d="M3.51 15a9 9 0 1 0 .49-4"/>
                          </svg>
                          <span style={{ flex:1, cursor:"pointer" }} onClick={() => pickSuggestion(h)}>{h}</span>
                          <button
                            type="button"
                            className="dropdown-item-remove"
                            onClick={e => { e.stopPropagation(); removeHistory(h); setHistory(getHistory()); }}
                            aria-label={`Remove ${h} from history`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="search-actions">
              <button className="btn-search" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <div style={{ width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.6s linear infinite" }} />
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
        </div>
      </section>

      {/* ── RESULTS ────────────────────────────────────── */}
      {searched && (
        <section className="results-section" ref={resultsRef}>
          <div className="results-header">
            <div className="results-count">
              {loading
                ? "Searching…"
                : <><span>{results.length}</span> result{results.length !== 1 ? "s" : ""} found</>}
            </div>
          </div>

          {loading ? (
            <div className="state-box">
              <div className="spinner" />
              <div className="state-box-title">Searching the collection…</div>
            </div>
          ) : results.length === 0 ? (
            <div className="state-box">
              <div className="state-box-icon">🔍</div>
              <div className="state-box-title">No results found</div>
              <div className="state-box-text">Try a different title or author name.</div>
            </div>
          ) : (
            <div className="results-split">
              {/* LEFT — list */}
              <div className="results-list">
                {results.map((book, i) => {
                  const sc       = statusColor(book);
                  const isLexora = book.source === "lexora";
                  const isActive = selectedBook?.id === book.id && selectedBook?.source === book.source;
                  return (
                    <div
                      className={`result-row${isActive ? " active" : ""}`}
                      key={`${book.source}-${book.id ?? i}`}
                      onClick={() => setSelectedBook(book)}
                    >
                      <div className="result-row-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                      </div>
                      <div className="result-row-body">
                        <div className="result-row-title">{book.title}</div>
                        {book.author && <div className="result-row-author">{book.author}</div>}
                        <div className="result-row-badges">
                          <span className={`row-source-dot ${isLexora ? "lexora" : "nemco"}`} />
                          <span className={`row-source-label ${isLexora ? "lexora" : "nemco"}`}>
                            {isLexora ? "Lexora" : "NEMCO"}
                          </span>
                          {!isLexora && (
                            <span className="row-status-pill" style={{ background: sc.bg, color: sc.text }}>
                              {sc.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* RIGHT — detail panel */}
              <div className="detail-panel">
                {!selectedBook ? (
                  <div className="detail-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    <p>Select a book from the list to view details</p>
                  </div>
                ) : (() => {
                  const b        = selectedBook;
                  const sc       = statusColor(b);
                  const isLexora = b.source === "lexora";
                  const isNemco  = b.source === "nemco";
                  return (
                    <>
                      <div>
                        {isNemco && (
                          <span className="detail-source-badge nemco">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            </svg>
                            NEMCO Library
                          </span>
                        )}
                        {isLexora && (
                          <span className="detail-source-badge lexora">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            Lexora Digital
                            {b.resource_type && <span className="detail-resource-type">{b.resource_type}</span>}
                          </span>
                        )}
                      </div>

                      <div className="detail-title">{b.title}</div>
                      {b.author && <div className="detail-author">by {b.author}</div>}

                      {isNemco && (
                        <div className="detail-status-row">
                          <span style={{ display:"inline-flex",alignItems:"center",gap:"0.35rem",padding:"0.3rem 0.8rem",borderRadius:"100px",fontSize:"0.78rem",fontWeight:500,background:sc.bg,color:sc.text }}>
                            <span style={{ width:7,height:7,borderRadius:"50%",background:"currentColor",display:"inline-block" }} />
                            {sc.label}
                          </span>
                          {b.shelf && (
                            <span className="detail-shelf">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="3" width="7" height="18"/>
                                <rect x="9" y="3" width="7" height="18"/>
                                <rect x="16" y="3" width="6" height="18"/>
                              </svg>
                              Shelf {b.shelf}
                            </span>
                          )}
                        </div>
                      )}

                      {isNemco && b.total_copies > 0 && (
                        <div className="detail-copies" style={{ marginBottom:"0.75rem" }}>
                          <strong>{b.available_copies}</strong> of {b.total_copies} {b.total_copies === 1 ? "copy" : "copies"} available
                        </div>
                      )}

                      <hr className="detail-divider" />

                      <div className="detail-fields">
                        {isNemco && b.accessionNumber && (
                          <div>
                            <div className="detail-field-label">Accession No.</div>
                            <div className="detail-field-value">{b.accessionNumber}</div>
                          </div>
                        )}
                        {isNemco && b.callNumber && (
                          <div>
                            <div className="detail-field-label">Call No.</div>
                            <div className="detail-field-value">{b.callNumber}</div>
                          </div>
                        )}
                        {isNemco && b.total_copies > 0 && (
                          <div>
                            <div className="detail-field-label">No. of Copies</div>
                            <div className="detail-field-value">{b.total_copies}</div>
                          </div>
                        )}
                        {isNemco && b.year && (
                          <div>
                            <div className="detail-field-label">Published</div>
                            <div className="detail-field-value">{formatYear(b.year)}</div>
                          </div>
                        )}
                        {isNemco && b.pages && (
                          <div>
                            <div className="detail-field-label">Pages</div>
                            <div className="detail-field-value">{b.pages}</div>
                          </div>
                        )}
                        {isNemco && b.sublocation && (
                          <div>
                            <div className="detail-field-label">Sublocation</div>
                            <div className="detail-field-value">{b.sublocation}</div>
                          </div>
                        )}
                        {isNemco && b.isbn && (
                          <div>
                            <div className="detail-field-label">ISBN</div>
                            <div className="detail-field-value">{b.isbn}</div>
                          </div>
                        )}
                        {isLexora && b.year && (
                          <div>
                            <div className="detail-field-label">Year</div>
                            <div className="detail-field-value">{formatYear(b.year)}</div>
                          </div>
                        )}
                        {isLexora && b.collection && (
                          <div>
                            <div className="detail-field-label">Collection</div>
                            <div className="detail-field-value">{b.collection}</div>
                          </div>
                        )}
                        {isLexora && (b.source_url || b.publisher) && (
                          <div className="detail-field-full">
                            <div className="detail-field-label">Source</div>
                            <div className="detail-field-value">
                              <a href={b.source_url || b.publisher} target="_blank" rel="noopener noreferrer"
                                style={{ color:"var(--gold)",wordBreak:"break-all",fontSize:"0.82rem" }}>
                                {b.source_url || b.publisher}
                              </a>
                            </div>
                          </div>
                        )}
                        {isLexora && b.resource_type && (
                          <div>
                            <div className="detail-field-label">Resource Type</div>
                            <div className="detail-field-value">{b.resource_type}</div>
                          </div>
                        )}
                        {isLexora && b.program && (
                          <div>
                            <div className="detail-field-label">Program</div>
                            <div className="detail-field-value">{b.program}</div>
                          </div>
                        )}
                        {isLexora && b.subject_course && (
                          <div className="detail-field-full">
                            <div className="detail-field-label">Subject / Course</div>
                            <div className="detail-field-value">{b.subject_course}</div>
                          </div>
                        )}
                        {isLexora && b.format && (
                          <div>
                            <div className="detail-field-label">Format</div>
                            <div className="detail-field-value">{b.format}</div>
                          </div>
                        )}
                      </div>

                      {isLexora && (
                        <a href={b.source_url || "https://lexoradigital.io/library/"} target="_blank" rel="noopener noreferrer" className="detail-lexora-btn">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Find on Lexora Digital
                        </a>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── STATS STRIP ────────────────────────────────── */}
      {!searched && (
        <div className="stats-strip">
          {[["10,000+","Books"],["500+","Authors"],["24/7","Access"],["100%","Free"]].map(([n,l]) => (
            <div className="stat-item" key={l}>
              <div className="stat-num">{n}</div>
              <div className="stat-label">{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────── */}
      <footer className="footer">
        © {new Date().getFullYear()} <strong>Lexora</strong> — Library Management System
      </footer>
    </>
  );
}