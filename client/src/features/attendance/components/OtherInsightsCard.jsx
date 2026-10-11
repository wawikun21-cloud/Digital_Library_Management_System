/**
 * features/attendance/components/OtherInsightsCard.jsx
 *
 * Four auxiliary insight rows (longest session, busiest day, most consistent
 * user, unique students this month). Extracted from the former
 * pages/AttendanceDashboard.jsx.
 */

import { Clock, CalendarDays, Trophy, Users } from "lucide-react";
import SectionCard from "../../../components/ui/SectionCard";
import { C } from "../constants/attendancePalette";

export default function OtherInsightsCard({ otherInsights }) {
  return (
    <SectionCard title="Other Insights">
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {[
          { icon: Clock,       iconBg: "rgba(99,102,241,.12)",  iconColor: C.indigo, label: "Longest Session Today",      value: otherInsights?.longestSession ?? "—", sub: otherInsights?.longestSub     ?? "Loading…" },
          { icon: CalendarDays,iconBg: "rgba(34,197,94,.12)",   iconColor: "#16a34a",label: "Busiest Day",                value: otherInsights?.busiestDay    ?? "—", sub: otherInsights?.busiestSub     ?? "Loading…" },
          { icon: Trophy,      iconBg: "rgba(238,162,58,.15)",  iconColor: C.amber,  label: "Most Consistent User",       value: otherInsights?.consistentUser ?? "—", sub: otherInsights?.consistentSub  ?? "Loading…" },
          { icon: Users,       iconBg: "rgba(168,85,247,.12)",  iconColor: C.purple, label: "Unique Students This Month", value: otherInsights?.freshmenCount  ?? "—", sub: otherInsights?.freshmenSub    ?? "Loading…" },
        ].map((item, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : "none" }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <item.icon size={17} color={item.iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
