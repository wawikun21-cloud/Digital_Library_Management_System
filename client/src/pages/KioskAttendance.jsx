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
import { getStudentByStudentIdNumber, createStudent } from "../services/api/studentsApi";
import {
  LogIn, LogOut, Clock, Users, Wifi, WifiOff,
  Hash, AlertTriangle, CheckCircle2,
  Maximize2, Minimize2, UserPlus, X, ChevronRight,
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

// ─── Fullscreen hook ──────────────────────────────────────
function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback(() => {
    const el = ref.current || document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
  }, [ref]);

  const exit = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  }, []);

  const toggle = useCallback(() => {
    isFullscreen ? exit() : enter();
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, toggle };
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
      color: isLong ? "#ffe600" : "#34d399",
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
  const [, accent] = avatarColors(result.data?.student_name || "");
  const [phase, setPhase] = useState("enter"); // "enter" | "exit"

  // After progress bar runs out (2.7s), switch to exit phase
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 2700);
    return () => clearTimeout(t);
  }, []);

  // When exit animation finishes, remove the card from the tree
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
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ─── Register Student Modal ───────────────────────────────
// Opens when RFID is scanned but student is NOT in students table.
// Looks up student from DB, pre-fills form, asks "Register This Student?"
function RegisterStudentModal({ scannedId, onClose, onRegistered }) {
  const CURRENT_SY = (() => {
    const y = new Date().getFullYear();
    const m = new Date().getMonth(); // 0-based; June=5
    return m >= 5 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  })();

  const [form, setForm] = useState({
    student_id_number: scannedId,
    first_name:        "",
    last_name:         "",
    student_name:      "",
    student_course:    "",
    student_yr_level:  "",
    student_school_year: CURRENT_SY,
    student_email:     "",
  });
  const [looking,    setLooking]    = useState(true);
  const [found,      setFound]      = useState(false); // exists in students table
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [debugRaw,   setDebugRaw]   = useState(null); // ← temp debug
  const firstRef = useRef(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Auto-lookup student from DB on mount
  useEffect(() => {
    let cancelled = false;
    setLooking(true);
    getStudentByStudentIdNumber(scannedId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          const s = res.data;
          setDebugRaw(s); // ← capture raw response
          setFound(true);
          const fn = s.first_name || "";
          const ln = s.last_name  || "";
          setForm(f => ({
            ...f,
            first_name:          fn,
            last_name:           ln,
            student_name:        `${fn} ${ln}`.trim() || s.student_name || "",
            student_course:      s.student_course     || "",
            student_yr_level:    s.student_yr_level   || "",
            student_school_year: s.student_school_year || CURRENT_SY,
            student_email:       s.student_email      || "",
          }));
        }
        // if not found, form stays with just the scanned ID pre-filled
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLooking(false); });
    return () => { cancelled = true; };
  }, [scannedId]);

  // Focus first editable field once lookup done
  useEffect(() => {
    if (!looking) setTimeout(() => firstRef.current?.focus(), 80);
  }, [looking]);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm(f => {
      const next = { ...f, [key]: val };
      // Always rebuild student_name as "FirstName LastName"
      if (key === "first_name" || key === "last_name") {
        const fn = key === "first_name" ? val.trim() : f.first_name.trim();
        const ln = key === "last_name"  ? val.trim() : f.last_name.trim();
        next.student_name = [fn, ln].filter(Boolean).join(" ");
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required."); return;
    }
    if (!form.student_course.trim()) {
      setError("Course is required."); return;
    }
    if (!form.student_yr_level.trim()) {
      setError("Year level is required."); return;
    }
    setSubmitting(true);
    try {
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();
      const payload = {
        student_id_number:   form.student_id_number,
        first_name:          form.first_name.trim(),
        last_name:           form.last_name.trim(),
        student_name:        fullName,
        display_name:        fullName,
        student_course:      form.student_course.trim(),
        student_yr_level:    form.student_yr_level.trim(),
        student_school_year: form.student_school_year.trim(),
        student_email:       form.student_email.trim(),
        is_active:           1,
      };
      const res = await createStudent(payload);
      if (res.success) {
        onRegistered(scannedId); // triggers tap/check-in after register
      } else {
        setError(res.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Shared input style
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 10, fontSize: 13,
    fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
    background: "rgba(255,255,255,0.06)",
    border: "1.5px solid rgba(255,255,255,0.12)",
    color: "#f1f5f9", outline: "none",
    transition: "border-color 0.2s",
  };
  const labelStyle = {
    display: "block", fontSize: 10, fontWeight: 700,
    letterSpacing: "1px", textTransform: "uppercase",
    color: "#64748b", marginBottom: 5,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, animation: "overlayIn 0.2s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 520,
        background: "linear-gradient(160deg, #0d1f35 0%, #0a1628 100%)",
        border: "1.5px solid rgba(99,102,241,0.3)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
        overflow: "hidden",
        animation: "modalIn 0.3s cubic-bezier(.34,1.4,.64,1)",
      }}>

        {/* ── Header ───────────────────────────────────── */}
        <div style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "rgba(99,102,241,0.15)",
              border: "1.5px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <UserPlus size={18} color="#818cf8" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>
                Register This Student?
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>
                RFID <span style={{ fontFamily: "monospace", color: "#818cf8" }}>{scannedId}</span> is not registered
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "rgba(255,255,255,0.06)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={14} color="#64748b" />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────── */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

          {looking ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 10, padding: "32px 0", color: "#64748b",
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: "2px solid rgba(99,102,241,0.3)",
                borderTopColor: "#818cf8",
                animation: "spin 0.7s linear infinite",
              }} />
              <span style={{ fontSize: 13 }}>Looking up student record…</span>
            </div>
          ) : (
            <>
              {/* Student ID — read only */}
              <div>
                <label style={labelStyle}>Student ID</label>
                <input
                  value={form.student_id_number}
                  readOnly
                  style={{ ...inputStyle, background: "rgba(99,102,241,0.08)", color: "#818cf8", fontFamily: "monospace", cursor: "not-allowed" }}
                />
              </div>

              {/* ── DEBUG PANEL (remove after fixing) ── */}
              {debugRaw && (
                <div style={{
                  padding: "10px 12px", borderRadius: 8, fontSize: 11,
                  background: "rgba(255,200,0,0.08)",
                  border: "1px solid rgba(255,200,0,0.3)",
                  color: "#fbbf24", fontFamily: "monospace",
                  lineHeight: 1.7,
                }}>
                  <strong style={{ display: "block", marginBottom: 4 }}>🐛 Raw API response:</strong>
                  student_name: <b>"{debugRaw.student_name}"</b><br/>
                  first_name: <b>"{debugRaw.first_name}"</b><br/>
                  last_name: <b>"{debugRaw.last_name}"</b><br/>
                  display_name: <b>"{debugRaw.display_name}"</b>
                </div>
              )}

              {/* First + Last name row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    ref={firstRef}
                    value={form.first_name}
                    onChange={set("first_name")}
                    placeholder="e.g. Juan"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    value={form.last_name}
                    onChange={set("last_name")}
                    placeholder="e.g. Dela Cruz"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>
              </div>

              {/* Full name preview */}
              {form.student_name && (
                <div style={{
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(52,211,153,0.07)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  fontSize: 12, color: "#34d399",
                }}>
                  Full name: <strong>{form.student_name}</strong>
                </div>
              )}

              {/* Course */}
              <div>
                <label style={labelStyle}>Course *</label>
                <input
                  value={form.student_course}
                  onChange={set("student_course")}
                  placeholder="e.g. BSIT, BSCS, BSEd"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>

              {/* Year Level + School Year row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Year Level *</label>
                  <select
                    value={form.student_yr_level}
                    onChange={set("student_yr_level")}
                    style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  >
                    <option value="">Select year…</option>
                    {["1st Year","2nd Year","3rd Year","4th Year","Graduate"].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>School Year</label>
                  <input
                    value={form.student_school_year}
                    onChange={set("student_school_year")}
                    placeholder="e.g. 2025-2026"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                    onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={form.student_email}
                  onChange={set("student_email")}
                  placeholder="e.g. juan@school.edu.ph"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: "9px 12px", borderRadius: 8,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  fontSize: 12, color: "#ef4444",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <AlertTriangle size={13} /> {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────── */}
        {!looking && (
          <div style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", gap: 10, justifyContent: "flex-end",
          }}>
            <button
              onClick={onClose}
              style={{
                padding: "10px 20px", borderRadius: 10, fontSize: 13,
                fontWeight: 600, cursor: "pointer", border: "none",
                background: "rgba(255,255,255,0.06)", color: "#94a3b8",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                padding: "10px 22px", borderRadius: 10, fontSize: 13,
                fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer",
                border: "none", display: "flex", alignItems: "center", gap: 8,
                background: submitting ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                boxShadow: submitting ? "none" : "0 4px 16px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
              }}
            >
              {submitting ? (
                <>
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  Registering…
                </>
              ) : (
                <>
                  <UserPlus size={14} /> Register &amp; Check In
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function NotFoundBanner({ studentId, onDone }) {
  const [phase, setPhase] = useState("enter"); // "enter" | "exit"

  // After progress bar runs out (2.7s), switch to exit phase
  useEffect(() => {
    const t = setTimeout(() => setPhase("exit"), 2700);
    return () => clearTimeout(t);
  }, []);

  // When exit animation finishes, remove from tree
  const handleAnimationEnd = () => {
    if (phase === "exit") onDone();
  };

  const animation =
    phase === "enter"
      ? "bannerIn 0.35s cubic-bezier(.34,1.4,.64,1) both"
      : "bannerOut 0.35s ease forwards";

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      style={{
        position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
        zIndex: 100,
        animation,
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
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#ef4444", fontFamily: "'DM Sans', sans-serif" }}>
            Student ID Not Found
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>
            {studentId}
          </p>
        </div>
      </div>

      {/* Progress bar — identical to TapCard */}
      <div style={{
        height: 3, borderRadius: 2, marginTop: 6,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          background: "#ef4444",
          borderRadius: 2,
          animation: "progressBar 2.7s linear forwards",
        }} />
      </div>
    </div>
  );
}

// ─── Main Kiosk Page ──────────────────────────────────────
export default function KioskAttendance() {
  const now = useLiveClock();
  const [active, setActive]           = useState([]);
  const [idInput, setIdInput]         = useState("");
  const [tapping, setTapping]         = useState(false);
  const [tapResult, setTapResult]     = useState(null);
  const [notFound, setNotFound]       = useState(null);
  const [registerModal, setRegisterModal] = useState(null); // scanned ID for registration
  const [online, setOnline]           = useState(navigator.onLine);
  const inputRef     = useRef(null);
  const containerRef = useRef(null);
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
        // Open registration modal instead of error banner
        setRegisterModal(id);
      }
    } catch {
      setNotFound(idInput.trim());
    } finally {
      setIdInput("");
      setTapping(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [idInput, tapping, fetchActive]);

  // ── After registration → auto check-in ───────────────
  const handleRegistered = useCallback(async (studentId) => {
    setRegisterModal(null);
    // Small delay so DB write settles before tap
    await new Promise(r => setTimeout(r, 400));
    try {
      const res = await tapAttendance(studentId);
      if (res.success) {
        setTapResult(res);
        fetchActive();
      } else {
        setNotFound(studentId);
      }
    } catch {
      setNotFound(studentId);
    } finally {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [fetchActive]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleTap();
    if (e.key === "F11")  { e.preventDefault(); toggleFullscreen(); }
  };

  // Format clock
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
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F11)" : "Enter Fullscreen (F11)"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10, cursor: "pointer",
              background: isFullscreen ? "rgba(238,162,58,0.15)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${isFullscreen ? "rgba(238,162,58,0.35)" : "rgba(255,255,255,0.1)"}`,
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = isFullscreen ? "rgba(238,162,58,0.25)" : "rgba(255,255,255,0.12)";
              e.currentTarget.style.borderColor = isFullscreen ? "rgba(238,162,58,0.5)" : "rgba(255,255,255,0.2)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = isFullscreen ? "rgba(238,162,58,0.15)" : "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = isFullscreen ? "rgba(238,162,58,0.35)" : "rgba(255,255,255,0.1)";
            }}
          >
            {isFullscreen
              ? <Minimize2 size={15} color="#EEA23A" />
              : <Maximize2 size={15} color="#94a3b8" />
            }
          </button>
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
              background: "linear-gradient(135deg, #ffe60031, rgba(255, 149, 0, 0.05))",
              border: "1.5px solid #ffe600",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Hash size={28} color="#ffe600" />
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
                  border: "2px solid #ffe600af",
                  borderTopColor: "#ffe600",
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
                ? "linear-gradient(135deg, #ffe600, #d4841f)"
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
              { icon: LogOut, color: "#ffe600", label: "2nd tap", desc: "Check Out" },
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

      {/* ── Register Student Modal ───────────────────────── */}
      {registerModal && (
        <RegisterStudentModal
          scannedId={registerModal}
          onClose={() => {
            setRegisterModal(null);
            setTimeout(() => inputRef.current?.focus(), 80);
          }}
          onRegistered={handleRegistered}
        />
      )}

      {/* ── Global keyframes ─────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

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
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
      `}</style>
    </div>
  );
}