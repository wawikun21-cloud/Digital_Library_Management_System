/**
 * features/attendance/components/kiosk/KioskHeader.jsx
 *
 * Kiosk brand bar: logo, live clock, online pill, RFID status, inside count
 * and the fullscreen toggle. Extracted from the former
 * pages/KioskAttendance.jsx.
 */

import {
  Wifi, WifiOff, Users, Maximize2, Minimize2,
} from "lucide-react";
import { NAVY, GREEN, AMBER } from "../../constants/kioskTheme";

export default function KioskHeader({
  timeStr, dateStr, online, nextScanIn, processing,
  activeCount, isFullscreen, onToggleFullscreen,
}) {
  return (
    <header style={{
      position: "relative", zIndex: 10,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 36px",
      borderBottom: "1px solid #0a2030",
      background: NAVY,
      boxShadow: "0 2px 12px rgba(19,47,69,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img
          src="/icon.png"
          alt="Lexora Logo"
          style={{
            width: 38, height: 38, borderRadius: 10,
            objectFit: "contain",
          }}
        />
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.3px" }}>
            Lexora Library
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "#8fadc2", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            Attendance Kiosk
          </p>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{
          margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: "-0.5px",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          color: "#ffffff", lineHeight: 1,
        }}>
          {timeStr}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8fadc2" }}>
          {dateStr}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 20,
          background: online ? "rgba(63,122,92,0.18)" : "rgba(204,31,31,0.18)",
          border: `1px solid ${online ? "rgba(63,122,92,0.4)" : "rgba(204,31,31,0.4)"}`,
        }}>
          {online
            ? <><Wifi size={12} color="#6fcf9a" /><span style={{ fontSize: 11, color: "#6fcf9a", fontWeight: 600 }}>Online</span></>
            : <><WifiOff size={12} color="#f08080" /><span style={{ fontSize: 11, color: "#f08080", fontWeight: 600 }}>Offline</span></>
          }
        </div>

        {/* RFID always-active indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 12px", borderRadius: 20,
          background: "rgba(63,122,92,0.18)",
          border: "1px solid rgba(63,122,92,0.4)",
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#6fcf9a",
            boxShadow: "0 0 0 3px rgba(111,207,154,0.25)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          {nextScanIn > 0
            ? <span style={{ fontSize: 11, color: AMBER, fontWeight: 600 }}>
                Next scan: {Math.ceil(nextScanIn / 1000)}s
              </span>
            : processing
            ? <span style={{ fontSize: 11, color: "#6fcf9a", fontWeight: 600 }}>Processing…</span>
            : <span style={{ fontSize: 11, color: "#6fcf9a", fontWeight: 600 }}>RFID Ready</span>
          }
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 20,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.16)",
        }}>
          <Users size={13} color="#8fadc2" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{activeCount}</span>
          <span style={{ fontSize: 10, color: "#8fadc2" }}>inside</span>
        </div>

        <button
          onClick={onToggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 10, cursor: "pointer",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.16)",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {isFullscreen ? <Minimize2 size={15} color={AMBER} /> : <Maximize2 size={15} color="#8fadc2" />}
        </button>
      </div>
    </header>
  );
}
