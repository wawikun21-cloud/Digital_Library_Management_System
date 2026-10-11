/**
 * features/attendance/components/ActiveStudentsTable.jsx
 *
 * "Currently In Library" table with per-row check-out. Extracted from the
 * former pages/Attendance.jsx.
 */

import { CheckCircle2, ArrowLeft } from "lucide-react";
import { getInitials } from "../utils/studentName";
import { fmtDateTime } from "../utils/attendanceDateTime";

export default function ActiveStudentsTable({ active, onCheckOut }) {
  if (active.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <CheckCircle2 size={14} style={{ color: "#2d7a47" }} />
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Currently In Library
        </span>
        <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: "rgba(45,122,71,.12)", color: "#2d7a47" }}>
          {active.length}
        </span>
      </div>
      <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--border)" }}>
        <table className="min-w-full" style={{ borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
            <tr>
              {["Student", "ID", "Course", "Year", "School Year", "Check In", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody style={{ background: "var(--bg-surface)" }}>
            {active.map((s) => (
              <tr key={s.id} className="transition-colors group"
                style={{ borderBottom: "1px solid var(--border-light)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(45,122,71,0.15)", border: "1px solid rgba(45,122,71,0.25)" }}>
                      <span className="text-xs font-bold" style={{ color: "#2d7a47" }}>{getInitials(s.student_name)}</span>
                    </div>
                    <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.student_name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{s.student_id_number}</td>
                <td className="px-4 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{s.student_course || "—"}</td>
                <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{s.student_yr_level || "—"}</td>
                <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{s.school_year || "—"}</td>
                <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{fmtDateTime(s.check_in_time)}</td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <button
                    onClick={() => onCheckOut(s.student_id_number)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    style={{ background: "rgba(45,122,71,0.12)", color: "#2d7a47", border: "1px solid rgba(45,122,71,0.25)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(45,122,71,0.22)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(45,122,71,0.12)"; }}
                  >
                    <ArrowLeft size={11} /> Check Out
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
