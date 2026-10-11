/**
 * features/faculty/components/FacultyStatsCards.jsx
 *
 * Total + per-department stat cards (clicking a card filters by that
 * department). Extracted from the former pages/Faculty.jsx.
 */

import { Users, BookOpen } from "lucide-react";
import { DEPT_COLORS, DEFAULT_COLOR } from "../constants/facultyUi";

export default function FacultyStatsCards({ stats, isLoading, onSelectDept }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Total Faculty */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "rgba(30,58,123,0.1)" }}>
          <Users size={16} style={{ color: "#1e3a7b" }} />
        </div>
        <div>
          <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{isLoading ? "—" : stats.total}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Total Faculty</p>
        </div>
      </div>

      {/* Department cards */}
      {stats.byDept.slice(0, 5).map((dept) => {
        const c = DEPT_COLORS[dept.code] || DEFAULT_COLOR;
        return (
          <div key={dept.code}
            className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:shadow-md transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
            onClick={() => onSelectDept(dept.code)}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: c.bg }}>
              <BookOpen size={16} style={{ color: c.text }} />
            </div>
            <div>
              <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{dept.count}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{dept.code}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
