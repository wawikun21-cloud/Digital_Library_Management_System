/**
 * features/transactions/components/TransactionSummaryCards.jsx
 *
 * Total / Borrowed / Returned / Overdue summary pills. Extracted from the
 * former pages/Borrowed.jsx.
 */

import { BookOpen, Clock, CheckCircle2, CalendarClock } from "lucide-react";

export default function TransactionSummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Total",    value: summary.total,    color: "#32667F",  icon: BookOpen    },
        { label: "Borrowed", value: summary.borrowed, color: "#32667F",  icon: Clock       },
        { label: "Returned", value: summary.returned, color: "#2d7a4f",  icon: CheckCircle2},
        { label: "Overdue",  value: summary.overdue,  color: "#c05a0a",  icon: CalendarClock},
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label}
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <p className="text-xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
