/**
 * features/faculty/components/FacultyDeptTabs.jsx
 *
 * Department filter tabs with live counts. Extracted from the former
 * pages/Faculty.jsx.
 */

import { BookOpen } from "lucide-react";
import { DEPARTMENTS } from "../constants/facultyUi";
import { departmentCount } from "../utils/facultyFilters";

export default function FacultyDeptTabs({ faculty, activeDept, onSelectDept }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Label */}
        <div className="flex items-center gap-1.5 mr-1">
          <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Department
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 self-center" style={{ background: "var(--border)" }} />

        {/* All + department tabs */}
        {["All", ...DEPARTMENTS.map(d => d.code)].map(dept => {
          const isActive = activeDept === dept;
          const count = departmentCount(faculty, dept);
          return (
            <button
              key={dept}
              onClick={() => onSelectDept(dept)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150"
              style={isActive ? {
                background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(30,58,123,0.35)",
                border: "1px solid transparent",
              } : {
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={e => {
                if (!isActive) { e.currentTarget.style.borderColor = "#2d4fa3"; e.currentTarget.style.color = "#2d4fa3"; }
              }}
              onMouseLeave={e => {
                if (!isActive) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }
              }}
            >
              {dept}
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                style={isActive ? {
                  background: "rgba(255,255,255,0.25)", color: "#ffffff",
                } : {
                  background: "var(--bg-input)", color: "var(--text-muted)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
