// ─────────────────────────────────────────────────────────
//  pages/KioskAttendance.jsx
//  Library Attendance Kiosk — full-screen display view.
//
//  RFID-always-on mode:
//  • RFID detection is active immediately on page load
//  • Hidden input auto-focuses on mount and after every click
//  • Hardware scanners emit as keyboard input + Enter
//  • 1st tap = Check In | 2nd tap = Check Out
//  • Animated result card flies in on every tap
//  • Active-students grid with live duration timers
//
//  Visual style: light, minimal, matches brand palette
//  (#132F45 · #32667F · #EEA23A · #F3B940 · #EA8B33)
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { tapRfid } from "../services/api/rfidApi";
import { getActiveAttendance } from "../services/api/attendanceApi";
import { io } from "socket.io-client";
import {
  LogIn, LogOut, Clock, Users, Wifi, WifiOff,
  AlertTriangle, CheckCircle2,
  Maximize2, Minimize2,
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

// Soft, desaturated palette — variety without neon noise.
const AVATAR_COLORS = [
  "#32667F", // brand teal-blue
  "#C0792A", // muted amber
  "#3F7A5C", // muted green
  "#6B5B95", // muted violet
  "#B4595A", // muted clay
  "#1D5C6B", // muted cyan-teal
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

// ─── parseTimestamp ───────────────────────────────────────
// Treats strings without an explicit timezone offset as LOCAL
// time by replacing the space separator with "T" but NOT appending
// "Z". The browser then parses them as local time, matching the
// server's timezone.
function parseTimestamp(dt) {
  if (!dt) return new Date();
  const s = String(dt);
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
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

// ─── useElapsed — stable elapsed calculation ──────────────
// Derives the base timestamp into a ref so the interval always
// reads the latest parsed value without needing to restart the
// effect when checkInTime changes after a poll refresh.
function useElapsed(checkInTime) {
  const checkInMsRef = useRef(parseTimestamp(checkInTime).getTime());

  useEffect(() => {
    checkInMsRef.current = parseTimestamp(checkInTime).getTime();
  }, [checkInTime]);

  const calcElapsed = useCallback(
    () => Math.max(0, Math.floor((Date.now() - checkInMsRef.current) / 1000)),
    []
  );

  const [elapsed, setElapsed] = useState(calcElapsed);

  useEffect(() => {
    setElapsed(calcElapsed());
    const t = setInterval(() => setElapsed(calcElapsed()), 1000);
    return () => clearInterval(t);
  }, [checkInTime, calcElapsed]);

  return elapsed;
}

// ─── Sub-components ───────────────────────────────────────

function Avatar({ name, size = 56 }) {
  const accent = avatarColors(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${accent}14`,
      border: `1.5px solid ${accent}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.32), fontWeight: 700,
      color: accent, flexShrink: 0, letterSpacing: "-0.3px",
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
      fontSize: 13, fontWeight: 700, letterSpacing: "0.3px",
      color: isLong ? "#C0792A" : "#3F7A5C",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Clock size={11} style={{ opacity: 0.75 }} />
      {fmtElapsed(elapsed)}
    </span>
  );
}

// StudentCard — stable animation on re-renders.
// Gates the entry animation with a ref so it only fires once
// per card mount, not on every prop update from the poll refresh.
function StudentCard({ record, index }) {
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
      background: "#ffffff",
      border: "1px solid #e3ebf1",
      borderRadius: 14,
      padding: "13px 16px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 1px 3px rgba(19,47,69,0.05)",
      ...animationStyle,
    }}>
      <Avatar name={fullName} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13.5, fontWeight: 700,
          color: "#132F45", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {fullName}
        </p>
        <p style={{
          margin: "2px 0 0", fontSize: 10, color: "#7b93a3",
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
              borderRadius: 20, background: "#eef3f7", color: "#5a7686",
            }}>{record.student_yr_level}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <LiveTimer checkInTime={record.check_in_time} />
        <p style={{ margin: "3px 0 0", fontSize: 9, color: "#9aacb7" }}>
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
  const accent = avatarColors(fullName);
  const tone = isIn ? "#3F7A5C" : "#C0792A";
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
        background: "#ffffff",
        border: "1px solid #e3ebf1",
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
            color: "#132F45", lineHeight: 1.1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {fullName}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {result.data?.student_id_number && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "#eef3f7", color: "#5a7686",
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
                background: "#eef3f7", color: "#5a7686",
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
            <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#C0792A", fontFamily: "monospace" }}>
              {result.data.duration >= 60
                ? `${Math.floor(result.data.duration / 60)}h${result.data.duration % 60}m`
                : `${result.data.duration}m`}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#a78a63", letterSpacing: "0.5px" }}>DURATION</p>
          </div>
        )}

        <Avatar name={fullName} size={48} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "#e3ebf1", overflow: "hidden" }}>
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

// Unregistered RFID banner
function UnregisteredBanner({ rfidCode, onDone }) {
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
        background: "#ffffff",
        border: "1px solid #f0dcc0",
        borderLeft: "4px solid #C0792A",
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
          <AlertTriangle size={18} color="#C0792A" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#C0792A" }}>
            RFID Card Not Registered
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 11, color: "#5a7686", fontFamily: "monospace" }}>
            {rfidCode}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#7b93a3" }}>
            Please register this card via the Admin Attendance page.
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "#e3ebf1", overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#C0792A", borderRadius: 2,
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
        background: "#ffffff",
        border: "1px solid #f3d4d4",
        borderLeft: "4px solid #cc1f1f",
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
          <AlertTriangle size={18} color="#cc1f1f" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#cc1f1f" }}>
            Student Not Found
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#5a7686", fontFamily: "monospace" }}>
            {studentId}
          </p>
        </div>
      </div>
      <div style={{ height: 3, borderRadius: 2, marginTop: 6, background: "#e3ebf1", overflow: "hidden" }}>
        <div style={{
          height: "100%", background: "#cc1f1f", borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ─── Main Kiosk Page ──────────────────────────────────────
export default function KioskAttendance() {
  const now = useLiveClock();
  const [active, setActive]               = useState([]);
  const [tapResult, setTapResult]         = useState(null);
  const [notFound, setNotFound]           = useState(null);
  const [unregistered, setUnregistered]   = useState(null);
  const [online, setOnline]               = useState(navigator.onLine);
  const [processing, setProcessing]       = useState(false);
  const [nextScanIn, setNextScanIn]       = useState(0);

  const rfidBufferRef    = useRef("");
  const rfidInputRef     = useRef(null);
  const containerRef     = useRef(null);
  const lastSuccessTime  = useRef(0);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  // ── Fetch active students (HTTP) ─────────────────────
  const fetchActive = useCallback(async () => {
    try {
      const res = await getActiveAttendance();
      if (res.success) setActive(res.data || []);
    } catch {
      // silent on kiosk — WS will recover
    }
  }, []);

  // ── Real-time active-list sync via Socket.io ──────────
  useEffect(() => {
    fetchActive();

    const WS_URL = import.meta.env.VITE_WS_URL || window.location.origin;
    const socket = io(WS_URL, {
      path:                 "/socket.io",
      transports:           ["websocket", "polling"],
      withCredentials:      true,
      reconnectionDelay:    2000,
      reconnectionAttempts: 10,
    });

    const applyAttendanceUpdate = ({ action, data }) => {
      if (!data?.id) return;
      if (action === "checked_in") {
        setActive(prev =>
          prev.some(r => r.id === data.id) ? prev : [data, ...prev]
        );
      } else if (action === "checked_out") {
        setActive(prev => prev.filter(r => r.id !== data.id));
      }
    };

    socket.on("attendance:update", applyAttendanceUpdate);
    socket.on("rfid:tap",         applyAttendanceUpdate);

    const fallback = setInterval(fetchActive, 60_000);

    return () => {
      socket.disconnect();
      clearInterval(fallback);
    };
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

  // ── Auto-focus hidden input on mount ──────────────────
  useEffect(() => {
    rfidInputRef.current?.focus();
  }, []);

  // ── Countdown timer for next scan ─────────────────────
  useEffect(() => {
    if (nextScanIn <= 0) return;

    const interval = setInterval(() => {
      setNextScanIn(prev => {
        if (prev <= 16) return 0;
        return prev - 16;
      });
    }, 16);

    return () => clearInterval(interval);
  }, [nextScanIn]);

  // ── Maintain focus on any click ───────────────────────
  useEffect(() => {
    const handler = () => {
      setTimeout(() => rfidInputRef.current?.focus(), 100);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Core RFID tap handler ─────────────────────────────
  const handleRfidTap = useCallback(async (rfidCode) => {
    const now = Date.now();
    const debounceMs = 3000; // 3 seconds

    // Block if within debounce window OR processing
    if (!rfidCode?.trim() || processing || (now - lastSuccessTime.current) < debounceMs) {
      return;
    }

    setProcessing(true);
    try {
      const res = await tapRfid(rfidCode.trim());

      if (res.unregistered) {
        setUnregistered(rfidCode.trim());
      } else if (res.success) {
        setTapResult(res);

        // Set 3s debounce after SUCCESS only
        lastSuccessTime.current = now;
        setNextScanIn(debounceMs);

        // Optimistic update — apply immediately from HTTP response,
        // WS round-trip duplicate guard will silently no-op when it arrives.
        if (res.action === "checked_in" && res.data?.id) {
          setActive(prev =>
            prev.some(r => r.id === res.data.id)
              ? prev
              : [res.data, ...prev]
          );
        } else if (res.action === "checked_out" && res.data?.id) {
          setActive(prev => prev.filter(r => r.id !== res.data.id));
        }
      } else if (res.error?.toLowerCase().includes("not found")) {
        setNotFound(rfidCode.trim());
      }
    } catch {
      // silent — network banner would be distracting on a kiosk
    } finally {
      setProcessing(false);
      setTimeout(() => rfidInputRef.current?.focus(), 50);
    }
  }, [processing]);

  // ── RFID keydown — always processes input ─────────────
  const handleRfidKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      const code = rfidBufferRef.current.trim();
      rfidBufferRef.current = "";
      if (code) handleRfidTap(code);
    } else if (e.key.length === 1) {
      rfidBufferRef.current += e.key;
    }
    e.preventDefault();
  }, [handleRfidTap]);

  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
<div ref={containerRef} style={{
       minHeight: "100vh",
       backgroundImage: "linear-gradient(180deg, rgba(240,246,250,0.35), rgba(240,246,250,0.55)), url('/gate-background.png')",
       backgroundSize: "cover",
       backgroundPosition: "center",
       backgroundRepeat: "no-repeat",
       color: "#132F45",
       fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
       display: "flex", flexDirection: "column",
       position: "relative", overflow: "hidden",
     }}>

      {/* ── Hidden RFID capture input — always active ─── */}
      <input
        ref={rfidInputRef}
        onKeyDown={handleRfidKeyDown}
        onChange={() => {}}
        value=""
        readOnly
        tabIndex={0}
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

      {/* ── Header ──────────────────────────────────────── */}
      <header style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 36px",
        borderBottom: "1px solid #0a2030",
        background: "#132F45",
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
              ? <span style={{ fontSize: 11, color: "#EEA23A", fontWeight: 600 }}>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: "#ffffff" }}>{active.length}</span>
            <span style={{ fontSize: 10, color: "#8fadc2" }}>inside</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: 10, cursor: "pointer",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            {isFullscreen ? <Minimize2 size={15} color="#EEA23A" /> : <Maximize2 size={15} color="#8fadc2" />}
          </button>
        </div>
      </header>

      {/* ── Main body — full-width active students grid ── */}
      <main style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex",
        overflow: "hidden",
      }}>
        <div style={{
          flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column",
          padding: "26px 32px",
          gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <CheckCircle2 size={16} color="#3F7A5C" />
            <span style={{
              fontSize: 13, fontWeight: 700, color: "#5a7686",
              letterSpacing: "0.5px", textTransform: "uppercase",
            }}>
              Currently In Library
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
              background: "#eef6f0", color: "#3F7A5C",
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
                  width: 68, height: 68, borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #dde8ef",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Users size={26} color="#aebfca" />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#9aacb7" }}>
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

        @keyframes cardIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tapCardIn {
          from { opacity: 0; transform: translateX(-50%) translateY(36px) scale(0.94); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes tapCardOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(16px) scale(0.96); }
        }
        @keyframes bannerIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px) scale(0.96); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes bannerOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-10px); }
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
          50% { opacity: 0.45; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d8e3ec; border-radius: 2px; }
      `}</style>
    </div>
  );
}