/**
 * client/src/pages/AttendanceDashboard.jsx
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  getAttendanceDashboardStats, getTopStudents, getAllTopStudents,
  getProgramUsage, getVisitsOverTime, getPeakHours, getVisitsByDay,
  getLowUsageStudents, getAllLowUsageStudents, getSessionDistribution, getOtherInsights,
  getActiveAttendance, getSchoolYears,
} from "../services/api/attendanceApi";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Clock, Timer, TrendingUp, GraduationCap, UserCheck,
  ChevronDown, Info, CalendarDays,
  Trophy, Star, ArrowUpRight, Download, RefreshCw, X, FileDown,
} from "lucide-react";
// Bug J fix: lowercase 's' matches the actual filename useWebsocket.js on disk.
// On Linux (case-sensitive) the wrong case causes a silent module-not-found error.
import { useWebSocket } from "../hooks/useWebsocket";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:   "#132F45", teal:   "#32667F", amber:  "#EEA23A", gold:   "#F3B940",
  orange: "#EA8B33", green:  "#22c55e", mint:   "#2dd4bf", indigo: "#6366f1",
  purple: "#a855f7", rose:   "#f43f5e",
};

// Maximum library seating capacity — adjust as needed
const LIBRARY_CAPACITY = 120;

// Auto-detect current school year based on date (PH academic calendar: Jun–May)
function getCurrentSchoolYear() {
  const now  = new Date();
  const year = now.getFullYear();
  // School year starts in June: Jun-Dec belong to SY that starts this year
  return now.getMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}
const CURRENT_SY = getCurrentSchoolYear();

// ── Shared tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)" }}>
      {label && <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, fontSize: 11 }}>{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          <span style={{ color: p.fill || p.stroke, marginRight: 6 }}>●</span>
          {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "13px 15px", display: "flex", alignItems: "center", gap: 11, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
      <div style={{ width: 38, height: 38, borderRadius: 9, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 1px", fontSize: 10, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
        <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function SCard({ title, action, children, info }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          {info && <Info size={12} style={{ color: "var(--text-muted)", cursor: "default" }} />}
        </div>
        {action}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "6px 13px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none", cursor: "pointer", transition: "all .15s", background: active ? C.teal : "var(--bg-subtle)", color: active ? "#fff" : "var(--text-secondary)" }}>
      {label}
    </button>
  );
}

function DropBtn({ label }) {
  return (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer", background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
      {label} <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
    </button>
  );
}

const PROG_COLORS = {
  BSIT: { bg: "rgba(99,102,241,.12)",  color: "#6366f1" },
  BSN:  { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  BSCS: { bg: "rgba(238,162,58,.15)",  color: "#b87a1a" },
  BSA:  { bg: "rgba(50,102,127,.12)",  color: "#32667F" },
  BSBA: { bg: "rgba(168,85,247,.12)",  color: "#a855f7" },
  BEED: { bg: "rgba(244,63,94,.12)",   color: "#f43f5e" },
  BA:   { bg: "rgba(45,212,191,.12)",  color: "#0d9488" },
};
function ProgramBadge({ prog }) {
  const c = PROG_COLORS[prog] || { bg: "rgba(156,163,175,.15)", color: "#6b7280" };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>{prog}</span>;
}

function RankBadge({ rank }) {
  const medals = { 1: C.amber, 2: "#9ca3af", 3: C.orange };
  const color = medals[rank];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 800, background: color || "var(--bg-subtle)", color: color ? "#fff" : "var(--text-muted)" }}>
      {rank <= 3 ? <Trophy size={12} /> : rank}
    </span>
  );
}

// ── TopStudentsModal — unchanged ───────────────────────────────────────────────
function TopStudentsModal({ onClose }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterProgram,  setFilterProgram]  = useState("All");
  const [filterYrLevel,  setFilterYrLevel]  = useState("All");
  const [filterSemester, setFilterSemester] = useState("All");
  const [sortBy, setSortBy] = useState("Total Hours");

  useEffect(() => {
    getAllTopStudents().then(res => {
      if (res.success) setAllStudents(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const headers = [["Rank", "Student Name", "Program", "Year Level", "Semester", "Visits", "Total Hours", "Avg Time"]];
    const data = ranked.map(s => [s.rank, s.name, s.program, s.yrLevel, s.semester, s.visits, s.hours, s.avg]);

    doc.setFontSize(16);
    doc.text("Top Students by Total Hours", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [19, 47, 69] },
      columnStyles: { 0: { cellWidth: 15 }, 1: { cellWidth: 45 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 30 }, 5: { cellWidth: 20 }, 6: { cellWidth: 25 }, 7: { cellWidth: 25 } },
    });

    doc.save(`top-students-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const programs  = ["All", ...Array.from(new Set(allStudents.map(s => s.program).filter(p => p !== "—"))).sort()];
  const yrLevels  = ["All", ...Array.from(new Set(allStudents.map(s => s.yrLevel).filter(y => y !== "—"))).sort()];
  const semesters = ["All", ...Array.from(new Set(allStudents.map(s => s.semester).filter(x => x !== "—"))).sort()];

  const filtered = allStudents.filter(s => {
    if (filterProgram  !== "All" && s.program  !== filterProgram)  return false;
    if (filterYrLevel  !== "All" && s.yrLevel  !== filterYrLevel)  return false;
    if (filterSemester !== "All" && s.semester !== filterSemester) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Visits")   return b.visits - a.visits;
    if (sortBy === "Avg Time") return (parseInt(b.avg) || 0) - (parseInt(a.avg) || 0);
    return b.totalMinutes - a.totalMinutes;
  });
  const ranked = sorted.map((s, i) => ({ ...s, rank: i + 1 }));

  const selStyle = { fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" };

  return (
    <div onClick={handleBackdrop} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: 900, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Top Students by Total Hours</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{ranked.length} student{ranked.length !== 1 ? "s" : ""} matching filters</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={downloadPDF} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: C.teal, border: "none", color: "#fff" }}>
              <Download size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap" }}>
          {[
            { label: "Program",  value: filterProgram,  onChange: setFilterProgram,  options: programs },
            { label: "Year",     value: filterYrLevel,  onChange: setFilterYrLevel,  options: yrLevels },
            { label: "School Year", value: filterSemester, onChange: setFilterSemester, options: semesters },
            { label: "Sort By",  value: sortBy,         onChange: setSortBy,         options: ["Total Hours", "Visits", "Avg Time"] },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={selStyle}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(filterProgram !== "All" || filterYrLevel !== "All" || filterSemester !== "All" || sortBy !== "Total Hours") && (
            <button onClick={() => { setFilterProgram("All"); setFilterYrLevel("All"); setFilterSemester("All"); setSortBy("Total Hours"); }}
              style={{ alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
              Reset
            </button>
          )}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          ) : ranked.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No students match the selected filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["Rank", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Avg Time / Visit"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", padding: "10px 10px 10px 0", paddingLeft: h === "Rank" ? 20 : 0, borderBottom: "1px solid var(--border-light)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranked.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "9px 10px 9px 20px" }}><RankBadge rank={s.rank} /></td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                    <td style={{ padding: "9px 10px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.yrLevel}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.semester}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontWeight: 600 }}>{s.visits}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.hours}</td>
                    <td style={{ padding: "9px 0", color: "var(--text-secondary)" }}>{s.avg}</td>
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

// ── LowUsageModal — unchanged ──────────────────────────────────────────────────
function LowUsageModal({ onClose }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterProgram,  setFilterProgram]  = useState("All");
  const [filterYrLevel,  setFilterYrLevel]  = useState("All");
  const [filterSemester, setFilterSemester] = useState("All");

  useEffect(() => {
    getAllLowUsageStudents().then(res => {
      if (res.success) setAllStudents(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBackdrop = e => { if (e.target === e.currentTarget) onClose(); };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const headers = [["#", "Student Name", "Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"]];
    const data = filtered.map((s, i) => [i + 1, s.name, s.program, s.yrLevel, s.semester, s.visits, s.hours, s.last]);

    doc.setFontSize(16);
    doc.text("Low / No Usage Students", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 35,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [19, 47, 69] },
      columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 40 }, 2: { cellWidth: 30 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 20 }, 6: { cellWidth: 25 }, 7: { cellWidth: 25 } },
    });

    doc.save(`low-usage-students-${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const programs  = ["All", ...Array.from(new Set(allStudents.map(s => s.program).filter(p => p !== "—"))).sort()];
  const yrLevels  = ["All", ...Array.from(new Set(allStudents.map(s => s.yrLevel).filter(y => y !== "—"))).sort()];
  const semesters = ["All", ...Array.from(new Set(allStudents.map(s => s.semester).filter(x => x !== "—"))).sort()];

  const filtered = allStudents.filter(s => {
    if (filterProgram  !== "All" && s.program  !== filterProgram)  return false;
    if (filterYrLevel  !== "All" && s.yrLevel  !== filterYrLevel)  return false;
    if (filterSemester !== "All" && s.semester !== filterSemester) return false;
    return true;
  });

  const selStyle = { fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer", background: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" };

  return (
    <div onClick={handleBackdrop} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: 14, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", width: "100%", maxWidth: 820, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>Low / No Usage Students</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{filtered.length} student{filtered.length !== 1 ? "s" : ""} matching filters</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={downloadPDF} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "5px 10px", borderRadius: 8, cursor: "pointer", background: C.rose, border: "none", color: "#fff" }}>
              <Download size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap" }}>
          {[
            { label: "Program",  value: filterProgram,  onChange: setFilterProgram,  options: programs },
            { label: "Year",     value: filterYrLevel,  onChange: setFilterYrLevel,  options: yrLevels },
            { label: "Semester", value: filterSemester, onChange: setFilterSemester, options: semesters },
          ].map(({ label, value, onChange, options }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>{label}</span>
              <select value={value} onChange={e => onChange(e.target.value)} style={selStyle}>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {(filterProgram !== "All" || filterYrLevel !== "All" || filterSemester !== "All") && (
            <button onClick={() => { setFilterProgram("All"); setFilterYrLevel("All"); setFilterSemester("All"); }}
              style={{ alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
              Reset
            </button>
          )}
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No students match the selected filters.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["#", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", padding: "10px 10px 10px 0", paddingLeft: h === "#" ? 20 : 0, borderBottom: "1px solid var(--border-light)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: "9px 10px 9px 20px", color: "var(--text-muted)", fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: "9px 10px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                    <td style={{ padding: "9px 10px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.yrLevel}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)", fontSize: 12 }}>{s.semester}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: s.visits === 0 ? C.rose : "var(--text-secondary)", fontWeight: 700 }}>{s.visits}</td>
                    <td style={{ padding: "9px 10px 9px 0", color: "var(--text-secondary)" }}>{s.hours}</td>
                    <td style={{ padding: "9px 0", color: "var(--text-muted)", fontSize: 11 }}>{s.last}</td>
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const [programTab, setProgramTab]             = useState("By Visits");
  const [visitsFilter, setVisitsFilter]         = useState("Daily");
  const [showLowUsageModal, setShowLowUsageModal]       = useState(false);
  const [showTopStudentsModal, setShowTopStudentsModal] = useState(false);

   const [globalFilter, setGlobalFilter] = useState({
     program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "",
   });

  const [kpi, setKpi]                       = useState(null);
  const [topStudents, setTopStudents]       = useState([]);
  const [programData, setProgramData]       = useState([]);
  const [visitsOverTime, setVisitsOverTime] = useState([]);
  const [peakHours, setPeakHours]           = useState([]);
  const [visitsByDay, setVisitsByDay]       = useState([]);
   const [lowUsage, setLowUsage]             = useState([]);
   const [sessionDist, setSessionDist]       = useState([]);
   const [sessionTotal, setSessionTotal]     = useState(0);
   const [otherInsights, setOtherInsights]   = useState(null);
   const [activeAttendance, setActiveAttendance] = useState([]);
   const [availableYears, setAvailableYears] = useState([]);

  // ── FIX G: fetchAllData no longer closes over `gf` at definition time.
  // Every call site must pass the current filter value explicitly.
  // useCallback with [] keeps the function identity stable (needed for WS).
  const fetchAllData = useCallback(async (filters) => {
    await Promise.all([
      getAttendanceDashboardStats(filters).then(res => {
        if (res.success) setKpi(res.data ?? null);
      }).catch(() => setKpi(null)),

      getTopStudents(filters).then(res => {
        if (res.success) setTopStudents(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setTopStudents([])),

      getProgramUsage(filters).then(res => {
        if (res.success) setProgramData(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setProgramData([])),

      getPeakHours(filters).then(res => {
        if (res.success) setPeakHours(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setPeakHours([])),

      getVisitsByDay(filters).then(res => {
        if (res.success) setVisitsByDay(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setVisitsByDay([])),

      getLowUsageStudents(filters).then(res => {
        if (res.success) setLowUsage(Array.isArray(res.data) ? res.data : []);
      }).catch(() => setLowUsage([])),

      getSessionDistribution(filters).then(res => {
        if (res.success) {
          setSessionDist(Array.isArray(res.data) ? res.data : []);
          const total = res.totalVisits ??
                        (res.data && typeof res.data === 'object' && 'totalVisits' in res.data
                          ? res.data.totalVisits
                          : 0);
          setSessionTotal(total);
        }
      }).catch(() => { setSessionDist([]); setSessionTotal(0); }),

      getOtherInsights(filters).then(res => {
        if (res.success) setOtherInsights(res.data ?? null);
      }).catch(() => setOtherInsights(null)),

      getActiveAttendance().then(res => {
        if (res.success && Array.isArray(res.data)) {
          setActiveAttendance(res.data);
        } else {
          setActiveAttendance([]);
        }
      }).catch(() => setActiveAttendance([])),

      getSchoolYears().then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAvailableYears(res.data);
        } else {
          setAvailableYears([]);
        }
      }).catch(() => setAvailableYears([])),
    ]);
  }, []);

  // ── FIX H: ref-based stable wrapper so the WS handler always calls with
  // the current globalFilter and visitsFilter, not their values at mount.
  const latestRefetchRef = useRef(null);
  latestRefetchRef.current = useCallback(async () => {
    setKpi(null);
    await fetchAllData(globalFilter);
    getVisitsOverTime(visitsFilter, globalFilter).then(res => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) setVisitsOverTime(res.data);
    });
  }, [fetchAllData, globalFilter, visitsFilter]);

  // Stable WS callback — identity never changes, so useWebSocket never reconnects
  const stableRefetch = useCallback(() => {
    latestRefetchRef.current?.();
  }, []);

  // Bug J fix: import already corrected above (useWebsocket lowercase s)
  useWebSocket({
    isAdmin: false,
    onAttendanceUpdate: (payload) => {
      console.log("[WS] Attendance update:", payload?.action, payload?.data);
      stableRefetch();
    },
  });

   // ── Initial load
   useEffect(() => {
     fetchAllData(globalFilter);
     getVisitsOverTime(visitsFilter, globalFilter).then(res => {
       if (res.success && Array.isArray(res.data)) {
         setVisitsOverTime(res.data.length > 0 ? res.data : []);
       } else {
         setVisitsOverTime([]);
       }
     }).catch(() => setVisitsOverTime([]));
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Re-fetch when global filters change
   useEffect(() => {
     setKpi(null);
     fetchAllData(globalFilter);
     getVisitsOverTime(visitsFilter, globalFilter).then(res => {
       if (res.success && Array.isArray(res.data)) {
         setVisitsOverTime(res.data.length > 0 ? res.data : []);
       } else {
         setVisitsOverTime([]);
       }
     }).catch(() => setVisitsOverTime([]));
     // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [globalFilter]);

    // Re-fetch visits over time when groupBy changes
    useEffect(() => {
      getVisitsOverTime(visitsFilter, globalFilter).then(res => {
        if (res.success && Array.isArray(res.data)) {
          setVisitsOverTime(res.data.length > 0 ? res.data : []);
        } else {
          setVisitsOverTime([]);
        }
      }).catch(() => setVisitsOverTime([]));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visitsFilter]);

    // If selected school year has no data, fall back to "All"
    // On mount: auto-detect current school year and select it if data exists
    useEffect(() => {
      if (availableYears.length === 0) return;

      const needsReset = !availableYears.includes(globalFilter.schoolYear);

      if (globalFilter.schoolYear === "All" && availableYears.includes(CURRENT_SY)) {
        // Auto-select current school year on first load
        setGlobalFilter(f => ({ ...f, schoolYear: CURRENT_SY }));
      } else if (needsReset) {
        // Previously selected year is no longer available → fallback
        setGlobalFilter(f => ({ ...f, schoolYear: "All" }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availableYears]);

  // ── FIX I: guard all kpi field reads against both camelCase and snake_case.
  // MySQL returns snake_case by default; if the service doesn't alias them,
  // kpi.totalVisits is undefined and .toLocaleString() throws.
  const totalVisits = kpi
    ? (kpi.totalVisits ?? kpi.total_visits ?? 0).toLocaleString()
    : "—";

  const totalHours = kpi
    ? (() => {
        const mins = kpi.totalMinutes ?? kpi.total_minutes ?? 0;
        const decimalHours = (mins / 60).toFixed(1);
        return `${decimalHours} hrs`;
      })()
    : "—";

  const avgDuration = kpi
    ? (() => {
        const mins = kpi.avgDurationMinutes ?? kpi.avg_duration_minutes ?? 0;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : "—";

  const peakHourLabel = kpi ? (kpi.peakHourLabel ?? kpi.peak_hour_label ?? "—") : "—";
  const peakHourSub   = kpi ? `${kpi.peakHourCount ?? kpi.peak_hour_count ?? 0} check-ins` : "No data yet";

   const mostActiveProgram = kpi ? (kpi.mostActiveProgram ?? kpi.most_active_program ?? "—") : "—";
   const mostActiveSub     = kpi
     ? `${(kpi.mostActiveProgramVisits ?? kpi.most_active_program_visits ?? 0).toLocaleString()} visits`
     : "—";

   // Current Occupancy: count actively checked-in students that match current filters
   const filteredActiveCount = useMemo(() => {
     return activeAttendance.filter(rec => {
       // Program filter
       if (globalFilter.program !== "All" && rec.student_course !== globalFilter.program) return false;
       // Year level filter
       if (globalFilter.yrLevel !== "All" && rec.student_yr_level !== globalFilter.yrLevel) return false;
       // School year filter
       if (globalFilter.schoolYear !== "All" && rec.school_year !== globalFilter.schoolYear) return false;
       // Date range filter — check_in_time must fall within range
       if (globalFilter.dateFrom || globalFilter.dateTo) {
         const checkInDate = new Date(rec.check_in_time).toISOString().split('T')[0];
         if (globalFilter.dateFrom && checkInDate < globalFilter.dateFrom) return false;
         if (globalFilter.dateTo && checkInDate > globalFilter.dateTo) return false;
       }
       return true;
     }).length;
   }, [activeAttendance, globalFilter]);

   const occupancyPct = LIBRARY_CAPACITY > 0 ? Math.round((filteredActiveCount / LIBRARY_CAPACITY) * 100) : 0;
   const occupancyValue = LIBRARY_CAPACITY > 0 ? `${filteredActiveCount}/${LIBRARY_CAPACITY}` : `${filteredActiveCount}`;
   const occupancySub   = LIBRARY_CAPACITY > 0 ? `${occupancyPct}% capacity` : undefined;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showLowUsageModal    && <LowUsageModal    onClose={() => setShowLowUsageModal(false)} />}
      {showTopStudentsModal && <TopStudentsModal  onClose={() => setShowTopStudentsModal(false)} />}

      {/* ── Page Header + Inline Filters ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={17} color={C.amber} /> Library Attendance Dashboard
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
            Monitor student library usage, visits, and engagement
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Date Range</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="date" value={globalFilter.dateFrom}
                onChange={e => setGlobalFilter(f => ({ ...f, dateFrom: e.target.value }))}
                style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>
              <input type="date" value={globalFilter.dateTo}
                onChange={e => setGlobalFilter(f => ({ ...f, dateTo: e.target.value }))}
                style={{ fontSize: 11, padding: "3px 7px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Course / Program</span>
            <select value={globalFilter.program} onChange={e => setGlobalFilter(f => ({ ...f, program: e.target.value }))}
              style={{ fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
              {["All", ...Array.from(new Set(programData.map(p => p.program).filter(p => p !== "Others"))).sort(), "Others"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Year Level</span>
            <select value={globalFilter.yrLevel} onChange={e => setGlobalFilter(f => ({ ...f, yrLevel: e.target.value }))}
              style={{ fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
              {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>School Year</span>
            <select value={globalFilter.schoolYear} onChange={e => setGlobalFilter(f => ({ ...f, schoolYear: e.target.value }))}
              style={{ fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}>
              {["All", ...availableYears].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {(globalFilter.program !== "All" || globalFilter.yrLevel !== "All" || globalFilter.schoolYear !== "All" || globalFilter.dateFrom || globalFilter.dateTo) && (
            <button onClick={() => setGlobalFilter({ program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "" })}
              style={{ alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)", background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
              <X size={11} /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Row ── */}
       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
         <KpiCard icon={Users}       iconBg="rgba(50,102,127,.13)"  iconColor={C.teal}   label="Total Visits"        value={totalVisits} />
         <KpiCard icon={Clock}       iconBg="rgba(99,102,241,.13)"  iconColor={C.indigo} label="Total Hours Logged"   value={totalHours} />
         <KpiCard icon={Timer}       iconBg="rgba(238,162,58,.13)"  iconColor={C.amber}  label="Avg Session Duration" value={avgDuration} />
         <KpiCard icon={TrendingUp}  iconBg="rgba(34,197,94,.13)"   iconColor={C.green}  label="Peak Hour"            value={peakHourLabel}       sub={peakHourSub} />
         <KpiCard icon={GraduationCap} iconBg="rgba(168,85,247,.13)" iconColor={C.purple} label="Most Active Program" value={mostActiveProgram}   sub={mostActiveSub} />
         <KpiCard icon={UserCheck}   iconBg="rgba(45,212,191,.13)"  iconColor={C.mint}   label="Current Occupancy"   value={occupancyValue}       sub={occupancySub} />
       </div>

      {/* ── Row 2: Top Students table + Program Usage chart ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 14 }}>
        <SCard title="Top Students by Library Usage" info action={
          <button onClick={() => setShowTopStudentsModal(true)} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer", background: "var(--bg-surface)", border: "1px solid var(--border)", color: C.teal }}>
            View All <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
          </button>
        }>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {["Rank", "Student Name", "Program", "Year Level", "Visits", "Total Hours", "Avg Time"].map(h => (
                    <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", paddingBottom: 8, borderBottom: "1px solid var(--border-light)", paddingRight: 8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topStudents.slice(0, 5).map((s, i) => (
                  <tr key={i} style={{ borderBottom: i < Math.min(topStudents.length, 5) - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <td style={{ padding: "9px 8px 9px 0" }}><RankBadge rank={i + 1} /></td>
                    <td style={{ padding: "9px 8px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                    <td style={{ padding: "9px 8px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                    <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)", fontSize: 11 }}>{s.yrLevel ?? s.yr_level ?? s.yearLevel ?? "—"}</td>
                    <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)", fontWeight: 600 }}>{s.visits}</td>
                    <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.hours}</td>
                    <td style={{ padding: "9px 0", color: "var(--text-secondary)" }}>{s.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SCard>

        <SCard title="Library Usage by Program" action={
          <div style={{ display: "flex", gap: 3 }}>
            <TabBtn label="By Visits" active={programTab === "By Visits"} onClick={() => setProgramTab("By Visits")} />
            <TabBtn label="By Hours"  active={programTab === "By Hours"}  onClick={() => setProgramTab("By Hours")} />
          </div>
        }>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal stroke="var(--border-light)" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="program" type="category" width={60} tick={{ fontSize: 11 }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey={programTab === "By Visits" ? "visits" : "totalHours"} fill={C.teal} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>
      </div>

      {/* ── Row 3: Visits Over Time + Peak Hours + Visits by Day ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr", gap: 14 }}>
        <SCard title="Visits Over Time" info action={
          <div style={{ display: "flex", gap: 3 }}>
            <TabBtn label="Daily"   active={visitsFilter === "Daily"}   onClick={() => setVisitsFilter("Daily")} />
            <TabBtn label="Weekly"  active={visitsFilter === "Weekly"}  onClick={() => setVisitsFilter("Weekly")} />
            <TabBtn label="Monthly" active={visitsFilter === "Monthly"} onClick={() => setVisitsFilter("Monthly")} />
          </div>
        }>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitsOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="visits" stroke={C.teal} strokeWidth={2.5} dot={{ fill: C.teal, r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        <SCard title="Peak Hours">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours} barSize={18} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(238,162,58,.07)" }} />
                <Bar dataKey="avg" fill={C.amber} radius={[5, 5, 0, 0]}>
                  {peakHours.map((d, i) => {
                    const peakVal = Math.max(...peakHours.map(v => v.avg));
                    return <Cell key={i} fill={d.avg === peakVal ? C.teal : C.amber} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        <SCard title="Visits by Day of Week">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitsByDay} barSize={32} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(34,197,94,.07)" }} />
                <Bar dataKey="visits" fill={C.green} radius={[5, 5, 0, 0]}>
                  {visitsByDay.map((d, i) => {
                    const peakVal = Math.max(...visitsByDay.map(v => v.visits));
                    return <Cell key={i} fill={d.visits === peakVal ? C.amber : C.green} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>
      </div>

      {/* ── Row 4: Low Usage + Session Distribution + Other Insights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <SCard title="Low / No Usage Students" info action={
          <button style={{ fontSize: 12, fontWeight: 700, color: C.rose, background: "rgba(244,63,94,.08)", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>Alert</button>
        }>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {["Student Name", "Course / Program", "Visits", "Total Hours", "Last Visit"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px", paddingBottom: 8, borderBottom: "1px solid var(--border-light)", paddingRight: 8 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowUsage.slice(0, 5).map((s, i) => (
                <tr key={i} style={{ borderBottom: i < Math.min(lowUsage.length, 5) - 1 ? "1px solid var(--border-light)" : "none" }}>
                  <td style={{ padding: "9px 8px 9px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                  <td style={{ padding: "9px 8px 9px 0" }}><ProgramBadge prog={s.program} /></td>
                  <td style={{ padding: "9px 8px 9px 0", color: s.visits === 0 ? C.rose : "var(--text-secondary)", fontWeight: 700 }}>{s.visits}</td>
                  <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)" }}>{s.hours}</td>
                  <td style={{ padding: "9px 0", color: "var(--text-muted)", fontSize: 11 }}>{s.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button onClick={() => setShowLowUsageModal(true)}
              style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}>
              View All Low Usage Students
            </button>
          </div>
        </SCard>

        <SCard title="Session Duration Distribution">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sessionDist} cx="50%" cy="50%" innerRadius={52} outerRadius={80} startAngle={90} endAngle={-270} dataKey="pct" paddingAngle={1.5}>
                    {sessionDist.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{sessionTotal.toLocaleString()}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Total Visits</span>
              </div>
            </div>
            <div style={{ width: "100%", marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {sessionDist.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    {d.pct}% <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({(d.count ?? 0).toLocaleString()})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SCard>

        <SCard title="Other Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { icon: Clock,       iconBg: "rgba(99,102,241,.12)",  iconColor: C.indigo, label: "Longest Session Today",        value: otherInsights?.longestSession ?? "—",     sub: otherInsights?.longestSub     ?? "Loading…" },
              { icon: CalendarDays,iconBg: "rgba(34,197,94,.12)",   iconColor: "#16a34a",label: "Busiest Day",                  value: otherInsights?.busiestDay    ?? "—",     sub: otherInsights?.busiestSub     ?? "Loading…" },
              { icon: Trophy,      iconBg: "rgba(238,162,58,.15)",  iconColor: C.amber,  label: "Most Consistent User",         value: otherInsights?.consistentUser ?? "—",    sub: otherInsights?.consistentSub  ?? "Loading…" },
              { icon: Users,       iconBg: "rgba(168,85,247,.12)",  iconColor: C.purple, label: "Unique Students This Month",   value: otherInsights?.freshmenCount  ?? "—",    sub: otherInsights?.freshmenSub    ?? "Loading…" },
            ].map((item, i, arr) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: item.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <item.icon size={17} color={item.iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.value}</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </SCard>
      </div>
    </main>
  );
}