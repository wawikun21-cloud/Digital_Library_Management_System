/**
 * features/students/components/StudentsSchoolYearFilter.jsx
 *
 * School-year dropdown card with the filtered count badge. Extracted from
 * the former pages/Students.jsx.
 */

import { FileText, ChevronDown } from "lucide-react";

export default function StudentsSchoolYearFilter({ schoolYears, selectedSY, onSelectSY, filteredCount }) {
  if (schoolYears.length === 0) return null;

  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Label */}
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            School Year
          </span>
        </div>

        {/* Dropdown */}
        <div className="relative">
          <select
            value={selectedSY || ""}
            onChange={(e) => onSelectSY(e.target.value)}
            className="pl-3 pr-10 py-2 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors cursor-pointer min-w-[140px]"
            style={{
              background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)",
              color: "#ffffff",
              border: "1px solid transparent",
              boxShadow: "0 2px 8px rgba(30,58,123,0.35)",
            }}
          >
            <option value="" style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
              All School Years
            </option>
            {schoolYears.map(sy => (
              <option key={sy} value={sy} style={{ background: "var(--bg-surface)", color: "var(--text-primary)" }}>
                {sy}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#ffffff", opacity: 0.85 }} />
        </div>

        {/* Count Badge */}
        <span
          className="text-xs px-2 py-1 rounded-lg font-semibold"
          style={{
            background: "var(--bg-subtle)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {filteredCount} student{filteredCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
