/**
 * features/landing/components/BookDetailPanel.jsx
 *
 * Right-hand detail panel for the selected result. Extracted from the IIFE
 * that previously rendered it inline (`{!selectedBook ? … : (() => { … })()}`)
 * in the former landing/landingpage.jsx.
 */

import CopiesBlock from "./CopiesBlock";
import { statusColor, formatYear } from "../utils/bookDisplay";

export default function BookDetailPanel({ book }) {
  if (!book) {
    return (
      <div className="detail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        <p>Select a book from the list to view details</p>
      </div>
    );
  }

  const b        = book;
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
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.8rem", borderRadius: "100px", fontSize: "0.78rem", fontWeight: 500, background: sc.bg, color: sc.text }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
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

      {/* {isNemco && b.total_copies > 0 && (
        <div className="detail-copies" style={{ marginBottom:"0.75rem" }}>
          <strong>{b.available_copies}</strong> of {b.total_copies} {b.total_copies === 1 ? "copy" : "copies"} available
        </div>
      )} */}

      <hr className="detail-divider" />

      <div className="detail-fields " style={{ marginBottom: "0.75rem" }}>
        {/* {isNemco && b.accessionNumber && (

        <div>
          <div className="detail-field-label">Accession No.</div>
          <div className="detail-field-value">{b.accessionNumber}</div>
        </div>
      )} */}
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
        {/* {isLexora && b.collection && (
          <div>
            <div className="detail-field-label">Collection</div>
            <div className="detail-field-value">{b.collection}</div>
          </div>
        )} */}
        {isLexora && (b.source_url || b.publisher) && (
          <div className="detail-field-full">
            <div className="detail-field-label">Source</div>
            <div className="detail-field-value">
              <a href={b.source_url || b.publisher} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--gold)", wordBreak: "break-all", fontSize: "0.82rem" }}>
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

      {/* Physical Copies section */}
      {isNemco && (
        <CopiesBlock bookId={b.id} />
      )}

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
}
