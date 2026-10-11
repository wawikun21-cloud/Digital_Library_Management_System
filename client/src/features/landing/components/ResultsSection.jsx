/**
 * features/landing/components/ResultsSection.jsx
 *
 * Results area: count header, loading / error / empty states and the
 * list + detail split. Extracted from the former landing/landingpage.jsx.
 */

import ResultsList from "./ResultsList";
import BookDetailPanel from "./BookDetailPanel";

export default function ResultsSection({ resultsRef, loading, searchError, results, selectedBook, onSelect }) {
  return (
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
      ) : searchError ? (
        <div className="state-box">
          <div className="state-box-icon">⚠️</div>
          <div className="state-box-title">Something went wrong</div>
          <div className="state-box-text">{searchError}</div>
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
          <ResultsList results={results} selectedBook={selectedBook} onSelect={onSelect} />

          {/* RIGHT — detail panel */}
          <div className="detail-panel">
            <BookDetailPanel book={selectedBook} />
          </div>
        </div>
      )}
    </section>
  );
}
