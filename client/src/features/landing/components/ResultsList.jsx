/**
 * features/landing/components/ResultsList.jsx
 *
 * Left-hand result rows. Extracted from the former landing/landingpage.jsx.
 */

import { statusColor } from "../utils/bookDisplay";

export default function ResultsList({ results, selectedBook, onSelect }) {
  return (
    <div className="results-list">
      {results.map((book, i) => {
        const sc       = statusColor(book);
        const isLexora = book.source === "lexora";
        const isActive = selectedBook?.id === book.id && selectedBook?.source === book.source;
        return (
          <div
            className={`result-row${isActive ? " active" : ""}`}
            key={`${book.source}-${book.id ?? i}`}
            onClick={() => onSelect(book)}
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
  );
}
