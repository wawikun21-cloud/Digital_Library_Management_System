// ─────────────────────────────────────────────────────────
//  pages/Attendance.jsx
//  Attendance Management Page
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AttendanceTable from "../components/AttendanceTable";
import { useNavigate } from "react-router-dom";
import {
  Search, Clock, ArrowRight, ArrowLeft, Trash2, Users,
  AlertCircle, X, Download, Calendar, Filter, ChevronDown,
  User, Hash, GraduationCap, CheckCircle2, XCircle,
  FileText, Timer, BookOpen, LogIn, AlertTriangle, Monitor,
  Wifi, WifiOff, CreditCard, UserPlus, Loader2, ShieldCheck,
} from "lucide-react";
import {
  getAllAttendance,
  getActiveAttendance,
  getAttendanceStats,
  getAttendanceByStudentId,
  tapAttendance,
  checkOut,
  deleteAttendance,
} from "../services/api/attendanceApi";
import { registerRfid, simulateRfidTap } from "../services/api/rfidApi";
import { getStudentByStudentIdNumber, getAllStudents } from "../services/api/studentsApi";
import StatsCard from "../components/StatsCard";
import Toast from "../components/Toast";
import useDebounce from "../hooks/useDebounce";

const pad = (n) => String(n).padStart(2, "0");

function fmtDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDuration(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

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

function Avatar({ name, size = 32 }) {
  const COLORS = ["#32667F", "#EEA23A", "#2d7a47", "#7c3aed", "#EA8B33"];
  const bg = COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 text-white"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(name)}
    </div>
  );
}

function StatusPill({ status }) {
  const isIn = status === "checked_in";
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
      style={{
        background: isIn ? "rgba(45,122,71,0.12)" : "rgba(238,162,58,0.15)",
        color: isIn ? "#2d7a47" : "#b87a1a",
      }}
    >
      {isIn ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {isIn ? "Checked In" : "Checked Out"}
    </span>
  );
}

function parseAsUTC(dt) {
  if (!dt) return new Date();
  const s = String(dt);
  if (s.endsWith("Z") || s.includes("+")) return new Date(s);
  return new Date(s.replace(" ", "T") + "Z");
}

function LiveDuration({ checkInTime }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - parseAsUTC(checkInTime).getTime()) / 1000))
  );
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - parseAsUTC(checkInTime).getTime()) / 1000))),
      1000
    );
    return () => clearInterval(t);
  }, [checkInTime]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold"
      style={{ color: "var(--accent-amber)" }}>
      <Clock size={13} className="animate-pulse" />
      {h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`}
    </span>
  );
}

function Spinner({ size = 18 }) {
  return (
    <svg
      className="animate-spin"
      style={{ width: size, height: size, color: "var(--accent-amber)" }}
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function StudentNotFoundModal({ studentId, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.65)", backdropFilter: "blur(4px)", animation: "overlayIn .18s ease" }}
    >
      <div
        className="w-full flex flex-col items-center text-center gap-5 p-8 rounded-2xl"
        style={{
          maxWidth: 400,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(220,38,38,0.1)", border: "1.5px solid rgba(220,38,38,0.25)" }}>
          <AlertTriangle size={30} style={{ color: "#dc2626" }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
            Student ID Not Found
          </h2>
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            The ID{" "}
            <span className="font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: "var(--bg-subtle)", color: "var(--text-primary)" }}>
              {studentId}
            </span>{" "}
            does not match any registered student in the system.
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            Please verify the ID and try again, or contact the librarian.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
          style={{ background: "#dc2626", boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}
        >
          OK, Try Again
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  RFID Registration Modal — Enhanced UI
// ─────────────────────────────────────────────────────────
function RfidRegistrationModal({ onClose, onRegistered, onToast }) {
  const overlayRef = useRef(null);
  const [rfidCode, setRfidCode] = useState("");
  const rfidInputRef = useRef(null);
  const [studentIdInput,  setStudentIdInput]  = useState("");
  const [allStudents,     setAllStudents]     = useState([]);
  const [searchResults,   setSearchResults]   = useState([]);
  const [showDropdown,    setShowDropdown]    = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const searchRef   = useRef(null);
  const dropdownRef = useRef(null);
  const debouncedStudentId = useDebounce(studentIdInput, 250);
  const [registering, setRegistering] = useState(false);
  const [regError,    setRegError]    = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setTimeout(() => rfidInputRef.current?.focus(), 80);
  }, []);

  useEffect(() => {
    setLoadingStudents(true);
    getAllStudents()
      .then((res) => { if (res.success) setAllStudents(res.data || []); })
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    if (!debouncedStudentId.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const q = debouncedStudentId.toLowerCase();
    const results = allStudents.filter((s) =>
      s.student_id_number?.toLowerCase().includes(q) ||
      s.first_name?.toLowerCase().includes(q) ||
      s.last_name?.toLowerCase().includes(q) ||
      s.student_name?.toLowerCase().includes(q)
    ).slice(0, 8);
    setSearchResults(results);
    setShowDropdown(results.length > 0);
  }, [debouncedStudentId, allStudents]);

  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        searchRef.current && !searchRef.current.contains(e.target)
      ) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentIdInput(student.student_id_number);
    setShowDropdown(false);
    setRegError("");
  };

  const handleStudentIdChange = (e) => {
    setStudentIdInput(e.target.value);
    if (selectedStudent && e.target.value !== selectedStudent.student_id_number)
      setSelectedStudent(null);
    setRegError("");
  };

  const handleRegister = async () => {
    if (!rfidCode.trim()) { setRegError("Please enter or scan the RFID code."); return; }
    if (!selectedStudent) { setRegError("Please select a student from the list."); return; }
    setRegistering(true);
    setRegError("");
    try {
      const res = await registerRfid(rfidCode.trim(), selectedStudent.student_id_number);
      if (res.success) {
        const name = getFullName(selectedStudent) || selectedStudent.student_id_number;
        onToast?.(`RFID card registered to ${name}`, "success");
        onRegistered(res.data, selectedStudent);
      } else {
        const msg = res.error || "Registration failed. Please try again.";
        setRegError(msg);
        onToast?.(msg, "error");
      }
    } catch {
      const msg = "Network error. Please try again.";
      setRegError(msg);
      onToast?.(msg, "error");
    } finally {
      setRegistering(false);
    }
  };

  const fullName = selectedStudent
    ? (selectedStudent.display_name ||
       [selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ") ||
       selectedStudent.student_name || "")
    : "";

  const isReady = rfidCode.trim() && selectedStudent;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{
        background: "rgba(8,18,28,0.78)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "overlayIn .18s ease",
      }}
    >
      <div
        className="w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          maxWidth: 520,
          maxHeight: "92vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "modalIn .24s cubic-bezier(.34,1.46,.64,1)",
        }}
      >
        {/* ── Header ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{
            background: "linear-gradient(135deg, rgba(45,122,71,0.12) 0%, rgba(238,162,58,0.08) 100%)",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(45, 53, 122, 0.2), rgba(70, 58, 238, 0.15))",
                border: "1.5px solid rgba(45, 76, 122, 0.3)",
                boxShadow: "0 2px 8px rgba(45, 76, 122, 0.15)",
              }}
            >
              <CreditCard size={18} style={{ color: "#11004e" }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                Register RFID Card
              </h2>
              <p className="text-[11.5px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Link an RFID card to a student account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.08)"; e.currentTarget.style.color = "#dc2626"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable Body ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-6 py-5">

            {/* Step 1 — RFID Code */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: rfidCode.trim() ? "#130b7e" : "var(--accent-amber)" }}
                >
                  {rfidCode.trim() ? <CheckCircle2 size={12} /> : "1"}
                </span>
                <label className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Scan or Enter RFID Code
                  <span className="ml-1" style={{ color: "#dc2626" }}>*</span>
                </label>
              </div>
              <div className="relative">
                <CreditCard
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: rfidCode.trim() ? "#130b7e" : "var(--text-muted)" }}
                />
                <input
                  ref={rfidInputRef}
                  type="text"
                  value={rfidCode}
                  onChange={(e) => { setRfidCode(e.target.value); setRegError(""); }}
                  placeholder="Place card on reader or type code…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] font-mono outline-none transition-all"
                  style={{
                    background: rfidCode.trim() ? "rgba(45,122,71,0.05)" : "var(--bg-input)",
                    border: `1.5px solid ${rfidCode.trim() ? "rgba(45,122,71,0.45)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                    boxShadow: rfidCode.trim() ? "0 0 0 3px rgba(45,122,71,0.08)" : "none",
                    letterSpacing: "0.5px",
                  }}
                />
                {rfidCode.trim() && (
                  <button
                    onClick={() => setRfidCode("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
              </div>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                Place the card on the RFID reader — it will auto-fill, or type the code manually.
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
              <span className="text-[10.5px] font-bold tracking-widest px-2"
                style={{ color: "var(--text-muted)" }}>
                LINK TO STUDENT
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--border-light)" }} />
            </div>

            {/* Step 2 — Student Search */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: selectedStudent ? "#130b7e" : "var(--accent-amber)" }}
                >
                  {selectedStudent ? <CheckCircle2 size={12} /> : "2"}
                </span>
                <label className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Search Student
                  <span className="ml-1" style={{ color: "#dc2626" }}>*</span>
                </label>
                {loadingStudents && (
                  <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <Loader2 size={11} className="animate-spin" /> Loading…
                  </span>
                )}
              </div>

              <div className="relative" ref={searchRef}>
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                  style={{ color: selectedStudent ? "#2d7a47" : "var(--text-muted)" }}
                />
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={handleStudentIdChange}
                  onFocus={() => { if (searchResults.length > 0) setShowDropdown(true); }}
                  placeholder="Type Student ID or name to search…"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{
                    background: selectedStudent ? "rgba(45,122,71,0.05)" : "var(--bg-input)",
                    border: `1.5px solid ${selectedStudent ? "rgba(45,122,71,0.45)" : "var(--border)"}`,
                    color: "var(--text-primary)",
                    boxShadow: selectedStudent ? "0 0 0 3px rgba(45,122,71,0.08)" : "none",
                  }}
                />

                {/* Dropdown */}
                {showDropdown && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      boxShadow: "0 16px 40px rgba(0,0,0,0.22)",
                      maxHeight: 240,
                      overflowY: "auto",
                    }}
                  >
                    {searchResults.map((student, idx) => {
                      const name = student.display_name ||
                        [student.first_name, student.last_name].filter(Boolean).join(" ") ||
                        student.student_name;
                      return (
                        <button
                          key={student.student_id_number}
                          onClick={() => handleSelectStudent(student)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          style={{
                            borderBottom: idx < searchResults.length - 1 ? "1px solid var(--border-light)" : "none",
                          }}
                        >
                          <Avatar name={name} size={30} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                              {name}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
                                {student.student_id_number}
                              </span>
                              {student.student_course && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: "rgba(50,102,127,.1)", color: "#32667F" }}>
                                  {student.student_course}
                                </span>
                              )}
                              {student.student_yr_level && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                                  {student.student_yr_level}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Student Card */}
            {selectedStudent && (
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: "1.5px solid rgba(45,122,71,0.3)",
                  background: "linear-gradient(135deg, rgba(45,122,71,0.05), rgba(45,122,71,0.02))",
                  animation: "modalIn .18s ease",
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(45,122,71,0.12)" }}>
                  <Avatar name={fullName} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {fullName}
                    </p>
                    <p className="font-mono text-[12px] mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {selectedStudent.student_id_number}
                    </p>
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(45,122,71,0.15)" }}
                  >
                    <CheckCircle2 size={15} style={{ color: "var(--text-primary)" }} />
                  </div>
                </div>
                <div className="grid grid-cols-2"
                  style={{ background: "rgba(45,122,71,0.03)" }}>
                  {[
                    { label: "First Name",  value: selectedStudent.first_name        || "—" },
                    { label: "Last Name",   value: selectedStudent.last_name         || "—" },
                    { label: "Course",      value: selectedStudent.student_course    || "—" },
                    { label: "Year Level",  value: selectedStudent.student_yr_level  || "—" },
                  ].map(({ label, value }, i) => (
                    <div
                      key={label}
                      className="px-4 py-2.5"
                      style={{
                        borderRight: i % 2 === 0 ? "1px solid rgba(45,122,71,0.1)" : "none",
                        borderBottom: i < 2 ? "1px solid rgba(45,122,71,0.1)" : "none",
                      }}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5"
                        style={{ color: "var(--text-primary)" }}>
                        {label}
                      </p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {regError && (
              <div
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl"
                style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)" }}
              >
                <AlertTriangle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                <p className="text-[12.5px] font-medium" style={{ color: "#dc2626" }}>{regError}</p>
              </div>
            )}

            {/* Info note */}
            <div
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
              style={{ background: "rgba(50,102,127,0.07)", border: "1px solid rgba(50,102,127,0.15)" }}
            >
              <AlertCircle size={13} style={{ color: "#32667F", flexShrink: 0, marginTop: 1 }} />
              <p className="text-[11.5px] leading-relaxed" style={{ color: "#32667F" }}>
                Once registered, tapping this card will check the student <strong>in</strong> on the first tap and <strong>out</strong> on the second tap.
              </p>
            </div>

          </div>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}
        >
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full transition-all"
              style={{ background: rfidCode.trim() ? "#1c005c" : "var(--border)" }} />
            <div className="w-2 h-2 rounded-full transition-all"
              style={{ background: selectedStudent ? "#1c005c" : "var(--border)" }} />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleRegister}
              disabled={!isReady || registering}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isReady
                  ? "linear-gradient(135deg, #001844, #000caf)"
                  : "var(--accent-amber)",
                boxShadow: isReady ? "0 3px 10px rgba(26, 0, 141, 0.35)" : "0 2px 8px rgba(238,162,58,.3)",
                transition: "all .2s ease",
              }}
            >
              {registering
                ? <><Loader2 size={14} className="animate-spin" /> Registering…</>
                : <><UserPlus size={14} /> Register Card</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Tap-result feedback card
// ─────────────────────────────────────────────────────────
function TapResult({ result, onDismiss }) {
  const isIn = result.action === "checked_in";

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl"
      style={{
        background: isIn ? "rgba(45,122,71,0.08)" : "rgba(238,162,58,0.10)",
        border: `1px solid ${isIn ? "rgba(45,122,71,0.3)" : "rgba(238,162,58,0.4)"}`,
        animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isIn ? "rgba(45,122,71,0.15)" : "rgba(238,162,58,0.2)" }}
      >
        {isIn ? <CheckCircle2 size={20} style={{ color: "#2d7a47" }} /> : <XCircle size={20} style={{ color: "#b87a1a" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold truncate" style={{ color: isIn ? "#2d7a47" : "#b87a1a" }}>
          {isIn ? "Checked In" : "Checked Out"} — {getFullName(result.data || {}) || result.data?.student_name}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {result.data?.student_course && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(50,102,127,.12)", color: "#32667F" }}>
              {result.data.student_course}
            </span>
          )}
          {result.data?.student_yr_level && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
              {result.data.student_yr_level}
            </span>
          )}
          {result.data?.school_year && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(16,185,129,.1)", color: "#059669" }}>
              SY {result.data.school_year}
            </span>
          )}
        </div>
      </div>
      <button onClick={onDismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity">
        <X size={14} style={{ color: "var(--text-secondary)" }} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  PDF Generator
// ─────────────────────────────────────────────────────────
function printToPDF({ title, subtitle, columns, rows, footer }) {
  const e = (v) => String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${e(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:32px}
.hdr{border-bottom:2px solid #EEA23A;padding-bottom:12px;margin-bottom:20px}
.hdr h1{font-size:18px;font-weight:700;color:#132F45}
.hdr p{font-size:11px;color:#666;margin-top:3px}
table{width:100%;border-collapse:collapse}
th{background:#132F45;color:#fff;padding:8px 10px;text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase}
td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11.5px}
tr:nth-child(even) td{background:#f8f9fa}
.ftr{margin-top:16px;font-size:10px;color:#999;text-align:right}
@media print{body{padding:12px}}
</style></head><body>
<div class="hdr"><h1>${e(title)}</h1><p>${e(subtitle)}</p></div>
<table>
<thead><tr>${columns.map((c) => `<th>${e(c)}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody>
</table>
<div class="ftr">${e(footer)}</div>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups to download PDF."); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 500);
}

function downloadGeneralPDF(records) {
  printToPDF({
    title: "Library Attendance Report",
    subtitle: `Generated: ${new Date().toLocaleString("en-US")} · Total records: ${records.length}`,
    columns: ["#", "Student Name", "ID Number", "Course", "Year Level", "School Year", "Check In", "Check Out", "Duration", "Status"],
    rows: records.map((r, i) => [
      i + 1, r.student_name, r.student_id_number,
      r.student_course || "—", r.student_yr_level || "—", r.school_year || "—",
      fmtDateTime(r.check_in_time),
      r.check_out_time ? fmtDateTime(r.check_out_time) : "—",
      r.status === "checked_in" ? "Still Inside" : fmtDuration(r.duration),
      r.status === "checked_in" ? "Checked In" : "Checked Out",
    ]),
    footer: `Lexora Digital Library Management System · ${new Date().toLocaleDateString()}`,
  });
}

function downloadIndividualPDF(person, history) {
  printToPDF({
    title: `Attendance History — ${person.student_name}`,
    subtitle: `ID: ${person.student_id_number} · ${[person.student_course, person.student_yr_level, person.school_year ? `SY ${person.school_year}` : ""].filter(Boolean).join(" · ")} · Visits: ${history.length}`,
    columns: ["#", "Date", "Check In", "Check Out", "Duration", "Status"],
    rows: history.map((r, i) => [
      i + 1, fmtDate(r.check_in_time),
      fmtDateTime(r.check_in_time),
      r.check_out_time ? fmtDateTime(r.check_out_time) : "—",
      r.status === "checked_in" ? "Still Inside" : fmtDuration(r.duration),
      r.status === "checked_in" ? "Checked In" : "Checked Out",
    ]),
    footer: `Lexora Digital Library Management System · ${new Date().toLocaleDateString()}`,
  });
}

// ─────────────────────────────────────────────────────────
//  Student History Modal
// ─────────────────────────────────────────────────────────
function StudentModal({ record, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAttendanceByStudentId(record.student_id_number)
      .then((res) => { if (!cancelled && res.success) setHistory(res.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [record.student_id_number]);

  const totalMins  = history.reduce((a, r) => a + (r.duration || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);
  const handleOverlay = (e) => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(4px)", animation: "overlayIn .2s ease" }}
    >
      <div
        className="flex flex-col w-full overflow-hidden"
        style={{
          maxWidth: 700, maxHeight: "90vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
          <div className="flex items-center gap-3">
            <Avatar name={record.student_name} size={40} />
            <div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>
                {record.student_name}
              </h2>
              <div className="flex gap-2 flex-wrap mt-0.5">
                <span className="text-[12px] font-mono" style={{ color: "var(--text-secondary)" }}>
                  {record.student_id_number}
                </span>
                {record.student_course && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(50,102,127,.1)", color: "#32667F" }}>
                    {record.student_course}
                  </span>
                )}
                {record.student_yr_level && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                    {record.student_yr_level}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadIndividualPDF(record, history)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-90"
              style={{ background: "var(--accent-amber)", color: "#fff" }}
            >
              <Download size={12} /> PDF Download 
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex gap-5 px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
          {[
            { icon: BookOpen,     label: "Total Visits", value: history.length,           color: "#3b82f6" },
            { icon: Timer,        label: "Total Hours",  value: `${totalHours}h`,          color: "#EEA23A" },
            { icon: CheckCircle2, label: "Status Now",   value: record.status === "checked_in" ? "Inside" : "Outside",
              color: record.status === "checked_in" ? "#22c55e" : "#a855f7" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: `${color}1a` }}>
                <Icon size={13} style={{ color }} />
              </div>
              <div>
                <p className="text-[14px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3" style={{ color: "var(--text-secondary)" }}>
              <Spinner size={18} /> Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <AlertCircle size={28} style={{ color: "var(--text-muted)" }} />
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>No attendance records found.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-light)" }}>
                  {["#", "Date", "Check In", "Check Out", "Duration", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border-light)" }}
                    className="transition-colors"
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <td className="px-5 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                    <td className="px-5 py-3 text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                      {fmtDate(r.check_in_time)}
                    </td>
                    <td className="px-5 py-3 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {fmtDateTime(r.check_in_time)}
                    </td>
                    <td className="px-5 py-3 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {r.check_out_time ? fmtDateTime(r.check_out_time) : "—"}
                    </td>
                    <td className="px-5 py-3 text-[12px] font-mono font-semibold" style={{ color: "var(--accent-amber)" }}>
                      {r.status === "checked_in" ? <LiveDuration checkInTime={r.check_in_time} /> : fmtDuration(r.duration)}
                    </td>
                    <td className="px-5 py-3"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Filter wrapper
// ─────────────────────────────────────────────────────────
function FilterField({ icon: Icon, children }) {
  return (
    <div className="relative flex items-center">
      <Icon size={13} className="absolute left-2.5 z-10 pointer-events-none"
        style={{ color: "var(--text-muted)" }} />
      {children}
    </div>
  );
}

const filterInputCls = "pl-8 pr-3 py-2 rounded-lg text-[12.5px] border outline-none transition-all focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400";
const filterInputStyle = {
  background: "var(--bg-input)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};

// ─────────────────────────────────────────────────────────
//  Main Attendance Page
// ─────────────────────────────────────────────────────────
export default function Attendance() {
  const navigate = useNavigate();

  const [records, setRecords]     = useState([]);
  const [active, setActive]       = useState([]);
  const [stats, setStats]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [fSearch, setFSearch] = useState("");
  const [fCourse, setFCourse] = useState("");
  const [fDate,   setFDate]   = useState("");
  const [fStatus, setFStatus] = useState("all");

  const [idInput,     setIdInput]     = useState("");
  const [tapping,     setTapping]     = useState(false);
  const [tapResult,   setTapResult]   = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [lookingUp,   setLookingUp]   = useState(false);
  const debouncedId     = useDebounce(idInput,  400);
  const debouncedSearch = useDebounce(fSearch,  300);
  const inputRef = useRef(null);

  const [selectedRecord,        setSelectedRecord]        = useState(null);
  const [notFoundStudentId,     setNotFoundStudentId]     = useState(null);
  const [showRfidRegistration,  setShowRfidRegistration]  = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, actRes, stRes] = await Promise.all([
        getAllAttendance(), getActiveAttendance(), getAttendanceStats(),
      ]);
      if (recRes.success) setRecords(recRes.data || []);
      if (actRes.success) setActive(actRes.data || []);
      if (stRes.success)  setStats(stRes.data);
    } catch {
      showToast("Failed to fetch attendance data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!debouncedId?.trim()) { setStudentInfo(null); return; }
    let cancelled = false;
    setLookingUp(true);
    getStudentByStudentIdNumber(debouncedId.trim())
      .then((res) => { if (!cancelled) setStudentInfo(res.success ? res.data : null); })
      .catch(() => { if (!cancelled) setStudentInfo(null); })
      .finally(() => { if (!cancelled) setLookingUp(false); });
    return () => { cancelled = true; };
  }, [debouncedId]);

  const handleTap = useCallback(async (e) => {
    e?.preventDefault();
    const id = idInput.trim();
    if (!id) return;
    setTapping(true);
    try {
      const res = await tapAttendance(id);
      if (res.success) {
        setTapResult(res);
        setIdInput("");
        setStudentInfo(null);
        fetchData();
        setTimeout(() => inputRef.current?.focus(), 50);
      } else {
        if (res.error?.toLowerCase().includes("not found")) {
          setNotFoundStudentId(id);
          setIdInput("");
        } else {
          showToast(res.error || "Action failed", "error");
        }
      }
    } catch {
      showToast("Network error — please try again", "error");
    } finally {
      setTapping(false);
    }
  }, [idInput, fetchData, showToast]);

  const handleKeyDown = (e) => { if (e.key === "Enter") handleTap(e); };

  const handleRfidRegistered = useCallback((cardData, student) => {
    setShowRfidRegistration(false);
  }, []);

  const handleCheckOut = async (idNumber) => {
    try {
      const res = await checkOut(idNumber);
      if (res.success) { showToast("Student checked out successfully"); fetchData(); }
      else showToast(res.error || "Check-out failed", "error");
    } catch { showToast("Failed to check out student", "error"); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      const res = await deleteAttendance(id);
      if (res.success) { showToast("Record deleted"); fetchData(); }
      else showToast(res.error || "Failed to delete", "error");
    } catch { showToast("Failed to delete record", "error"); }
  };

  const courses = useMemo(
    () => [...new Set(records.map((r) => r.student_course).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return records.filter((r) => {
      if (q && !r.student_name.toLowerCase().includes(q) && !r.student_id_number.toLowerCase().includes(q)) return false;
      if (fCourse  && r.student_course !== fCourse)                                         return false;
      if (fDate    && new Date(r.check_in_time).toISOString().slice(0, 10) !== fDate)       return false;
      if (fStatus !== "all" && r.status !== fStatus)                                        return false;
      return true;
    });
  }, [records, debouncedSearch, fCourse, fDate, fStatus]);

  const hasFilters   = fSearch || fCourse || fDate || fStatus !== "all";
  const clearFilters = () => { setFSearch(""); setFCourse(""); setFDate(""); setFStatus("all"); };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page Header ──────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-[22px] font-bold"
            style={{ color: "var(--text-primary)" }}>
            <Users size={22} style={{ color: "var(--accent-amber)" }} />
            Attendance Management
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
            Track student check-in / check-out and library visit history
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">

          {/* Register RFID Button */}
          <button
            onClick={() => setShowRfidRegistration(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[.98]"
            style={{
              background: "rgba(45,122,71,0.1)",
              border: "1.5px solid rgba(45, 53, 122, 0.35)",
              color: "var(--tetx-primary)",
            }}
          >
            <CreditCard size={14} />
            Register RFID
          </button>

          {/* Kiosk View */}
          <button
            onClick={() => navigate("/dashboard/attendance/kiosk")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors"
            style={{
              background: "var(--bg-surface)",
              border: "1.5px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            <Monitor size={14} style={{ color: "var(--accent-amber)" }} />
            Kiosk View
          </button>

          {/* Download PDF */}
          <button
            onClick={() => downloadGeneralPDF(filtered)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
            style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Stats Cards ──────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Visits",      value: stats.total,                                       color: "#3b82f6", icon: BookOpen     },
            { label: "In Library Now",    value: stats.active,                                      color: "#22c55e", icon: Users        },
            { label: "Total Hours",       value: `${Math.round((stats.totalDuration || 0) / 60)}h`, color: "#EEA23A", icon: Timer        },
            { label: "Checked Out Today", value: stats.checkedOut,                                  color: "#a855f7", icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${color}1a` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-[20px] font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Check-In / Tap Form ──────────────────────── */}
      <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="flex items-center gap-2 text-[13px] font-semibold mb-3"
          style={{ color: "var(--text-primary)" }}>
          <LogIn size={14} style={{ color: "var(--accent-amber)" }} />
          Input Student ID to Check In / Out
        </p>
        <p className="text-[11.5px] mb-3" style={{ color: "var(--text-muted)" }}>
          Enter a student ID. First Enter checks in, second Enter checks out automatically.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-start">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }} />
              <input
                ref={inputRef}
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter or scan Student ID…"
                disabled={tapping}
                autoFocus
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 disabled:opacity-60"
                style={{
                  background: "var(--bg-input)", border: "1.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              {tapping && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2"><Spinner size={15} /></div>
              )}
            </div>

            {lookingUp && (
              <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                <Spinner size={13} /> Looking up student…
              </div>
            )}

            {studentInfo && !lookingUp && (
              <div className="flex items-center gap-3 mt-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(45,122,71,0.08)", border: "1px solid rgba(45,122,71,0.25)" }}>
                <Avatar name={getFullName(studentInfo)} size={28} />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#2d7a47" }}>
                    {getFullName(studentInfo)}
                  </p>
                  <div className="flex gap-1.5 flex-wrap mt-0.5">
                    {studentInfo.student_course && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(50,102,127,.12)", color: "#32667F" }}>
                        {studentInfo.student_course}
                      </span>
                    )}
                    {studentInfo.student_yr_level && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(124,58,237,.1)", color: "#7c3aed" }}>
                        {studentInfo.student_yr_level}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!studentInfo && !lookingUp && idInput.trim() !== "" && !tapping && (
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: "#dc2626" }}>
                Student not found in the system.
              </p>
            )}

            {tapResult && (
              <div className="mt-2">
                <TapResult result={tapResult} onDismiss={() => setTapResult(null)} />
              </div>
            )}
          </div>

          <button
            onClick={handleTap}
            disabled={!idInput.trim() || tapping}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--accent-amber)",
              boxShadow: idInput.trim() ? "0 2px 6px rgba(238,162,58,.3)" : "none",
            }}
          >
            <ArrowRight size={15} /> Check In
          </button>
        </div>
      </div>

      {/* ── Currently Active Students ────────────────── */}
      {active.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--border-light)" }}>
            <CheckCircle2 size={14} style={{ color: "#2d7a47" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Currently In Library
            </span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ background: "rgba(45,122,71,.12)", color: "#2d7a47" }}>
              {active.length}
            </span>
          </div>
          <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--border)" }}>
            <table className="min-w-full" style={{ borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {["Student", "ID", "Course", "Year", "School Year", "Check In", "Action"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ background: "var(--bg-surface)" }}>
                {active.map((s) => (
                  <tr key={s.id} className="transition-colors group"
                    style={{ borderBottom: "1px solid var(--border-light)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: "rgba(45,122,71,0.15)", border: "1px solid rgba(45,122,71,0.25)" }}>
                          <span className="text-xs font-bold" style={{ color: "#2d7a47" }}>{getInitials(s.student_name)}</span>
                        </div>
                        <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.student_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>{s.student_id_number}</td>
                    <td className="px-4 py-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{s.student_course || "—"}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{s.student_yr_level || "—"}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{s.school_year || "—"}</td>
                    <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{fmtDateTime(s.check_in_time)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleCheckOut(s.student_id_number)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        style={{ background: "rgba(45,122,71,0.12)", color: "#2d7a47", border: "1px solid rgba(45,122,71,0.25)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(45,122,71,0.22)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(45,122,71,0.12)"; }}
                      >
                        <ArrowLeft size={11} /> Check Out
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Attendance History ────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-2">
            <FileText size={14} style={{ color: "var(--accent-amber)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Attendance History
            </span>
            {hasFilters && (
              <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                — {filtered.length} of {records.length} records
              </span>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2.5 p-5"
          style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
          <FilterField icon={User}>
            <input
              type="text" placeholder="Search Name or ID…" value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              className={`${filterInputCls} pr-8`}
              style={{ ...filterInputStyle, minWidth: 220 }}
            />
          </FilterField>
          <FilterField icon={GraduationCap}>
            <select
              value={fCourse} onChange={(e) => setFCourse(e.target.value)}
              className={filterInputCls + " pr-7 appearance-none cursor-pointer"}
              style={{ ...filterInputStyle, minWidth: 150 }}
            >
              <option value="">All Courses</option>
              {courses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2.5 pointer-events-none"
              style={{ color: "var(--text-muted)" }} />
          </FilterField>
          <FilterField icon={Calendar}>
            <input
              type="date" value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className={filterInputCls + " cursor-pointer"}
              style={{ ...filterInputStyle, minWidth: 160 }}
            />
          </FilterField>
          <FilterField icon={Filter}>
            <select
              value={fStatus} onChange={(e) => setFStatus(e.target.value)}
              className={filterInputCls + " pr-7 appearance-none cursor-pointer"}
              style={{ ...filterInputStyle, minWidth: 140 }}
            >
              <option value="all">All Status</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 pointer-events-none"
              style={{ color: "var(--text-muted)" }} />
          </FilterField>
        </div>

        <AttendanceTable
          data={filtered}
          loading={isLoading}
          hasFilters={hasFilters}
          totalRecords={records.length}
          onRowClick={setSelectedRecord}
          onClearFilters={clearFilters}
          onDelete={handleDelete}
        />
      </div>

      {/* ── Modals ────────────────────────────────────── */}
      {selectedRecord && (
        <StudentModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {notFoundStudentId && (
        <StudentNotFoundModal
          studentId={notFoundStudentId}
          onClose={() => {
            setNotFoundStudentId(null);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        />
      )}

      {showRfidRegistration && (
        <RfidRegistrationModal
          onClose={() => setShowRfidRegistration(false)}
          onRegistered={handleRfidRegistered}
          onToast={showToast}
        />
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.show}
          onClose={() => setToast((p) => ({ ...p, show: false }))}
        />
      )}

      <style>{`
        @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn   { from { opacity: 0; transform: scale(.94) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}