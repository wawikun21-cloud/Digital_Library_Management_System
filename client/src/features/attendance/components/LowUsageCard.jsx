/**
 * features/attendance/components/LowUsageCard.jsx
 *
 * In-page top-5 low/no-usage students with a "View All" link. Extracted from
 * the former pages/AttendanceDashboard.jsx.
 */

import SectionCard from "../../../components/ui/SectionCard";
import ProgramBadge from "./ProgramBadge";
import { C } from "../constants/attendancePalette";

export default function LowUsageCard({ lowUsage, onViewAll }) {
  return (
    <SectionCard title="Low / No Usage Students" info action={
      <button style={{ fontSize: 12, fontWeight: 700, color: C.rose, background: "rgba(244,63,94,.08)", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>Alert</button>
    }>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            {["Student Name", "Course / Program", "Visits", "Total Hours", "Last Visit"].map(h => (
              <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", paddingBottom: 8, borderBottom: "1px solid var(--border-light)", paddingRight: 8 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lowUsage.slice(0, 5).map((s, i) => (
            <tr key={i} style={{ borderBottom: i < Math.min(lowUsage.length, 5) - 1 ? "1px solid var(--border-light)" : "none" }}>
              <td style={{ padding: "9px 8px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
              <td style={{ padding: "9px 8px 9px 0" }}><ProgramBadge prog={s.program} /></td>
              <td style={{ padding: "9px 8px 9px 0", color: s.visits === 0 ? C.rose : "var(--text-secondary)", fontWeight: 700 }}>{s.visits}</td>
              <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)" }}>{s.hours}</td>
              <td style={{ padding: "9px 0", color: "var(--text-muted)", fontSize: 11 }}>{s.last}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <button onClick={onViewAll}
          style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}>
          View All Low Usage Students
        </button>
      </div>
    </SectionCard>
  );
}
