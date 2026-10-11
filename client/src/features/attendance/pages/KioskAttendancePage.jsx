/**
 * features/attendance/pages/KioskAttendancePage.jsx
 *
 * Library Attendance Kiosk — full-screen display view.
 *
 * Composition only: the session (active list, socket sync, tap handling,
 * banners) lives in useKioskAttendance, scanner capture in useRfidCapture,
 * and the clock/fullscreen in their own hooks. Replaces the former
 * pages/KioskAttendance.jsx.
 */

import { useCallback, useRef } from "react";
import "../kioskAnimations.css";
import { useLiveClock } from "../hooks/useLiveClock";
import { useFullscreen } from "../hooks/useFullscreen";
import { useKioskAttendance } from "../hooks/useKioskAttendance";
import { useRfidCapture } from "../hooks/useRfidCapture";
import { NAVY } from "../constants/kioskTheme";
import KioskRfidInput from "../components/kiosk/KioskRfidInput";
import KioskHeader from "../components/kiosk/KioskHeader";
import KioskActiveGrid from "../components/kiosk/KioskActiveGrid";
import KioskTapCard from "../components/kiosk/KioskTapCard";
import KioskUnregisteredBanner from "../components/kiosk/KioskUnregisteredBanner";
import KioskNotFoundBanner from "../components/kiosk/KioskNotFoundBanner";

export default function KioskAttendancePage() {
  const now = useLiveClock();

  const rfidInputRef = useRef(null);
  const focusInput = useCallback(() => rfidInputRef.current?.focus(), []);

  const kiosk = useKioskAttendance({ focusInput });
  const { handleKeyDown } = useRfidCapture({ onTap: kiosk.handleRfidTap, inputRef: rfidInputRef });

  const containerRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div ref={containerRef} style={{
      minHeight: "100vh",
      backgroundImage: "linear-gradient(180deg, rgba(240,246,250,0.35), rgba(240,246,250,0.55)), url('/gate-background.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      color: NAVY,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* ── Hidden RFID capture input — always active ─── */}
      <KioskRfidInput inputRef={rfidInputRef} onKeyDown={handleKeyDown} />

      {/* ── Header ──────────────────────────────────────── */}
      <KioskHeader
        timeStr={timeStr}
        dateStr={dateStr}
        online={kiosk.online}
        nextScanIn={kiosk.nextScanIn}
        processing={kiosk.processing}
        activeCount={kiosk.active.length}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* ── Main body — full-width active students grid ── */}
      <KioskActiveGrid active={kiosk.active} />

      {/* ── Tap result card ──────────────────────────────── */}
      {kiosk.tapResult && (
        <KioskTapCard
          result={kiosk.tapResult}
          onDone={kiosk.dismissTapResult}
        />
      )}

      {/* ── Unregistered RFID banner ─────────────────────── */}
      {kiosk.unregistered && (
        <KioskUnregisteredBanner
          rfidCode={kiosk.unregistered}
          onDone={kiosk.dismissUnregistered}
        />
      )}

      {/* ── Student Not Found banner ──────────────────────── */}
      {kiosk.notFound && (
        <KioskNotFoundBanner
          studentId={kiosk.notFound}
          onDone={kiosk.dismissNotFound}
        />
      )}
    </div>
  );
}
