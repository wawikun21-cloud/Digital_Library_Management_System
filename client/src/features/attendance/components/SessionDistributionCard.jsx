/**
 * features/attendance/components/SessionDistributionCard.jsx
 *
 * Session-duration distribution donut with centre total and legend.
 * Extracted from the former pages/AttendanceDashboard.jsx.
 */

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import SectionCard from "../../../components/ui/SectionCard";

export default function SessionDistributionCard({ sessionDist, sessionTotal }) {
  return (
    <SectionCard title="Session Duration Distribution">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", width: 170, height: 170 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sessionDist} cx="50%" cy="50%" innerRadius={52} outerRadius={80} startAngle={90} endAngle={-270} dataKey="pct" paddingAngle={1.5}>
                {sessionDist.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{sessionTotal.toLocaleString()}</span>
            <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Total Visits</span>
          </div>
        </div>
        <div style={{ width: "100%", marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {sessionDist.map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.label}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                {d.pct}% <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>{(d.count ?? 0).toLocaleString()}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
