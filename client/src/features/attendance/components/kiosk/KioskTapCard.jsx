/**
 * features/attendance/components/kiosk/KioskTapCard.jsx
 *
 * Big animated tap-result card (flies in from bottom, auto-dismisses).
 * Extracted from the former pages/KioskAttendance.jsx (was `TapCard`).
 */

import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";
import KioskAvatar from "./KioskAvatar";
import { getFullName, avatarColors } from "../../utils/kioskFormat";
import { GREEN, AMBER, NAVY, SURFACE, HAIRLINE, MUTED, MUTED_SOFT, CHIP_BG } from "../../constants/kioskTheme";

export default function KioskTapCard({ result, onDone }) {
  const isIn = result.action === "checked_in";
  const fullName = getFullName(result.data || {}) || result.data?.student_name || "";
  const accent = avatarColors(fullName);
  const tone = isIn ? GREEN : AMBER;
  const [phase, setPhase] = useState("enter");

  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 2700);
    return () => clearTimeout(t);
  }, []);

  const handleAnimationEnd = () => {
    if (phase === "exit") onDone();
  };

  const animation =
    phase === "enter"
      ? "tapCardIn 0.45s cubic-bezier(.34,1.2,.64,1) both"
      : "tapCardOut 0.3s ease forwards";

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed", bottom: 32, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        animation,
        width: "min(520px, calc(100vw - 48px))",
      }}
    >
      <div style={{
        background: SURFACE,
        border: `1px solid ${HAIRLINE}`,
        borderLeft: `4px solid ${tone}`,
        borderRadius: 18,
        padding: "20px 24px",
        boxShadow: "0 20px 48px rgba(19,47,69,0.16)",
        display: "flex", gap: 18, alignItems: "center",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          background: `${tone}14`,
          border: `1px solid ${tone}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isIn ? <LogIn size={22} color={tone} /> : <LogOut size={22} color={tone} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "1.2px",
            textTransform: "uppercase",
            color: tone,
          }}>
            {isIn ? "Checked In" : "Checked Out"}
          </p>
          <p style={{
            margin: "4px 0 0", fontSize: 19, fontWeight: 800,
            color: NAVY, lineHeight: 1.1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {fullName}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {result.data?.student_id_number && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: CHIP_BG, color: MUTED,
                fontFamily: "monospace",
              }}>{result.data.student_id_number}</span>
            )}
            {result.data?.student_course && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: `${accent}16`, color: accent,
              }}>{result.data.student_course}</span>
            )}
            {result.data?.student_yr_level && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: CHIP_BG, color: MUTED,
              }}>{result.data.student_yr_level}</span>
            )}
          </div>
        </div>

        {!isIn && result.data?.duration != null && (
          <div style={{
            textAlign: "center", flexShrink: 0,
            background: "#fbf2e7",
            border: "1px solid #f0dcc0",
            borderRadius: 12, padding: "8px 14px",
          }}>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: AMBER, fontFamily: "monospace" }}>
              {result.data.duration >= 60
                ? `${Math.floor(result.data.duration / 60)}h${result.data.duration % 60}m`
                : `${result.data.duration}m`}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#a78a63", letterSpacing: "0.5px" }}>DURATION</p>
          </div>
        )}

        <KioskAvatar name={fullName} size={48} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: HAIRLINE, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          background: tone,
          borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}
