import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import AttendanceTable from "../components/AttendanceTable";
import {
  Search, Clock, ArrowRight, ArrowLeft, Trash2, Users,
  AlertCircle, X, Download, Calendar, Filter, ChevronDown,
  User, Hash, GraduationCap, CheckCircle2, XCircle,
  FileText, Timer, BookOpen, LogIn,
} from "lucide-react";
import {
  getAllAttendance,
  getActiveAttendance,
  getAttendanceStats,
  getAttendanceByStudentId,
  checkIn,
  checkOut,
  deleteAttendance,
} from "../services/api/attendanceApi";
import { getStudentByStudentIdNumber } from "../services/api/studentsApi";
import StatsCard from "../components/StatsCard";
import Toast from "../components/Toast";
import useDebounce from "../hooks/useDebounce";

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
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
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// ─────────────────────────────────────────────────────────
//  Sub-components
// ─────────────────────────────────────────────────────────

/** Colored initials avatar */
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

/** Checked-in / Checked-out pill */
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

/** Live ticking timer */
function LiveDuration({ checkInTime }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)
  );
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - new Date(checkInTime).getTime()) / 1000)),
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

/** Reusable spinner */
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

// ─────────────────────────────────────────────────────────
//  PDF Generator — opens browser print dialog
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
    columns: ["#", "Student Name", "ID Number", "Course", "Year Level", "Check In", "Check Out", "Duration", "Status"],
    rows: records.map((r, i) => [
      i + 1, r.student_name, r.student_id_number,
      r.student_course || "—", r.student_yr_level || "—",
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
    subtitle: `ID: ${person.student_id_number} · ${[person.student_course, person.student_yr_level].filter(Boolean).join(" ")} · Visits: ${history.length}`,
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

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Fetch this student's full visit history
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
          maxWidth: 680, maxHeight: "90vh",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
          animation: "modalIn .22s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <Avatar name={record.student_name} size={44} />
            <div>
              <h2 className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                {record.student_name}
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {[record.student_id_number, record.student_course, record.student_yr_level]
                  .filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Individual PDF */}
            <button
              onClick={() => downloadIndividualPDF(record, history)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--accent-amber)", boxShadow: "0 2px 6px rgba(238,162,58,.3)" }}
            >
              <Download size={13} /> Download PDF
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Summary strip ───────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3 px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}>
          {[
            { icon: BookOpen, label: "Total Visits",  value: history.length, color: "#32667F" },
            { icon: Timer,    label: "Total Hours",   value: `${totalHours}h`, color: "#EEA23A" },
            { icon: null,     label: "Current Status", value: null, status: record.status },
          ].map(({ icon: Icon, label, value, color, status }, i) => (
            <div key={i} className="flex flex-col gap-1 px-4 py-3 rounded-xl"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <span className="text-[10.5px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-muted)" }}>
                {label}
              </span>
              {value !== null
                ? <span className="text-[22px] font-bold leading-none" style={{ color }}>{value}</span>
                : <StatusPill status={status} />
              }
            </div>
          ))}
        </div>

        {/* ── History table ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          <p className="text-[10.5px] font-bold uppercase tracking-wider mt-4 mb-3"
            style={{ color: "var(--text-muted)" }}>
            Visit History
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-12"
              style={{ color: "var(--text-secondary)" }}>
              <Spinner /> <span className="text-[13px]">Loading history…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2"
              style={{ color: "var(--text-muted)" }}>
              <AlertCircle size={32} className="opacity-30" />
              <span className="text-[13px]">No visit history found.</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Check In</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Check Out</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {history.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors even:bg-slate-50/50">
                      <td className="px-4 py-3 text-sm text-slate-600 font-medium">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmtDate(r.check_in_time)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{fmtDateTime(r.check_in_time)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.check_out_time ? fmtDateTime(r.check_out_time) : "—"}</td>
                      <td className="px-4 py-3">
                        {r.status === "checked_in" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <Clock size={12} className="animate-pulse" /> Live
                          </span>
                        ) : (
                          <span className="text-sm font-mono text-slate-900">{fmtDuration(r.duration)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────
export default function Attendance() {
  // ── Data state ────────────────────────────────────────
  const [records, setRecords]       = useState([]);
  const [active, setActive]         = useState([]);
  const [stats, setStats]           = useState(null);
  const [isLoading, setIsLoading]   = useState(true);

  // ── Smart filter state ────────────────────────────────
  const [fSearch, setFSearch] = useState("");
  const [fCourse, setFCourse] = useState("");
  const [fDate,   setFDate]   = useState("");
  const [fStatus, setFStatus] = useState("all");

  // ── Check-in form ─────────────────────────────────────
  const [idInput,     setIdInput]     = useState("");
  const [studentInfo, setStudentInfo] = useState(null);
  const [lookingUp,   setLookingUp]   = useState(false);
  const debouncedId = useDebounce(idInput, 500);

  // ── Modal ─────────────────────────────────────────────
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ── Toast ─────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);

  // ── Fetch all data ────────────────────────────────────
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

  // ── Student lookup ────────────────────────────────────
  useEffect(() => {
    if (!debouncedId?.trim()) { setStudentInfo(null); return; }
    let cancelled = false;
    setLookingUp(true);
    getStudentByStudentIdNumber(debouncedId)
      .then((res) => { if (!cancelled) setStudentInfo(res.success ? res.data : null); })
      .catch(() => { if (!cancelled) setStudentInfo(null); })
      .finally(() => { if (!cancelled) setLookingUp(false); });
    return () => { cancelled = true; };
  }, [debouncedId]);

  // ── Check-in ──────────────────────────────────────────
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!idInput.trim()) { showToast("Please enter a student ID", "error"); return; }
    if (!studentInfo)    { showToast("Student does not exist", "error"); return; }
    try {
      const res = await checkIn({ student_id_number: idInput });
      if (res.success) {
        showToast("Student checked in successfully");
        setIdInput(""); setStudentInfo(null); fetchData();
      } else showToast(res.error || "Check-in failed", "error");
    } catch { showToast("Failed to check in student", "error"); }
  };

  // ── Check-out ─────────────────────────────────────────
  const handleCheckOut = async (idNumber) => {
    try {
      const res = await checkOut(idNumber);
      if (res.success) { showToast("Student checked out successfully"); fetchData(); }
      else showToast(res.error || "Check-out failed", "error");
    } catch { showToast("Failed to check out student", "error"); }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      const res = await deleteAttendance(id);
      if (res.success) { showToast("Record deleted"); fetchData(); }
      else showToast(res.error || "Failed to delete", "error");
    } catch { showToast("Failed to delete record", "error"); }
  };

  // ── Derived values ────────────────────────────────────
  const courses = useMemo(
    () => [...new Set(records.map((r) => r.student_course).filter(Boolean))].sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const searchQ = fSearch.toLowerCase().trim();
    return records.filter((r) => {
      if (searchQ && !r.student_name.toLowerCase().includes(searchQ) && !r.student_id_number.toLowerCase().includes(searchQ)) return false;
      if (fCourse  && r.student_course !== fCourse) return false;
      if (fDate    && new Date(r.check_in_time).toISOString().slice(0, 10) !== fDate) return false;
      if (fStatus !== "all" && r.status !== fStatus) return false;
      return true;
    });
  }, [records, fSearch, fCourse, fDate, fStatus]);

  const hasFilters = fSearch || fCourse || fDate || fStatus !== "all";
  const clearFilters = () => { setFSearch(""); setFCourse(""); setFDate(""); setFStatus("all"); };

  // ── Shared field wrapper ──────────────────────────────
  const FilterField = ({ icon: Icon, children }) => (
    <div className="relative flex items-center">
      {Icon && (
        <Icon size={13} className="absolute left-2.5 pointer-events-none z-10"
          style={{ color: "var(--text-muted)" }} />
      )}
      {children}
    </div>
  );

  const filterInputCls =
    "w-full pl-8 pr-3 py-2 rounded-lg text-[12.5px] outline-none transition-all " +
    "focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400";
  const filterInputStyle = {
    background: "var(--bg-surface)", border: "1.5px solid var(--border)",
    color: "var(--text-primary)",
  };

  // ─────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">

      {/* ── Page Header ──────────────────────────────────── */}
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

        {/* General PDF download */}
        <button
          onClick={() => downloadGeneralPDF(filtered)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors"
          style={{ background: "var(--accent-amber)", boxShadow: "0 2px 8px rgba(238,162,58,.3)" }}
        >
          <Download size={14} /> Download PDF
        </button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Visits",      value: stats.total,                                        color: "#3b82f6", icon: BookOpen    },
            { label: "In Library Now",    value: stats.active,                                       color: "#22c55e", icon: Users       },
            { label: "Total Hours",       value: `${Math.round((stats.totalDuration || 0) / 60)}h`,  color: "#EEA23A", icon: Timer       },
            { label: "Checked Out Today", value: stats.checkedOut,                                   color: "#a855f7", icon: CheckCircle2 },
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

      {/* ── Check-In Form ─────────────────────────────────── */}
      <div className="rounded-xl px-5 py-4" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <p className="flex items-center gap-2 text-[13px] font-semibold mb-3"
          style={{ color: "var(--text-primary)" }}>
          <LogIn size={14} style={{ color: "var(--accent-amber)" }} />
          Check In Student
        </p>

        <form onSubmit={handleCheckIn} className="flex flex-col sm:flex-row gap-3 items-start">
          {/* ID input + preview */}
          <div className="flex-1 w-full">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="Enter student ID number…"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                style={{
                  background: "var(--bg-input)", border: "1.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Feedback rows */}
            {lookingUp && (
              <div className="flex items-center gap-2 mt-2 text-[12px]"
                style={{ color: "var(--text-secondary)" }}>
                <Spinner size={13} /> Looking up student…
              </div>
            )}

            {studentInfo && !lookingUp && (
              <div className="flex items-center gap-3 mt-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(45,122,71,0.08)", border: "1px solid rgba(45,122,71,0.25)" }}>
                <Avatar name={studentInfo.display_name || studentInfo.student_name} size={28} />
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: "#2d7a47" }}>
                    {studentInfo.display_name || studentInfo.student_name}
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
                        {studentInfo.student_yr_level.toLowerCase().includes("year")
                          ? studentInfo.student_yr_level
                          : `Year ${studentInfo.student_yr_level}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!studentInfo && !lookingUp && idInput.trim() !== "" && (
              <p className="mt-1.5 text-[12px] font-medium" style={{ color: "#dc2626" }}>
                Student not found in the system.
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!studentInfo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "var(--accent-amber)",
              boxShadow: studentInfo ? "0 2px 6px rgba(238,162,58,.3)" : "none",
            }}
          >
            <ArrowRight size={15} /> Check In
          </button>
        </form>
      </div>

      {/* ── Currently Active Students ──────────────────────── */}
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

          <div className="overflow-x-auto rounded-lg border-t border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-emerald-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Check In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {active.map((s) => (
                  <tr
                    key={s.id}
                    className="cursor-pointer hover:bg-emerald-50/50 transition-colors group"
                    onClick={() => setSelectedRecord(s)}
                    title="Click to view full attendance history"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-500/20 flex items-center justify-center border border-emerald-200/50">
                          <span className="text-xs font-bold text-emerald-700">{getInitials(s.student_name)}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-slate-900 group-hover:text-slate-700">{s.student_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-mono">{s.student_id_number}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 font-medium">{s.student_course || "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{s.student_yr_level || "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{fmtDateTime(s.check_in_time)}</td>
                    <td className="px-4 py-4">
                      <LiveDuration checkInTime={s.check_in_time} />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCheckOut(s.student_id_number); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors shadow-sm"
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

{/* ── Attendance History ─────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-slate-200/60 shadow-sm" style={{ background: "var(--bg-surface)" }}>
        {/* Card header - unchanged */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200"
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

        {/* ── Smart Filters Row - unchanged */}
        <div className="flex flex-wrap gap-2.5 p-5 bg-gradient-to-r from-slate-50/70 to-slate-50/30 backdrop-blur-sm"
          style={{ borderBottom: "1px solid var(--border-light)" }}>

          {/* Unified Search */}
          <FilterField icon={User}>
            <input
              type="text" placeholder="Search Name or ID Number..." value={fSearch}
              onChange={(e) => setFSearch(e.target.value)}
              className={`${filterInputCls} pr-8`}
              style={{ ...filterInputStyle, minWidth: 220 }}
            />
            <Hash size={12} className="absolute right-9 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </FilterField>

          {/* Course */}
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

          {/* Date */}
          <FilterField icon={Calendar}>
            <input
              type="date" value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className={filterInputCls + " cursor-pointer"}
              style={{ ...filterInputStyle, minWidth: 160 }}
            />
          </FilterField>

          {/* Status */}
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

        {/* Enhanced Table Component */}
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

      {/* ── Student History Modal ─────────────────────────── */}
      {selectedRecord && (
        <StudentModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}

      {/* ── Toast ────────────────────────────────────────── */}
      {toast.show && (
        <Toast
          message={toast.message} type={toast.type}
          onClose={() => setToast((p) => ({ ...p, show: false }))}
        />
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes overlayIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modalIn   { from { opacity: 0; transform: scale(.94) translateY(10px) } to { opacity: 1; transform: scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}