/**
 * features/attendance/components/kiosk/KioskNotFoundBanner.jsx
 *
 * Banner shown when a tapped student ID is not in the database. Extracted
 * from the former pages/KioskAttendance.jsx (was `NotFoundBanner`).
 */

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { RED, SURFACE, HAIRLINE, MUTED } from "../../constants/kioskTheme";

export default function KioskNotFoundBanner({ studentId, onDone }) {
  const [phase, setPhase] = useState("enter");
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 2700);
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
        width: "min(420px, calc(100vw - 48px))",
      }}
    >
      <div style={{
        background: SURFACE,
        border: "1px solid #f3d4d4",
        borderLeft: `4px solid ${RED}`,
        borderRadius: 14, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 16px 40px rgba(19,47,69,0.14)",
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          background: "#fbeaea",
          border: "1px solid #f3d4d4",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={18} color={RED} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>
            Student Not Found
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: MUTED, fontFamily: "monospace" }}>
            {studentId}
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: HAIRLINE, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: RED, borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}
