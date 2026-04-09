import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Clock, X } from 'lucide-react';
import useDebounce from '../hooks/useDebounce.js';

/**
 * Reusable autocomplete field like landingpage search.
 * @param {Object} props
 * @param {string} props.field - 'title' or 'authors' for backend param
 * @param {string} props.value - Controlled value
 * @param {Function} props.onChange - (value) => void
 * @param {string} props.placeholder
 * @param {Object} props.style - Input styles
 * @param {boolean} props.hasError
 */
export default function AutocompleteField({ field, value, onChange, placeholder = '', style = {}, hasError = false }) {
  const HISTORY_KEY = `bookform_${field}_history`;
  const MAX_HISTORY = 5;
  const DEBOUNCE_MS = 300;

  // ── Input state ──
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── FIX 1: Declare missing state ──
  const [activeIdx, setActiveIdx] = useState(-1);

  // ── FIX 2: Declare missing refs ──
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── FIX 3: Declare debouncedQuery by actually calling the hook ──
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // ── History helpers ──
  const getHistory = useCallback(() => {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }, [HISTORY_KEY]);

  const addHistory = useCallback((term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const prev = getHistory().filter(h => h !== trimmed);
    const next = [trimmed, ...prev].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, [getHistory]);

  const removeHistory = useCallback((term) => {
    const next = getHistory().filter(h => h !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }, [getHistory]);

  // ── Load history on mount ──
  useEffect(() => {
    setHistory(getHistory());
  }, [getHistory]);

  // ── Sync controlled value ──
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // ── Fetch suggestions ──
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}&field=${field}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.success) setSuggestions(data.data);
      })
      .catch(() => !cancelled && setSuggestions([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [debouncedQuery, field]);

  // ── Close on outside click ──
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Keyboard nav ──
  const handleKeyDown = useCallback((e) => {
    const items = debouncedQuery.length >= 2 ? suggestions : history;
    if (!showDropdown || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) {
        selectItem(items[activeIdx]);
      } else {
        selectItem(query.trim());
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  }, [debouncedQuery, suggestions, history, showDropdown, activeIdx, query]);

  const selectItem = useCallback((item) => {
    onChange(item);
    addHistory(item);
    setHistory(getHistory());
    setShowDropdown(false);
    setSuggestions([]);
    setActiveIdx(-1);
    inputRef.current?.blur();
  }, [onChange, addHistory, getHistory]);

  const handleFocus = () => {
    setShowDropdown(true);
    setActiveIdx(-1);
    setHistory(getHistory());
  };

  const highlightMatch = (text, keyword) => {
    if (!keyword) return text;
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong style={{ color: '#f7c14f' }}>{text.slice(idx, idx + keyword.length)}</strong>
        {text.slice(idx + keyword.length)}
      </>
    );
  };

  const showSuggestionsList = debouncedQuery.length >= 2 && suggestions.length > 0;
  const showHistoryList = debouncedQuery.length === 0 && history.length > 0;
  const visible = showDropdown && (showSuggestionsList || showHistoryList);
  const items = showSuggestionsList ? suggestions : history;

  return (
    <div className="relative">
      <div className="field-icon absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
        <Search size={14} className="text-gray-500" />
      </div>
      <input
        ref={inputRef}
        className={`w-full pl-10 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 transition-all ${hasError ? 'border-red-400' : 'border-gray-300 focus:border-amber-500'}`}
        style={style}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-expanded={visible}
      />
      {query && (
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          onClick={() => {
            setQuery('');
            onChange('');
            setShowDropdown(true);
          }}
          aria-label="Clear"
        >
          <X size={14} className="text-gray-500" />
        </button>
      )}
      {visible && (
        <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-[1000] max-h-[220px] overflow-y-auto pr-1">
          {showSuggestionsList && (
            <>
              <div className="px-3 py-2 text-xs font-bold uppercase text-gray-500 tracking-wide border-b border-gray-100">
                Suggestions
              </div>
              {loading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin" />
                  Loading...
                </div>
              ) : (
                suggestions.map((sug, i) => (
                  <button
                    key={sug}
                    type="button"
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 flex items-center gap-2 transition-colors ${i === activeIdx ? 'bg-amber-50' : ''}`}
                    onClick={() => selectItem(sug)}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    <Search size={12} className="text-gray-400 flex-shrink-0" />
                    <span>{highlightMatch(sug, debouncedQuery)}</span>
                  </button>
                ))
              )}
            </>
          )}
          {showHistoryList && (
            <>
              <div className="px-3 py-2 text-xs font-bold uppercase text-gray-500 tracking-wide border-b border-gray-100">
                Recent Searches
              </div>
              {history.map((item, i) => (
                <div key={item} className={`flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${i === activeIdx ? 'bg-amber-50' : ''}`}>
                  <Clock size={12} className="text-gray-400 flex-shrink-0" />
                  <span className="flex-1 cursor-pointer" onClick={() => selectItem(item)}>
                    {item}
                  </span>
                  <button
                    type="button"
                    className="p-1 hover:bg-red-100 hover:text-red-600 rounded-full transition-colors text-gray-400 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHistory(item);
                      setHistory(getHistory());
                    }}
                    aria-label={`Remove ${item}`}
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
  );
}