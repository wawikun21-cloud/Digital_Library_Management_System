/**
 * features/attendance/components/AttendanceStatsCards.jsx
 *
 * Header stats grid (total visits / in library / total hours / checked out
 * today). Extracted from the former pages/Attendance.jsx.
 */

import { BookOpen, Users, Timer, CheckCircle2 } from "lucide-react";

export default function AttendanceStatsCards({ stats }) {
  if (!stats) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total Visits",      value: stats.total,                                       color: "#3b82f6", icon: BookOpen     },
        { label: "In Library Now",    value: stats.active,                                      color: "#22c55e", icon: Users        },
        { label: "Total Hours",       value: `${Math.round((stats.totalDuration || 0) / 60)}h`, color: "#EEA23A", icon: Timer        },
        { label: "Checked Out Today", value: stats.checkedOut,                                  color: "#a855f7", icon: CheckCircle2 },
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}1a` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
