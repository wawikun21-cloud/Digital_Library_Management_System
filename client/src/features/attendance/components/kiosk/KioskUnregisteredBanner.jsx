/**
 * features/attendance/components/kiosk/KioskUnregisteredBanner.jsx
 *
 * Banner shown when an RFID card is not linked to a student. Extracted from
 * the former pages/KioskAttendance.jsx (was `UnregisteredBanner`).
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AMBER, SURFACE, HAIRLINE, MUTED, MUTED_SOFT } from "../../constants/kioskTheme";

export default function KioskUnregisteredBanner({ rfidCode, onDone }) {
  const [phase, setPhase] = useState("enter");
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 3500);
    return () => clearTimeout(t);
  }, []);
  const handleAnimationEnd = () => { if (phase === "exit") onDone(); };
  const animation = phase === "enter"
    ? "bannerIn 0.3s cubic-bezier(.34,1.2,.64,1) both"
    : "bannerOut 0.3s ease forwards";

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, animation,
        width: "min(460px, calc(100vw - 48px))",
      }}
    >
      <div style={{
        background: SURFACE,
        border: "1px solid #f0dcc0",
        borderLeft: `4px solid ${AMBER}`,
        borderRadius: 14, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 16px 40px rgba(19,47,69,0.14)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: "#fbf2e7",
          border: "1px solid #f0dcc0",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={18} color={AMBER} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: AMBER }}>
            RFID Card Not Registered
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: MUTED, fontFamily: "monospace" }}>
            {rfidCode}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: MUTED_SOFT }}>
            Please register this card via the Admin Attendance page.
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: HAIRLINE, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: AMBER, borderRadius: 2,
          animation: "progressBar 3.5s linear forwards",
        }} />
      </div>
    </div>
  );
}
