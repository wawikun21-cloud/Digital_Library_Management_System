/**
 * features/analytics/components/book-dashboard/BookFilterControls.jsx
 *
 * Toolbar filters for the book dashboard: date range, genre, collection and
 * a clear button. Extracted from the inline filter bar of the former
 * pages/BookDashboard.jsx. Emits patch objects; the page owns the state.
 */

import { X } from "lucide-react";

const labelStyle = { fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" };
const inputStyle = { fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" };
const selectStyle = { ...inputStyle, fontWeight: 500, padding: "3px 24px 3px 8px", cursor: "pointer" };

export default function BookFilterControls({ globalFilter, onChange, onClear, genreOptions, collectionOptions }) {
  const hasFilters =
    globalFilter.genre !== "All" ||
    globalFilter.collection !== "All" ||
    globalFilter.dateFrom ||
    globalFilter.dateTo;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      {hasFilters && (
        <button
          onClick={onClear}
          style={{
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
            cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
            background: "rgba(239,68,68,.06)", color: "#ef4444",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <X size={11} /> Clear Filters
        </button>
      )}

      {/* Date Range */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>Date Range</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="date" value={globalFilter.dateFrom}
            onChange={e => onChange({ dateFrom: e.target.value })}
            style={inputStyle} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>
          <input type="date" value={globalFilter.dateTo}
            onChange={e => onChange({ dateTo: e.target.value })}
            style={inputStyle} />
        </div>
      </div>

      {/* Genre */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>Genre</span>
        <select value={globalFilter.genre}
          onChange={e => onChange({ genre: e.target.value })}
          style={selectStyle}>
          {["All", ...genreOptions].map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Collection */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>Collection</span>
        <select value={globalFilter.collection}
          onChange={e => onChange({ collection: e.target.value })}
          style={selectStyle}>
          {["All", ...collectionOptions].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    </div>
  );
}
