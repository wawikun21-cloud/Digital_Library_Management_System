/**
 * features/analytics/components/dashboard/DashboardFilterBar.jsx
 *
 * School-year / semester / month filter bar. Extracted from the former
 * pages/Dashboard.jsx (was `FilterBar`).
 */

import { Calendar, RefreshCw } from "lucide-react";
import { SEMESTERS, SEM_MONTHS, SCHOOL_YEARS } from "../../constants/schoolCalendar";

export default function DashboardFilterBar({ schoolYear, onSchoolYear, semester, month, onSemester, onMonth, onRefresh }) {
  const months = ["All", ...SEM_MONTHS[semester]];
  return (
    <div className="rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2.5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-1.5">
        <Calendar size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Filter
        </span>
      </div>

      {/* School Year */}
      <select
        value={schoolYear}
        onChange={e => { onSchoolYear(e.target.value); onMonth("All"); }}
         className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 outline-none cursor-pointer"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
        {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
      </select>

      <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Semester toggle */}
      <div className="flex gap-0.5 p-0.5 rounded-lg"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        {SEMESTERS.map(s => (
          <button key={s} onClick={() => { onSemester(s); onMonth("All"); }}
            className="px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150"
            style={{
              background: semester === s ? "var(--accent-amber)" : "transparent",
              color:      semester === s ? "#fff" : "var(--text-secondary)",
              boxShadow:  semester === s ? "0 2px 6px rgba(238,162,58,0.35)" : "none",
            }}>
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Month chips */}
      <div className="flex flex-wrap gap-1">
        {months.map(m => (
          <button key={m} onClick={() => onMonth(m)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
            style={{
              background: month === m ? "var(--accent-amber)" : "var(--bg-subtle)",
              color:      month === m ? "#fff" : "var(--text-secondary)",
              border:     `1px solid ${month === m ? "var(--accent-amber)" : "var(--border-light)"}`,
              boxShadow:  month === m ? "0 2px 6px rgba(238,162,58,0.35)" : "none",
            }}>
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Refresh */}
      <button onClick={onRefresh}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}
        title="Refresh data">
        <RefreshCw size={12} />
      </button>
    </div>
  );
}
