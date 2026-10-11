/**
 * features/attendance/components/kiosk/KioskStudentCard.jsx
 *
 * Student card for the active grid. Stable animation on re-renders: gates the
 * entry animation with a ref so it only fires once per card mount, not on
 * every prop update from the poll refresh. Extracted from the former
 * pages/KioskAttendance.jsx (was `StudentCard`).
 */

import { useEffect, useRef } from "react";
import KioskAvatar from "./KioskAvatar";
import KioskLiveTimer from "./KioskLiveTimer";
import { getFullName, avatarColors, fmtCheckIn } from "../../utils/kioskFormat";
import { NAVY, MUTED, MUTED_SOFT, MUTED_FAINT, SURFACE, HAIRLINE, CHIP_BG } from "../../constants/kioskTheme";

export default function KioskStudentCard({ record, index }) {
  const fullName = getFullName(record) || record.student_name;
  const accent = avatarColors(fullName);

  const animatedRef = useRef(false);
  const animationStyle = animatedRef.current
    ? {}
    : {
        animation: `cardIn 0.35s cubic-bezier(.34,1.2,.64,1) both`,
        animationDelay: `${index * 35}ms`,
      };
  useEffect(() => { animatedRef.current = true; }, []);

  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${HAIRLINE}`,
      borderRadius: 14,
      padding: "13px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 1px 3px rgba(19,47,69,0.05)",
      ...animationStyle,
    }}>
      <KioskAvatar name={fullName} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13.5, fontWeight: 700,
          color: NAVY, whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {fullName}
        </p>
        <p style={{
          margin: "2px 0 0", fontSize: 10, color: MUTED_SOFT,
          fontFamily: "monospace", letterSpacing: "0.3px",
        }}>
          {record.student_id_number}
        </p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
          {record.student_course && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 7px",
              borderRadius: 20, background: `${accent}16`, color: accent,
              letterSpacing: "0.3px", textTransform: "uppercase",
            }}>{record.student_course}</span>
          )}
          {record.student_yr_level && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "1px 7px",
              borderRadius: 20, background: CHIP_BG, color: MUTED,
            }}>{record.student_yr_level}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <KioskLiveTimer checkInTime={record.check_in_time} />
        <p style={{ margin: "3px 0 0", fontSize: 9, color: MUTED_FAINT }}>
          in at {fmtCheckIn(record.check_in_time)}
        </p>
      </div>
    </div>
  );
}
