/**
 * features/attendance/components/RankBadge.jsx
 *
 * Rank circle with trophy icon for the top 3. Extracted from the former
 * pages/AttendanceDashboard.jsx (was `RankBadge`).
 */

import { Trophy } from "lucide-react";
import { C } from "../constants/attendancePalette";

export default function RankBadge({ rank }) {
  const medals = { 1: C.amber, 2: "#9ca3af", 3: C.orange };
  const color = medals[rank];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 800, background: color || "var(--bg-subtle)", color: color ? "#fff" : "var(--text-muted)" }}>
      {rank <= 3 ? <Trophy size={12} /> : rank}
    </span>
  );
}
