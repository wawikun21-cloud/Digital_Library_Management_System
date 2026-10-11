/**
 * features/students/components/StudentsStatsCards.jsx
 *
 * Total / top course / year-level stat cards. Extracted from the former
 * pages/Students.jsx.
 */

import { User, Building2, GraduationCap } from "lucide-react";

const YR_COLORS = [
  { bg: "rgba(59,130,246,0.1)",  text: "#2563eb", label: "1st Year" },
  { bg: "rgba(16,185,129,0.1)",  text: "#059669", label: "2nd Year" },
  { bg: "rgba(168,85,247,0.1)",  text: "#7c3aed", label: "3rd Year" },
  { bg: "rgba(239,68,68,0.1)",   text: "#dc2626", label: "4th Year" },
];

export default function StudentsStatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Students */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(30,58,123,0.1)" }}>
          <User size={16} style={{ color: "#1e3a7b" }} />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: "var(--text-muted)" }}>Total</p>
          <p className="text-[20px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{stats.total}</p>
          <p className="text-[10.5px]" style={{ color: "var(--text-muted)" }}>students enrolled</p>
        </div>
      </div>

      {/* Top Course */}
      {stats.byCourse.slice(0, 1).map((course) => (
        <div key={course.student_course}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(238,162,58,0.12)" }}>
            <Building2 size={16} style={{ color: "#b87a1a" }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: "var(--text-muted)" }}>Top Course</p>
            <p className="text-[20px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{course.count}</p>
            <p className="text-[10.5px] font-semibold truncate" style={{ color: "#b87a1a" }}>{course.student_course}</p>
          </div>
        </div>
      ))}

      {/* Year Level Cards */}
      {stats.byYearLevel.slice(0, 4).map((yearLevel, idx) => {
        const c = YR_COLORS[idx] || YR_COLORS[0];
        const shortLabel = yearLevel.student_yr_level?.replace(" Year", "yr") || c.label;
        return (
          <div key={yearLevel.student_yr_level}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "var(--bg-surface)", border: `1px solid var(--border)` }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: c.bg }}>
              <GraduationCap size={16} style={{ color: c.text }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide leading-none" style={{ color: "var(--text-muted)" }}>{yearLevel.student_yr_level}</p>
              <p className="text-[20px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{yearLevel.count}</p>
              <p className="text-[10.5px] font-semibold" style={{ color: c.text }}>students</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
