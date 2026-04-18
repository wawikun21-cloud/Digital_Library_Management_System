// ─────────────────────────────────────────────────────────
//  pages/KioskAttendance.jsx
//  Library Attendance Kiosk — full-screen display view.
//
//  RFID-only mode:
//  • Admin presses "Activate RFID Detection" to start listening
//  • Once ON, the hidden input auto-focuses and captures every
//    RFID scan (hardware scanners emit as keyboard input + Enter)
//  • Detection stays ON indefinitely until admin clicks "Deactivate"
//  • No manual typing UI for students — tap only
//  • 1st tap = Check In | 2nd tap = Check Out
//  • Animated result card flies in on every tap
//  • Active-students grid with live duration timers
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { tapRfid } from "../services/api/rfidApi";
import { getActiveAttendance } from "../services/api/attendanceApi";
import {
  LogIn, LogOut, Clock, Users, Wifi, WifiOff,
  AlertTriangle, CheckCircle2,
  Maximize2, Minimize2, Power, PowerOff, ShieldCheck,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// Combines first_name + last_name into a full name.
// Falls back to display_name, then student_name.
function getFullName(student = {}) {
  const { first_name, last_name, display_name, student_name } = student;
  const combined = [first_name, last_name].filter(Boolean).join(" ").trim();
  return combined || display_name || student_name || "";
}

const AVATAR_COLORS = [
  ["#1a3a5c", "#4a9eda"],
  ["#3a1a1a", "#e05252"],
  ["#1a3a1a", "#52c97a"],
  ["#2a1a3a", "#a067e8"],
  ["#3a2a10", "#e8a84a"],
  ["#103a3a", "#4adce8"],
];

function avatarColors(name = "") {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// ─── FIX 1: parseAsUTC → parseTimestamp ──────────────────
//
// PROBLEM: The old `parseAsUTC` unconditionally appended "Z" to any
// string without a timezone suffix, forcing UTC interpretation.
// MySQL TIMESTAMP/DATETIME columns are typically stored and returned
// in the *server's local timezone* (e.g. PHT = UTC+8), NOT in UTC.
// Appending "Z" made every timestamp appear 8 hours in the past,
// causing two visible bugs:
//
//   a) "in at" display was 8 h off  (e.g. 08:30 shown as 00:30)
//   b) useElapsed() calculated a NEGATIVE initial elapsed value
//      (Date.now() minus a future UTC-misread time = negative),
//      which Math.max(0, ...) clamped to 0 — so every card started
//      its timer at 00:00 on each poll/re-mount instead of showing
//      the real time already spent.
//
// FIX: Treat strings without an explicit timezone offset as LOCAL
// time by replacing the space separator with "T" but NOT appending
// "Z". The browser then parses them as local time, matching the
// server's timezone.
//
// If your MySQL server is configured to return UTC timestamps
// (e.g. via `SET time_zone = '+00:00'`), re-add the "Z" suffix.
// The key is to match whatever timezone the DB column actually uses.
function parseTimestamp(dt) {
  if (!dt) return new Date();
  const s = String(dt);
  // Already has explicit tz info — parse as-is.
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  // No tz info → treat as local time (server local tz).
  return new Date(s.replace(" ", "T"));
}

function fmtCheckIn(dt) {
  if (!dt) return "—";
  return parseTimestamp(dt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Live clock ───────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ─── Fullscreen hook ──────────────────────────────────────
function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const enter = useCallback(() => {
    const el = ref.current || document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }, [ref]);
  const exit = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }, []);
  const toggle = useCallback(() => {
    isFullscreen ? exit() : enter();
  }, [isFullscreen, enter, exit]);
  return { isFullscreen, toggle };
}

// ─── FIX 2: useElapsed — stable elapsed calculation ──────
//
// PROBLEM (original):
//   const [elapsed, setElapsed] = useState(() =>
//     Math.max(0, Math.floor((Date.now() - parseAsUTC(checkInTime).getTime()) / 1000))
//   );
//
// There were TWO issues here:
//
// a) The useState lazy initializer only runs ONCE (on mount). When
//    the parent re-renders with a *different* checkInTime prop
//    (e.g. after the 10-second active-poll refreshes the list),
//    the initial state is NOT recalculated — the timer appears to
//    reset to whatever it was on first render and then continues
//    ticking from that stale baseline.
//
//    FIX: Derive the base timestamp into a ref so the interval
//    always reads the latest parsed value without needing to
//    restart the effect.
//
// b) parseAsUTC (now parseTimestamp) was misreading local timestamps
//    as UTC, making `Date.now() - checkInMs` negative. Math.max
//    clamped this to 0, so every card showed 00:00 on render and
//    only started ticking *forward* from 0 — losing all accrued time.
//
//    FIX: parseTimestamp now correctly interprets local timestamps.
function useElapsed(checkInTime) {
  // Keep a ref to the parsed check-in ms so the interval closure
  // always sees the latest value without restarting.
  const checkInMsRef = useRef(parseTimestamp(checkInTime).getTime());

  // Update the ref whenever checkInTime changes (e.g. after a poll).
  useEffect(() => {
    checkInMsRef.current = parseTimestamp(checkInTime).getTime();
  }, [checkInTime]);

  const calcElapsed = useCallback(
    () => Math.max(0, Math.floor((Date.now() - checkInMsRef.current) / 1000)),
    []
  );

  const [elapsed, setElapsed] = useState(calcElapsed);

  useEffect(() => {
    // Recalculate immediately when checkInTime changes.
    setElapsed(calcElapsed());
    const t = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(t);
  }, [checkInTime, calcElapsed]); // re-subscribe when the prop changes

  return elapsed;
}

// ─── Sub-components ───────────────────────────────────────

function Avatar({ name, size = 56 }) {
  const [bg, accent] = avatarColors(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `radial-gradient(circle at 35% 35%, ${accent}55, ${bg})`,
      border: `2px solid ${accent}66`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.35), fontWeight: 800,
      color: accent, flexShrink: 0, letterSpacing: "-0.5px",
      boxShadow: `0 0 0 4px ${accent}18, 0 4px 16px ${bg}99`,
    }}>
      {getInitials(name)}
    </div>
  );
}

function LiveTimer({ checkInTime }) {
  const elapsed = useElapsed(checkInTime);
  const isLong = elapsed > 3600;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      fontSize: 13, fontWeight: 700, letterSpacing: "0.5px",
      color: isLong ? "#ffd900" : "#34d399",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Clock size={11} style={{ opacity: 0.8 }} />
      {fmtElapsed(elapsed)}
    </span>
  );
}

// ─── FIX 3: StudentCard — stable animation on re-renders ─
//
// PROBLEM: `animationDelay: \`${index * 40}ms\`` caused every card
// to re-animate its fly-in whenever the parent re-rendered (e.g.
// every 10-second poll), because React reconciles by key and
// the index prop can shift when students check in/out, triggering
// a fresh mount with a new delay. This made cards "flash" on
// every background refresh.
//
// FIX: Gate the entry animation with a ref so it only fires once
// per card mount, not on every prop update. Cards that are already
// visible don't re-animate when the active list refreshes.
function StudentCard({ record, index }) {
  const fullName = getFullName(record) || record.student_name;
  const [, accent] = avatarColors(fullName);

  // Only animate on the very first render of this card instance.
  const animatedRef = useRef(false);
  const animationStyle = animatedRef.current
    ? {}
    : {
        animation: `cardIn 0.4s cubic-bezier(.34,1.4,.64,1) both`,
        animationDelay: `${index * 40}ms`,
      };
  // Mark as animated after first paint.
  useEffect(() => { animatedRef.current = true; }, []);

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${accent}30`,
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      backdropFilter: "blur(8px)",
      ...animationStyle,
    }}>
      <Avatar name={fullName} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          color: "#f1f5f9", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {fullName}
        </p>
        <p style={{
          margin: "2px 0 0", fontSize: 10, color: "#94a3b8",
          fontFamily: "monospace", letterSpacing: "0.3px",
        }}>
          {record.student_id_number}
        </p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
          {record.student_course && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "1px 6px",
              borderRadius: 20, background: `${accent}22`, color: accent,
              letterSpacing: "0.3px", textTransform: "uppercase",
            }}>{record.student_course}</span>
          )}
          {record.student_yr_level && (
            <span style={{
              fontSize: 9, fontWeight: 600, padding: "1px 6px",
              borderRadius: 20, background: "rgba(148,163,184,0.15)", color: "#94a3b8",
            }}>{record.student_yr_level}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <LiveTimer checkInTime={record.check_in_time} />
        <p style={{ margin: "3px 0 0", fontSize: 9, color: "#64748b" }}>
          in at {fmtCheckIn(record.check_in_time)}
        </p>
      </div>
    </div>
  );
}

// Big animated tap-result card (flies in from bottom)
function TapCard({ result, onDone }) {
  const isIn = result.action === "checked_in";
  const fullName = getFullName(result.data || {}) || result.data?.student_name || "";
  const [, accent] = avatarColors(fullName);
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
      ? "tapCardIn 0.5s cubic-bezier(.34,1.4,.64,1) both"
      : "tapCardOut 0.35s ease forwards";

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
        background: isIn
          ? "linear-gradient(135deg, #0f2a1a 0%, #0d1f2d 100%)"
          : "linear-gradient(135deg, #2a1a08 0%, #1a1208 100%)",
        border: `1.5px solid ${isIn ? "#34d39955" : "#f59e0b55"}`,
        borderRadius: 24,
        padding: "20px 24px",
        boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px ${isIn ? "#34d39920" : "#f59e0b20"}`,
        backdropFilter: "blur(20px)",
        display: "flex", gap: 18, alignItems: "center",
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: isIn ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)",
          border: `1.5px solid ${isIn ? "#34d39944" : "#f59e0b44"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isIn ? <LogIn size={24} color="#34d399" /> : <LogOut size={24} color="#f59e0b" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: isIn ? "#34d399" : "#f59e0b",
          }}>
            {isIn ? "✓ Checked In" : "← Checked Out"}
          </p>
          <p style={{
            margin: "4px 0 0", fontSize: 20, fontWeight: 800,
            color: "#f1f5f9", lineHeight: 1.1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {fullName}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {result.data?.student_id_number && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "rgba(255,255,255,0.08)", color: "#94a3b8",
                fontFamily: "monospace",
              }}>{result.data.student_id_number}</span>
            )}
            {result.data?.student_course && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                background: `${accent}22`, color: accent,
              }}>{result.data.student_course}</span>
            )}
            {result.data?.student_yr_level && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "rgba(148,163,184,0.12)", color: "#94a3b8",
              }}>{result.data.student_yr_level}</span>
            )}
          </div>
        </div>

        {!isIn && result.data?.duration != null && (
          <div style={{
            textAlign: "center", flexShrink: 0,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 12, padding: "8px 14px",
          }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#f59e0b", fontFamily: "monospace" }}>
              {result.data.duration >= 60
                ? `${Math.floor(result.data.duration / 60)}h${result.data.duration % 60}m`
                : `${result.data.duration}m`}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#78716c", letterSpacing: "0.5px" }}>DURATION</p>
          </div>
        )}

        <Avatar name={fullName} size={52} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          background: isIn ? "#34d399" : "#f59e0b",
          borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}

// Unregistered RFID banner
function UnregisteredBanner({ rfidCode, onDone }) {
  const [phase, setPhase] = useState("enter");
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 3500);
    return () => clearTimeout(t);
  }, []);
  const handleAnimationEnd = () => { if (phase === "exit") onDone(); };
  const animation = phase === "enter"
    ? "bannerIn 0.35s cubic-bezier(.34,1.4,.64,1) both"
    : "bannerOut 0.35s ease forwards";

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
        background: "linear-gradient(135deg, #2a1a08, #1a1000)",
        border: "1.5px solid #f59e0b55",
        borderRadius: 16, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 16px 48px rgba(245,158,11,0.2)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "rgba(245,158,11,0.15)",
          border: "1px solid rgba(245,158,11,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={20} color="#f59e0b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#f59e0b" }}>
            RFID Card Not Registered
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {rfidCode}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
            Please register this card via the Admin Attendance page.
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#f59e0b", borderRadius: 2,
          animation: "progressBar 3.5s linear forwards",
        }} />
      </div>
    </div>
  );
}

// Not-found banner (student ID not in DB)
function NotFoundBanner({ studentId, onDone }) {
  const [phase, setPhase] = useState("enter");
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 2700);
    return () => clearTimeout(t);
  }, []);
  const handleAnimationEnd = () => { if (phase === "exit") onDone(); };
  const animation = phase === "enter"
    ? "bannerIn 0.35s cubic-bezier(.34,1.4,.64,1) both"
    : "bannerOut 0.35s ease forwards";

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
        background: "linear-gradient(135deg, #2a0a0a, #1a0808)",
        border: "1.5px solid #ef444455",
        borderRadius: 16, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 14,
        boxShadow: "0 16px 48px rgba(239,68,68,0.25)",
        backdropFilter: "blur(16px)",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={20} color="#ef4444" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
            Student Not Found
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {studentId}
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#ef4444", borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ─── Main Kiosk Page ──────────────────────────────────────
export default function KioskAttendance() {
  const now          = useLiveClock();
  const [active, setActive]           = useState([]);
  const [tapResult, setTapResult]     = useState(null);
  const [notFound, setNotFound]       = useState(null);
  const [unregistered, setUnregistered] = useState(null);
  const [online, setOnline]           = useState(navigator.onLine);

  // ── Persist rfidActive in sessionStorage so it survives navigation ──
  // sessionStorage clears when the tab is closed (correct kiosk behaviour),
  // but keeps the value when the user navigates to another page and back.
  const [rfidActive, setRfidActive]   = useState(
    () => sessionStorage.getItem("kiosk_rfid_active") === "true"
  );

  const [processing, setProcessing]   = useState(false);
  const rfidBufferRef = useRef("");
  const rfidInputRef  = useRef(null);
  const containerRef  = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  // ── Poll active students every 10s ───────────────────
  const fetchActive = useCallback(async () => {
    const res = await getActiveAttendance();
    if (res.success) setActive(res.data || []);
  }, []);

  useEffect(() => {
    fetchActive();
    const t = setInterval(fetchActive, 10_000);
    return () => clearInterval(t);
  }, [fetchActive]);

  // ── Online / offline indicator ────────────────────────
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ── Auto-focus hidden input when RFID is active ───────
  useEffect(() => {
    if (rfidActive) {
      rfidInputRef.current?.focus();
    }
  }, [rfidActive]);

  useEffect(() => {
    if (!rfidActive) return;
    const handler = () => {
      setTimeout(() => rfidInputRef.current?.focus(), 100);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [rfidActive]);

  // ── Core RFID tap handler ─────────────────────────────
  const handleRfidTap = useCallback(async (rfidCode) => {
    if (!rfidCode?.trim() || processing) return;
    setProcessing(true);
    try {
      const res = await tapRfid(rfidCode.trim());

      if (res.unregistered) {
        setUnregistered(rfidCode.trim());
      } else if (res.success) {
        setTapResult(res);
        fetchActive();
      } else if (res.error?.toLowerCase().includes("not found")) {
        setNotFound(rfidCode.trim());
      }
    } catch {
      // silent — network banner would be distracting on a kiosk
    } finally {
      setProcessing(false);
      setTimeout(() => rfidInputRef.current?.focus(), 50);
    }
  }, [processing, fetchActive]);

  const handleRfidKeyDown = useCallback((e) => {
    if (!rfidActive) return;

    if (e.key === "Enter") {
      const code = rfidBufferRef.current.trim();
      rfidBufferRef.current = "";
      if (code) handleRfidTap(code);
    } else if (e.key.length === 1) {
      rfidBufferRef.current += e.key;
    }
    e.preventDefault();
  }, [rfidActive, handleRfidTap]);

  // ── Save rfidActive to sessionStorage on every toggle ──
  const toggleRfid = useCallback(() => {
    setRfidActive((prev) => {
      const next = !prev;
      sessionStorage.setItem("kiosk_rfid_active", String(next));
      if (next) {
        rfidBufferRef.current = "";
        setTimeout(() => rfidInputRef.current?.focus(), 50);
      }
      return next;
    });
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div ref={containerRef} style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #060d18 0%, #0a1628 40%, #060d18 100%)",
      color: "#f1f5f9",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* ── Hidden RFID capture input ─── */}
      <input
        ref={rfidInputRef}
        onKeyDown={handleRfidKeyDown}
        onChange={() => {}}
        value=""
        readOnly
        tabIndex={rfidActive ? 0 : -1}
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />

      {/* ── Ambient background orbs ─────────────────────── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{
          position: "absolute", width: 600, height: 600,
          borderRadius: "50%", top: -200, left: -100,
          background: "radial-gradient(circle, rgba(50,100,200,0.08) 0%, transparent 70%)",
          animation: "orbFloat 12s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500,
          borderRadius: "50%", bottom: -150, right: -80,
          background: "radial-gradient(circle, rgba(234,130,50,0.06) 0%, transparent 70%)",
          animation: "orbFloat 16s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── Header ──────────────────────────────────────── */}
      <header style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 36px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        background: "rgba(6,13,24,0.6)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/icon.png"
            alt="Lexora Logo"
            style={{
              width: 40, height: 40, borderRadius: 10,
              objectFit: "contain",
              boxShadow: "0 4px 16px rgba(238,162,58,0.25)",
            }}
          />
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
              Lexora Library
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Attendance Kiosk
            </p>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{
            margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-1px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            color: "#f1f5f9", lineHeight: 1,
          }}>
            {timeStr}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#64748b" }}>
            {dateStr}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 20,
            background: online ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${online ? "rgba(52,211,153,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}>
            {online
              ? <><Wifi size={12} color="#34d399" /><span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>Online</span></>
              : <><WifiOff size={12} color="#ef4444" /><span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Offline</span></>
            }
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 14px", borderRadius: 20,
            background: "rgba(99,102,241,0.12)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}>
            <Users size={13} color="#818cf8" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>{active.length}</span>
            <span style={{ fontSize: 10, color: "#64748b" }}>inside</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              transition: "all 0.2s",
            }}
          >
            {isFullscreen ? <Minimize2 size={15} color="#ffd900" /> : <Maximize2 size={15} color="#94a3b8" />}
          </button>
        </div>
      </header>

      {/* ── Main body ───────────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", gap: 0,
        overflow: "hidden",
      }}>

        {/* ── Left panel: RFID activation ────────────────── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          padding: "36px 28px",
          gap: 28,
          background: "rgba(255,255,255,0.015)",
          backdropFilter: "blur(8px)",
        }}>

          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 72, height: 72, borderRadius: 24, margin: "0 auto 18px",
              background: rfidActive
                ? "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.05))"
                : "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              border: `1.5px solid ${rfidActive ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.4s",
              boxShadow: rfidActive ? "0 0 32px rgba(52,211,153,0.15)" : "none",
            }}>
              {rfidActive
                ? <ShieldCheck size={32} color="#34d399" />
                : <PowerOff size={32} color="#475569" />
              }
            </div>

            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 800,
              color: rfidActive ? "#34d399" : "#94a3b8",
              letterSpacing: "-0.5px",
              transition: "color 0.3s",
            }}>
              {rfidActive ? "RFID Active" : "RFID Inactive"}
            </h2>

            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
              {rfidActive
                ? "Scanner is listening. Tap your RFID card on the reader to check in or out."
                : "Tap the button below to activate RFID card detection."
              }
            </p>
          </div>

          <button
            onClick={toggleRfid}
            style={{
              width: "100%",
              padding: "16px",
              fontSize: 14, fontWeight: 800, letterSpacing: "0.5px",
              textTransform: "uppercase",
              background: rfidActive
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #34d399, #10b981)",
              color: "#fff",
              border: "none", borderRadius: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all 0.25s",
              boxShadow: rfidActive
                ? "0 4px 20px rgba(239,68,68,0.35)"
                : "0 4px 20px rgba(52,211,153,0.35)",
            }}
          >
            {rfidActive
              ? <><PowerOff size={18} /> Deactivate RFID</>
              : <><Power size={18} /> Activate RFID Detection</>
            }
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: rfidActive ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${rfidActive ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}`,
              transition: "all 0.3s",
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: rfidActive ? "#34d399" : "#334155",
                boxShadow: rfidActive ? "0 0 0 3px rgba(52,211,153,0.2)" : "none",
                animation: rfidActive ? "pulse 1.5s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: rfidActive ? "#34d399" : "#475569" }}>
                {rfidActive ? "Listening for RFID taps…" : "Not listening"}
              </span>
              {processing && (
                <div style={{
                  marginLeft: "auto",
                  width: 14, height: 14, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#34d399",
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { color: "#34d399", label: "1st Tap", desc: "→ Check In" },
                { color: "#f59e0b", label: "2nd Tap", desc: "→ Check Out" },
              ].map(({ color, label, desc }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10,
                  background: `${color}0d`, border: `1px solid ${color}22`,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(99,102,241,0.06)",
              border: "1px solid rgba(99,102,241,0.15)",
            }}>
              <p style={{ margin: 0, fontSize: 10, color: "#818cf8", lineHeight: 1.5 }}>
                <strong>Admin:</strong> Detection stays ON until you click Deactivate.
                Register new RFID cards from the Attendance page.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right: Active students grid ─────────────────── */}
        <div style={{
          flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column",
          padding: "28px 32px",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#94a3b8",
              letterSpacing: "0.5px", textTransform: "uppercase",
            }}>
              Currently In Library
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
              background: "rgba(52,211,153,0.12)", color: "#34d399",
            }}>
              {active.length}
            </span>
          </div>

          <div style={{
            flex: 1, overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 10,
            alignContent: "start",
            paddingBottom: 120,
          }}>
            {active.length === 0 ? (
              <div style={{
                gridColumn: "1 / -1",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 12, padding: "80px 0",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Users size={28} color="#334155" />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
                  No students currently in library
                </p>
              </div>
            ) : (
              active.map((record, i) => (
                <StudentCard key={record.id} record={record} index={i} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── Tap result card ──────────────────────────────── */}
      {tapResult && (
        <TapCard
          result={tapResult}
          onDone={() => setTapResult(null)}
        />
      )}

      {/* ── Unregistered RFID banner ─────────────────────── */}
      {unregistered && (
        <UnregisteredBanner
          rfidCode={unregistered}
          onDone={() => setUnregistered(null)}
        />
      )}

      {/* ── Student Not Found banner ──────────────────────── */}
      {notFound && (
        <NotFoundBanner
          studentId={notFound}
          onDone={() => setNotFound(null)}
        />
      )}

      {/* ── Global keyframes ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(20px, -30px) scale(1.05); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tapCardIn {
          from { opacity: 0; transform: translateX(-50%) translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes tapCardOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
        }
        @keyframes bannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes bannerOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
        }
        @keyframes progressBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}