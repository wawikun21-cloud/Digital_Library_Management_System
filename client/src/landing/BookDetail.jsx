import { Shelf, Download } from "lucide-react";

function statusColor(book) {
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
}

function formatYear(val) {
  if (!val) return null;
  if (typeof val === "string" && val.includes("-")) return val.slice(0, 4);
  return String(val);
}

export default function BookDetail({ book }) {
  if (!book) return (
    <div className="detail-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
      <p>Select a book from the list to view details</p>
    </div>
  );

  const sc       = statusColor(book);
  const isLexora = book.source === "lexora";
  const isNemco  = book.source === "nemco";

  return (
    <div className="detail-panel">
      {/* Source badge */}
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
            {book.resource_type && (
              <span className="detail-resource-type">{book.resource_type}</span>
            )}
          </span>
        )}
      </div>

      {/* Title & author */}
      <div className="detail-title">{book.title}</div>
      {book.author && <div className="detail-author">by {book.author}</div>}

      {/* Status & shelf */}
      {isNemco && (
        <div className="detail-status-row">
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            padding: "0.3rem 0.8rem", borderRadius: "100px",
            fontSize: "0.78rem", fontWeight: 500,
            background: sc.bg, color: sc.text
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", background: "currentColor"
            }} />
            {sc.label}
          </span>
          {book.shelf && (
            <span className="detail-shelf">
              <Shelf size={14} />
              Shelf {book.shelf}
            </span>
          )}
        </div>
      )}

      {/* Copies */}
      {isNemco && book.total_copies > 0 && (
        <div className="detail-copies" style={{ marginBottom: "0.75rem" }}>
          <strong>{book.available_copies}</strong> of {book.total_copies} 
          {book.total_copies === 1 ? "copy" : "copies"} available
        </div>
      )}

      <hr className="detail-divider" />

      {/* Fields grid */}
      <div className="detail-fields">
        {book.isbn && (
          <div>
            <div className="detail-field-label">ISBN</div>
            <div className="detail-field-value">{book.isbn}</div>
          </div>
        )}

        {formatYear(book.year) && (
          <div>
            <div className="detail-field-label">Year</div>
            <div className="detail-field-value">{formatYear(book.year)}</div>
          </div>
        )}

        {book.genre && (
          <div>
            <div className="detail-field-label">Genre</div>
            <div className="detail-field-value">{book.genre}</div>
          </div>
        )}

        {book.publisher && (
          <div>
            <div className="detail-field-label">Publisher</div>
            <div className="detail-field-value">{book.publisher}</div>
          </div>
        )}

        {book.pages && (
          <div>
            <div className="detail-field-label">Pages</div>
            <div className="detail-field-value">{book.pages}</div>
          </div>
        )}

        {book.description && (
          <div className="detail-field-full">
            <div className="detail-field-label">Description</div>
            <div className="detail-field-value" style={{ 
              lineHeight: 1.5, fontSize: "0.88rem"
            }}>
              {book.description}
            </div>
          </div>
        )}

        {isLexora && (
          <div className="detail-field-full">
            <a href={`/books/${book.id}`} className="detail-lexora-btn">
              <Download size={15} />
              View Full Details
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
