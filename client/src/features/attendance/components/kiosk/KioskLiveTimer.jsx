/**
 * features/attendance/components/kiosk/KioskLiveTimer.jsx
 *
 * Monospace elapsed-time display (amber once past one hour). Extracted from
 * the former pages/KioskAttendance.jsx (was `LiveTimer`).
 */

import { Clock } from "lucide-react";
import { useElapsed } from "../../hooks/useElapsed";
import { fmtElapsed } from "../../utils/kioskFormat";
import { GREEN, AMBER } from "../../constants/kioskTheme";

export default function KioskLiveTimer({ checkInTime }) {
  const elapsed = useElapsed(checkInTime);
  const isLong = elapsed > 3600;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      fontSize: 13, fontWeight: 700, letterSpacing: "0.3px",
      color: isLong ? AMBER : GREEN,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Clock size={11} style={{ opacity: 0.75 }} />
      {fmtElapsed(elapsed)}
    </span>
  );
}
