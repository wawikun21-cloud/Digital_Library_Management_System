/**
 * features/attendance/components/TopStudentsCard.jsx
 *
 * In-page top-5 students table with a "View All" action. Extracted from the
 * former pages/AttendanceDashboard.jsx.
 */

import { ChevronDown } from "lucide-react";
import SectionCard from "../../../components/ui/SectionCard";
import RankBadge from "./RankBadge";
import ProgramBadge from "./ProgramBadge";
import { C } from "../constants/attendancePalette";

export default function TopStudentsCard({ topStudents, onViewAll }) {
  return (
    <SectionCard title="Top Students by Library Usage" info action={
      <button onClick={onViewAll} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer", background: "var(--bg-surface)", border: "1px solid var(--border)", color: C.teal }}>
        View All <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
      </button>
    }>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["Rank", "Student Name", "Program", "Year Level", "Visits", "Total Hours", "Avg Time"].map(h => (
                <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", paddingBottom: 8, borderBottom: "1px solid var(--border-light)", paddingRight: 8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topStudents.slice(0, 5).map((s, i) => (
              <tr key={i} style={{ borderBottom: i < Math.min(topStudents.length, 5) - 1 ? "1px solid var(--border-light)" : "none" }}>
                <td style={{ padding: "9px 8px 9px 0" }}><RankBadge rank={i + 1} /></td>
                <td style={{ padding: "9px 8px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                <td style={{ padding: "9px 8px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)", fontSize: 11 }}>{s.yrLevel ?? s.yr_level ?? s.yearLevel ?? "—"}</td>
                <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)", fontWeight: 600 }}>{s.visits}</td>
                <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.hours}</td>
                <td style={{ padding: "9px 0", color: "var(--text-secondary)" }}>{s.avg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
