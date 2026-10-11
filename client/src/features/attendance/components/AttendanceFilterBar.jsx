/**
 * features/attendance/components/AttendanceFilterBar.jsx
 *
 * Toolbar filters: date range, program, year level, school year, clear.
 * Extracted from the inline filter bar of the former
 * pages/AttendanceDashboard.jsx. Emits patch objects; the page owns state.
 */

import { X } from "lucide-react";

const labelStyle = { fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" };
const inputStyle = { fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" };
const selectStyle = { fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" };

const YEAR_LEVELS = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function AttendanceFilterBar({ globalFilter, onChange, onClear, programOptions, schoolYearOptions }) {
  const hasFilters =
    globalFilter.program !== "All" ||
    globalFilter.yrLevel !== "All" ||
    globalFilter.schoolYear !== "All" ||
    globalFilter.dateFrom ||
    globalFilter.dateTo;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>Course / Program</span>
        <select value={globalFilter.program} onChange={e => onChange({ program: e.target.value })} style={selectStyle}>
          {["All", ...programOptions].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>Year Level</span>
        <select value={globalFilter.yrLevel} onChange={e => onChange({ yrLevel: e.target.value })} style={selectStyle}>
          {YEAR_LEVELS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={labelStyle}>School Year</span>
        <select value={globalFilter.schoolYear} onChange={e => onChange({ schoolYear: e.target.value })} style={selectStyle}>
          {["All", ...schoolYearOptions].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <button onClick={onClear}
          style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
          <X size={11} /> Clear Filters
        </button>
      )}
    </div>
  );
}
