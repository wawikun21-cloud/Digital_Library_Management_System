/**
 * features/analytics/components/book-dashboard/StatusDonut.jsx
 *
 * Copies-by-status donut with legend and centre total. Extracted from the
 * former pages/BookDashboard.jsx.
 */

import { AlertCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import SectionCard from "../../../../components/ui/SectionCard";
import BookPieTooltip from "./BookPieTooltip";
import { C } from "../../constants/bookDashboardPalette";
import { formatNum } from "../../utils/formatUtils";

export default function StatusDonut({ statusData, loading, error, totalCopies }) {
  return (
    <SectionCard title="Copies by Status">
      <div style={{ height: 200, position: "relative" }}>
        {loading ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
            Loading…
          </div>
        ) : error && statusData.length === 0 ? (
          <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <AlertCircle size={18} color={C.rose} />
            <span style={{ fontSize: 11, color: C.rose }}>Failed to load status data</span>
          </div>
        ) : (
          <>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={statusData} dataKey="count" nameKey="status"
                   cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                   paddingAngle={4} stroke="var(--bg-surface)" strokeWidth={2}
                 >
                   {statusData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                 </Pie>
                 <Tooltip content={<BookPieTooltip />} />
               </PieChart>
             </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>Copies</p>
              <p style={{ margin: "1px 0 0", fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
                {formatNum(totalCopies)}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8 }}>
              {statusData.map(s => (
                <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                  <span style={{ color: "var(--text-secondary)" }}>{s.status}</span>
                  <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>({s.count?.toLocaleString() ?? 0})</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SectionCard>
  );
}
