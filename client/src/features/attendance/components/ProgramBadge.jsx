/**
 * features/attendance/components/ProgramBadge.jsx
 *
 * Program pill. Extracted from the former pages/AttendanceDashboard.jsx
 * (was `ProgramBadge`).
 */

import { PROG_COLORS } from "../constants/attendancePalette";

export default function ProgramBadge({ prog }) {
  const c = PROG_COLORS[prog] || { bg: "rgba(156,163,175,.15)", color: "#6b7280" };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>{prog}</span>;
}
