/**
 * features/attendance/components/StatusPill.jsx
 *
 * Checked In / Checked Out pill (history-modal variant). Extracted from the
 * former pages/Attendance.jsx (was `StatusPill`). The records table uses
 * the distinct AttendanceStatusPill.
 */

import { CheckCircle2, XCircle } from "lucide-react";

export default function StatusPill({ status }) {
  const isIn = status === "checked_in";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
      style={{
        background: isIn ? "rgba(45,122,71,0.12)" : "rgba(238,162,58,0.15)",
        color: isIn ? "#2d7a47" : "#b87a1a",
      }}
    >
      {isIn ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {isIn ? "Checked In" : "Checked Out"}
    </span>
  );
}
