// ─────────────────────────────────────────────────────────
//  pages/KioskAttendance.jsx
//  Library Attendance Kiosk — full-screen display view.
//  • Shows live clock + date
//  • Single Student ID input (barcode-scanner friendly)
//  • Tap = check-in / check-out toggle (backend-driven)
//  • Animated card flies in on every tap showing student details
//  • Active-students grid with live duration timers
//  • "Student Not Found" flash banner
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getActiveAttendance,
  tapAttendance,
} from "../services/api/attendanceApi";
import {
  LogIn, LogOut, Clock, Users, Wifi, WifiOff,
  BookOpen, GraduationCap, Hash, AlertTriangle, CheckCircle2,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
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

function fmtCheckIn(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
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

// ─── Live elapsed seconds per record ─────────────────────
function useElapsed(checkInTime) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000))
  );
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [checkInTime]);
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
      color: isLong ? "#f59e0b" : "#34d399",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Clock size={11} style={{ opacity: 0.8 }} />
      {fmtElapsed(elapsed)}
    </span>
  );
}

// Active student card in the grid
function StudentCard({ record, index }) {
  const [bg, accent] = avatarColors(record.student_name);
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${accent}30`,
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
      animation: `cardIn 0.4s cubic-bezier(.34,1.4,.64,1) both`,
      animationDelay: `${index * 40}ms`,
      backdropFilter: "blur(8px)",
      transition: "border-color 0.2s",
    }}>
      <Avatar name={record.student_name} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: 13, fontWeight: 700,
          color: "#f1f5f9", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {record.student_name}
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
  const [bg, accent] = avatarColors(result.data?.student_name || "");
  const [visible, setVisible] = useState(true);
  const elapsed = useElapsed(result.data?.check_in_time || new Date());

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 5500);
    const done = setTimeout(onDone, 6000);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%",
      transform: "translateX(-50%)",
      zIndex: 100,
      animation: visible ? "tapCardIn 0.5s cubic-bezier(.34,1.4,.64,1) both" : "tapCardOut 0.4s ease forwards",
      width: "min(520px, calc(100vw - 48px))",
    }}>
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
        {/* Action icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, flexShrink: 0,
          background: isIn ? "rgba(52,211,153,0.15)" : "rgba(245,158,11,0.15)",
          border: `1.5px solid ${isIn ? "#34d39944" : "#f59e0b44"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {isIn
            ? <LogIn size={24} color="#34d399" />
            : <LogOut size={24} color="#f59e0b" />
          }
        </div>

        {/* Student info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "1.5px",
            textTransform: "uppercase",
            color: isIn ? "#34d399" : "#f59e0b",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {isIn ? "✓ Checked In" : "← Checked Out"}
          </p>
          <p style={{
            margin: "4px 0 0", fontSize: 20, fontWeight: 800,
            color: "#f1f5f9", lineHeight: 1.1,
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {result.data?.student_name}
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
            {result.data?.school_year && (
              <span style={{
                fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                background: "rgba(99,102,241,0.15)", color: "#818cf8",
              }}>SY {result.data.school_year}</span>
            )}
          </div>
        </div>

        {/* Duration (only for check-out) */}
        {!isIn && result.data?.duration != null && (
          <div style={{
            textAlign: "center", flexShrink: 0,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderRadius: 12, padding: "8px 14px",
          }}>
            <p style={{
              margin: 0, fontSize: 20, fontWeight: 800,
              color: "#f59e0b", fontFamily: "monospace",
            }}>
              {result.data.duration >= 60
                ? `${Math.floor(result.data.duration / 60)}h${result.data.duration % 60}m`
                : `${result.data.duration}m`}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 9, color: "#78716c", letterSpacing: "0.5px" }}>
              DURATION
            </p>
          </div>
        )}

        {/* Avatar */}
        <Avatar name={result.data?.student_name || ""} size={52} />
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3, borderRadius: 2, marginTop: 6,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: isIn ? "#34d399" : "#f59e0b",
          borderRadius: 2,
          animation: "progressBar 5.5s linear forwards",
        }} />
      </div>
    </div>
  );
}

// Not-found flash banner
function NotFoundBanner({ studentId, onDone }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 2800);
    const done = setTimeout(onDone, 3200);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
      zIndex: 100,
      animation: visible ? "bannerIn 0.35s cubic-bezier(.34,1.4,.64,1) both" : "bannerOut 0.3s ease forwards",
      width: "min(420px, calc(100vw - 48px))",
    }}>
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
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
            Student ID Not Found
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {studentId}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Kiosk Page ──────────────────────────────────────
export default function KioskAttendance() {
  const now = useLiveClock();
  const [active, setActive]       = useState([]);
  const [idInput, setIdInput]     = useState("");
  const [tapping, setTapping]     = useState(false);
  const [tapResult, setTapResult] = useState(null);
  const [notFound, setNotFound]   = useState(null);
  const [online, setOnline]       = useState(navigator.onLine);
  const inputRef = useRef(null);

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
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Tap handler ───────────────────────────────────────
  const handleTap = useCallback(async () => {
    const id = idInput.trim();
    if (!id || tapping) return;
    setTapping(true);
    try {
      const res = await tapAttendance(id);
      if (res.success) {
        setTapResult(res);
        fetchActive();
      } else if (res.error?.toLowerCase().includes("not found")) {
        setNotFound(id);
      }
    } catch {
      setNotFound(idInput.trim());
    } finally {
      setIdInput("");
      setTapping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [idInput, tapping, fetchActive]);

  const handleKeyDown = (e) => { if (e.key === "Enter") handleTap(); };

  // Format clock
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #060d18 0%, #0a1628 40%, #060d18 100%)",
      color: "#f1f5f9",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
      position: "relative", overflow: "hidden",
    }}>

      {/* ── Ambient background orbs ─────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        overflow: "hidden",
      }}>
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
        {/* Grid lines */}
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
        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #EEA23A, #d4841f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(238,162,58,0.35)",
          }}>
            <BookOpen size={20} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.3px" }}>
              Lexora Library
            </p>
            <p style={{ margin: 0, fontSize: 10, color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase" }}>
              Attendance Kiosk
            </p>
          </div>
        </div>

        {/* Live clock */}
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

        {/* Status + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Online indicator */}
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
          {/* Active count */}
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
        </div>
      </header>

      {/* ── Main body ───────────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        flex: 1, display: "flex", gap: 0,
        padding: "0",
        overflow: "hidden",
      }}>

        {/* ── Left: Tap input panel ──────────────────────── */}
        <div style={{
          width: 340, flexShrink: 0,
          borderRight: "1px solid rgba(255,255,255,0.05)",
          display: "flex", flexDirection: "column",
          padding: "32px 28px",
          gap: 28,
          background: "rgba(255,255,255,0.015)",
          backdropFilter: "blur(8px)",
        }}>

          {/* Instruction */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
              background: "linear-gradient(135deg, rgba(238,162,58,0.2), rgba(238,162,58,0.05))",
              border: "1.5px solid rgba(238,162,58,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Hash size={28} color="#EEA23A" />
            </div>
            <h2 style={{
              margin: 0, fontSize: 18, fontWeight: 800, color: "#f1f5f9",
              letterSpacing: "-0.5px",
            }}>
              Scan or Enter ID
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
              Place your ID card on the scanner or type your Student ID below
            </p>
          </div>

          {/* Input */}
          <div style={{ position: "relative" }}>
            <input
              ref={inputRef}
              type="text"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Student ID…"
              autoFocus
              disabled={tapping}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "14px 16px",
                fontSize: 18, fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "1px",
                background: "rgba(255,255,255,0.06)",
                border: `1.5px solid ${idInput ? "rgba(238,162,58,0.5)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 14, color: "#f1f5f9",
                outline: "none", textAlign: "center",
                transition: "border-color 0.2s, box-shadow 0.2s",
                boxShadow: idInput ? "0 0 0 3px rgba(238,162,58,0.12)" : "none",
              }}
            />
            {tapping && (
              <div style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(238,162,58,0.3)",
                  borderTopColor: "#EEA23A",
                  animation: "spin 0.7s linear infinite",
                }} />
              </div>
            )}
          </div>

          {/* Tap button */}
          <button
            onClick={handleTap}
            disabled={!idInput.trim() || tapping}
            style={{
              width: "100%", padding: "14px",
              fontSize: 14, fontWeight: 800, letterSpacing: "0.5px",
              textTransform: "uppercase",
              background: idInput.trim() && !tapping
                ? "linear-gradient(135deg, #EEA23A, #d4841f)"
                : "rgba(255,255,255,0.06)",
              color: idInput.trim() && !tapping ? "#fff" : "#475569",
              border: "none", borderRadius: 14, cursor: idInput.trim() && !tapping ? "pointer" : "not-allowed",
              transition: "all 0.2s",
              boxShadow: idInput.trim() && !tapping ? "0 4px 20px rgba(238,162,58,0.35)" : "none",
            }}
          >
            {tapping ? "Processing…" : "Tap In / Out"}
          </button>

          {/* Divider */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} />

          {/* Instructions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: LogIn,  color: "#34d399", label: "1st tap", desc: "Check In" },
              { icon: LogOut, color: "#f59e0b", label: "2nd tap", desc: "Check Out" },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10,
                background: `${color}0d`, border: `1px solid ${color}22`,
              }}>
                <Icon size={16} color={color} />
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 6 }}>→ {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Active students grid ────────────────── */}
        <div style={{
          flex: 1, overflow: "hidden",
          display: "flex", flexDirection: "column",
          padding: "28px 32px",
          gap: 16,
        }}>

          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <CheckCircle2 size={16} color="#34d399" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              Currently In Library
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 20,
              background: "rgba(52,211,153,0.12)", color: "#34d399",
            }}>
              {active.length}
            </span>
          </div>

          {/* Grid */}
          <div style={{
            flex: 1, overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 10,
            alignContent: "start",
            paddingBottom: 120, // space for tap card
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

      {/* ── Tap result card (floats above everything) ────── */}
      {tapResult && (
        <TapCard
          result={tapResult}
          onDone={() => setTapResult(null)}
        />
      )}

      {/* ── Not found banner ─────────────────────────────── */}
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
          to { transform: translateY(-50%) rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}
