/**
 * features/landing/components/SearchDropdown.jsx
 *
 * Suggestions / recent-history dropdown. Presentational — all state lives in
 * SearchCard. Extracted from the former landing/landingpage.jsx.
 */

import { highlight } from "../utils/bookDisplay";

export default function SearchDropdown({
  showSuggestions, showHistory,
  suggestions, sugLoading,
  history,
  activeIdx, query,
  onPick, onRemoveHistory, onHoverIdx,
}) {
  return (
    <div className="search-dropdown" role="listbox">
      {/* Suggestions while typing */}
      {showSuggestions && (
        <>
          <div className="dropdown-section-label">Suggestions</div>
          {sugLoading ? (
            <div className="dropdown-loading">
              <div style={{ width: 14, height: 14, border: "2px solid #e8e0d5", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
              Searching…
            </div>
          ) : suggestions.map((sug, i) => (
            <button
              key={sug}
              type="button"
              role="option"
              className={`dropdown-item${i === activeIdx ? " active" : ""}`}
              onClick={() => onPick(sug)}
              onMouseEnter={() => onHoverIdx(i)}
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
              className={`dropdown-item${i === activeIdx ? " active" : ""}`}
              onMouseEnter={() => onHoverIdx(i)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/>
                <path d="M3.51 15a9 9 0 1 0 .49-4"/>
              </svg>
              <span style={{ flex: 1, cursor: "pointer" }} onClick={() => onPick(h)}>{h}</span>
              <button
                type="button"
                className="dropdown-item-remove"
                onClick={e => { e.stopPropagation(); onRemoveHistory(h); }}
                aria-label={`Remove ${h} from history`}
              >
                ×
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
