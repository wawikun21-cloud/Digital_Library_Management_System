/**
 * client/src/pages/AttendanceDashboard.jsx
 *
 * Library Attendance Dashboard — pure UI, no backend calls.
 * Matches the wireframe exactly:
 *   • 6 KPI stat cards
 *   • Top 50 Students table + Library Usage by Program bar chart
 *   • Visits Over Time line chart + Peak Hours bar chart + Visits by Day bar chart
 *   • Low/No Usage Students table + Session Duration donut + Other Insights panel
 */

import { useState, useEffect, useRef } from "react";
import { getAttendanceDashboardStats, getTopStudents, getAllTopStudents, getProgramUsage, getVisitsOverTime, getPeakHours, getVisitsByDay, getLowUsageStudents, getAllLowUsageStudents, getSessionDistribution, getOtherInsights } from "../services/api/attendanceApi";
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
import { useWebSocket } from "../hooks/useWebsocket";

// ── Palette (matches project tokens) ─────────────────────────────────────────
const C = {
  navy:    "#132F45",
  teal:    "#32667F",
  amber:   "#EEA23A",
  gold:    "#F3B940",
  orange:  "#EA8B33",
  green:   "#22c55e",
  mint:    "#2dd4bf",
  indigo:  "#6366f1",
  purple:  "#a855f7",
  rose:    "#f43f5e",
};

// ── Mock Data ─────────────────────────────────────────────────────────────────

const TOP_STUDENTS = [
  { rank: 1,  name: "Juan Dela Cruz",    program: "BSIT", visits: 28, hours: "38h 45m", avg: "1h 23m" },
  { rank: 2,  name: "Maria Santos",      program: "BSN",  visits: 24, hours: "35h 10m", avg: "1h 27m" },
  { rank: 3,  name: "John Paul Rivera",  program: "BSCS", visits: 22, hours: "32h 40m", avg: "1h 29m" },
  { rank: 4,  name: "Ana Reyes",         program: "BSA",  visits: 20, hours: "28h 15m", avg: "1h 25m" },
  { rank: 5,  name: "Mark Anthony Lim",  program: "BSIT", visits: 19, hours: "27h 50m", avg: "1h 28m" },
  { rank: 50, name: "Patrick Valdez",    program: "BSBA", visits: 8,  hours: "9h 20m",  avg: "1h 10m" },
];

const PROGRAM_DATA = [
  { program: "BSIT",  visits: 812 },
  { program: "BSN",   visits: 635 },
  { program: "BSCS",  visits: 582 },
  { program: "BSA",   visits: 448 },
  { program: "BSBA",  visits: 367 },
  { program: "BEED",  visits: 255 },
  { program: "BA",    visits: 210 },
  { program: "Others",visits: 173 },
];

const VISITS_OVER_TIME = [
  { date: "May 1",  visits: 280 }, { date: "May 3",  visits: 340 },
  { date: "May 5",  visits: 410 }, { date: "May 7",  visits: 390 },
  { date: "May 10", visits: 460 }, { date: "May 12", visits: 520 },
  { date: "May 14", visits: 480 }, { date: "May 15", visits: 580 },
  { date: "May 17", visits: 430 }, { date: "May 19", visits: 390 },
  { date: "May 20", visits: 510 }, { date: "May 22", visits: 490 },
  { date: "May 24", visits: 560 }, { date: "May 25", visits: 610 },
  { date: "May 27", visits: 480 }, { date: "May 29", visits: 520 },
  { date: "May 31", visits: 440 },
];

const PEAK_HOURS = [
  { hour: "8AM",  avg: 45  },
  { hour: "9AM",  avg: 120 },
  { hour: "10AM", avg: 210 },
  { hour: "11AM", avg: 260 },
  { hour: "12PM", avg: 180 },
  { hour: "1PM",  avg: 290 },
  { hour: "2PM",  avg: 370 },
  { hour: "3PM",  avg: 340 },
  { hour: "4PM",  avg: 280 },
  { hour: "5PM",  avg: 190 },
  { hour: "6PM",  avg: 110 },
  { hour: "7PM",  avg: 60  },
  { hour: "8PM",  avg: 30  },
];

const DAYS_OF_WEEK = [
  { day: "Mon", visits: 820 },
  { day: "Tue", visits: 790 },
  { day: "Wed", visits: 870 },
  { day: "Thu", visits: 810 },
  { day: "Fri", visits: 750 },
  { day: "Sat", visits: 540 },
  { day: "Sun", visits: 180 },
];

const LOW_USAGE = [
  { name: "Christian Bautista", program: "BSBA", visits: 0, hours: "0h 0m",  last: "—"           },
  { name: "Elaine Gomez",       program: "BSN",  visits: 0, hours: "0h 0m",  last: "—"           },
  { name: "Kevin Pagdilao",     program: "BSCS", visits: 1, hours: "0h 15m", last: "May 5, 2025" },
  { name: "Ralph Mendoza",      program: "BSA",  visits: 1, hours: "0h 20m", last: "May 6, 2025" },
  { name: "Jasmine Lee",        program: "BSIT", visits: 1, hours: "0h 25m", last: "May 7, 2025" },
];

const SESSION_DIST = [
  { label: "0 – 30 mins",  pct: 32.6, count: 1251, color: C.indigo  },
  { label: "31 – 60 mins", pct: 28.4, count: 1091, color: C.teal    },
  { label: "1 – 2 hours",  pct: 22.7, count: 872,  color: C.mint    },
  { label: "2 – 3 hours",  pct: 10.5, count: 404,  color: C.amber   },
  { label: "3+ hours",     pct: 5.8,  count: 224,  color: C.rose    },
];

// ── Shared tooltip ─────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
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

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "13px 15px", display: "flex",
      alignItems: "center", gap: 11, boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    }}>
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

// ── Section Card wrapper ───────────────────────────────────────────────────────
function SCard({ title, action, children, info }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border-light)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
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

// ── Tab Button ────────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none",
      cursor: "pointer", transition: "all .15s",
      background: active ? C.teal : "var(--bg-subtle)",
      color: active ? "#fff" : "var(--text-secondary)",
    }}>
      {label}
    </button>
  );
}

// ── Dropdown Button ───────────────────────────────────────────────────────────
function DropBtn({ label }) {
  return (
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px",
      fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer",
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      color: "var(--text-primary)",
    }}>
      {label} <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
    </button>
  );
}

// ── Program badge ─────────────────────────────────────────────────────────────
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
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {prog}
    </span>
  );
}

// ── Rank medal ────────────────────────────────────────────────────────────────
function RankBadge({ rank }) {
  const medals = { 1: C.amber, 2: "#9ca3af", 3: C.orange };
  const color = medals[rank];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%", fontSize: 11, fontWeight: 800,
      background: color || "var(--bg-subtle)",
      color: color ? "#fff" : "var(--text-muted)",
    }}>
      {rank <= 3 ? <Trophy size={12} /> : rank}
    </span>
  );
}

// ── Top Students Modal ────────────────────────────────────────────────────────
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
    });
  }, []);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Derive filter options dynamically from data
  const programs  = ["All", ...Array.from(new Set(allStudents.map(s => s.program).filter(p => p !== "—"))).sort()];
  const yrLevels  = ["All", ...Array.from(new Set(allStudents.map(s => s.yrLevel).filter(y => y !== "—"))).sort()];
  const semesters = ["All", ...Array.from(new Set(allStudents.map(s => s.semester).filter(x => x !== "—"))).sort()];

  // Filter
  const filtered = allStudents.filter(s => {
    if (filterProgram  !== "All" && s.program  !== filterProgram)  return false;
    if (filterYrLevel  !== "All" && s.yrLevel  !== filterYrLevel)  return false;
    if (filterSemester !== "All" && s.semester !== filterSemester) return false;
    return true;
  });

  // Re-rank after filtering, preserve sort choice
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Visits")    return b.visits - a.visits;
    if (sortBy === "Avg Time")  return (parseInt(b.avg) || 0) - (parseInt(a.avg) || 0);
    return b.totalMinutes - a.totalMinutes; // "Total Hours" default
  });

  const ranked = sorted.map((s, i) => ({ ...s, rank: i + 1 }));

  const selStyle = {
    fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
    background: "var(--bg-subtle)", border: "1px solid var(--border)",
    color: "var(--text-primary)", outline: "none",
  };

  // ── PDF download ─────────────────────────────────────────────────────────────
  const downloadPDF = async () => {
    if (!window._jsPDFLoaded) {
      await new Promise((resolve, reject) => {
        const s1 = document.createElement("script");
        s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s1.onload = () => {
          const s2 = document.createElement("script");
          s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
          s2.onload = () => { window._jsPDFLoaded = true; resolve(); };
          s2.onerror = reject;
          document.head.appendChild(s2);
        };
        s1.onerror = reject;
        document.head.appendChild(s1);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const navy = [19, 47, 69];
    const amber = [238, 162, 58];
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 52, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Top Students by Total Hours Report", 30, 22);

    const parts = [];
    if (filterProgram  !== "All") parts.push(`Program: ${filterProgram}`);
    if (filterYrLevel  !== "All") parts.push(`Year Level: ${filterYrLevel}`);
    if (filterSemester !== "All") parts.push(`Semester: ${filterSemester}`);
    parts.push(`Sorted by: ${sortBy}`);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 215, 225);
    doc.text(parts.join("  |  "), 30, 36);

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.setTextColor(180, 200, 215);
    doc.text(`Generated: ${dateStr}   •   ${ranked.length} student${ranked.length !== 1 ? "s" : ""}`, 30, 48);

    // Table
    doc.autoTable({
      startY: 62,
      head: [["Rank", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Avg Time / Visit"]],
      body: ranked.map(s => [s.rank, s.name, s.program, s.yrLevel, s.semester, s.visits, s.hours, s.avg]),
      styles: {
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        lineColor: [220, 228, 235],
        lineWidth: 0.4,
        textColor: [30, 40, 50],
      },
      headStyles: { fillColor: navy, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5, halign: "left" },
      alternateRowStyles: { fillColor: [245, 248, 251] },
      columnStyles: {
        0: { cellWidth: 30, halign: "center" },
        5: { halign: "center" },
      },
      // Amber highlight for top 3 ranks
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 0) {
          const rank = Number(data.cell.raw);
          if (rank === 1) data.cell.styles.textColor = [180, 120, 0];
          if (rank <= 3) data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 30, right: 30 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const y = doc.internal.pageSize.getHeight() - 14;
      doc.setDrawColor(...amber);
      doc.setLineWidth(1);
      doc.line(30, y - 6, pageW - 30, y - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 145);
      doc.text("Digital Library Management System  —  Confidential", 30, y);
      doc.text(`Page ${p} of ${pageCount}`, pageW - 30, y, { align: "right" });
    }

    const slug = [
      filterProgram  !== "All" ? filterProgram  : "All-Programs",
      filterYrLevel  !== "All" ? filterYrLevel.replace(/\s+/g, "-")  : null,
      filterSemester !== "All" ? filterSemester.replace(/\s+/g, "-") : null,
    ].filter(Boolean).join("_");
    doc.save(`TopStudents_${slug}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{
        background: "var(--bg-surface)", borderRadius: 14,
        border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
        width: "100%", maxWidth: 900,
        maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-light)", flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
              Top Students by Total Hours
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {ranked.length} student{ranked.length !== 1 ? "s" : ""} matching filters
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={downloadPDF}
              disabled={loading || ranked.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 7,
                cursor: loading || ranked.length === 0 ? "not-allowed" : "pointer",
                background: loading || ranked.length === 0 ? "rgba(238,162,58,.35)" : "#17006b",
                border: "none", color: "#fff",
                boxShadow: loading || ranked.length === 0 ? "none" : "0 2px 8px rgba(238,162,58,.35)",
                opacity: loading || ranked.length === 0 ? 0.6 : 1,
                transition: "opacity .15s",
              }}
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{
              background: "var(--bg-subtle)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "5px 7px", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
          borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Course / Program</span>
            <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} style={selStyle}>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Year Level</span>
            <select value={filterYrLevel} onChange={e => setFilterYrLevel(e.target.value)} style={selStyle}>
              {yrLevels.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Semester</span>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={selStyle}>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Sort By</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
              {["Total Hours", "Visits", "Avg Time"].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {(filterProgram !== "All" || filterYrLevel !== "All" || filterSemester !== "All" || sortBy !== "Total Hours") && (
            <button
              onClick={() => { setFilterProgram("All"); setFilterYrLevel("All"); setFilterSemester("All"); setSortBy("Total Hours"); }}
              style={{
                alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px",
                borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
                background: "rgba(239,68,68,.06)", color: "#ef4444",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Table */}
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
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".4px",
                      padding: "10px 10px 10px 0", paddingLeft: h === "Rank" ? 20 : 0,
                      borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
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

// ── Low Usage Modal ───────────────────────────────────────────────────────────
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
    });
  }, []);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Derive filter options from data
  const programs  = ["All", ...Array.from(new Set(allStudents.map(s => s.program).filter(p => p !== "—"))).sort()];
  const yrLevels  = ["All", ...Array.from(new Set(allStudents.map(s => s.yrLevel).filter(y => y !== "—"))).sort()];
  const semesters = ["All", ...Array.from(new Set(allStudents.map(s => s.semester).filter(x => x !== "—"))).sort()];

  const filtered = allStudents.filter(s => {
    if (filterProgram  !== "All" && s.program  !== filterProgram)  return false;
    if (filterYrLevel  !== "All" && s.yrLevel  !== filterYrLevel)  return false;
    if (filterSemester !== "All" && s.semester !== filterSemester) return false;
    return true;
  });

  const selStyle = {
    fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 6, cursor: "pointer",
    background: "var(--bg-subtle)", border: "1px solid var(--border)",
    color: "var(--text-primary)", outline: "none",
  };

  // ── PDF download (client-side via jsPDF + autotable) ────────────────────────
  const downloadPDF = async () => {
    // Lazy-load jsPDF and autotable from CDN
    if (!window._jsPDFLoaded) {
      await new Promise((resolve, reject) => {
        const s1 = document.createElement("script");
        s1.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        s1.onload = () => {
          const s2 = document.createElement("script");
          s2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
          s2.onload = () => { window._jsPDFLoaded = true; resolve(); };
          s2.onerror = reject;
          document.head.appendChild(s2);
        };
        s1.onerror = reject;
        document.head.appendChild(s1);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

    // ── Header block ──────────────────────────────────────────────────────────
    const navy  = [19, 47, 69];
    const amber = [238, 162, 58];
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageW, 52, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Low / No Usage Students Report", 30, 22);

    // Active filter summary line
    const parts = [];
    if (filterProgram  !== "All") parts.push(`Program: ${filterProgram}`);
    if (filterYrLevel  !== "All") parts.push(`Year Level: ${filterYrLevel}`);
    if (filterSemester !== "All") parts.push(`Semester: ${filterSemester}`);
    const filterLine = parts.length ? parts.join("  |  ") : "All Students";

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 215, 225);
    doc.text(filterLine, 30, 36);

    // Generated date + count
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.setTextColor(180, 200, 215);
    doc.text(`Generated: ${dateStr}   •   ${filtered.length} student${filtered.length !== 1 ? "s" : ""}`, 30, 48);

    // ── Table ─────────────────────────────────────────────────────────────────
    doc.autoTable({
      startY: 62,
      head: [["#", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"]],
      body: filtered.map((s, i) => [
        i + 1,
        s.name,
        s.program,
        s.yrLevel,
        s.semester,
        s.visits,
        s.hours,
        s.last,
      ]),
      styles: {
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
        lineColor: [220, 228, 235],
        lineWidth: 0.4,
        textColor: [30, 40, 50],
      },
      headStyles: {
        fillColor: navy,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5,
        halign: "left",
      },
      alternateRowStyles: { fillColor: [245, 248, 251] },
      columnStyles: {
        0: { cellWidth: 24, halign: "center" },
        5: { halign: "center" },
        6: { halign: "center" },
      },
      // Amber accent on rows with 0 visits
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 5) {
          const visits = Number(data.cell.raw);
          if (visits === 0) {
            data.cell.styles.textColor = [220, 50, 50];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
      margin: { left: 30, right: 30 },
    });

    // ── Footer on every page ──────────────────────────────────────────────────
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const y = doc.internal.pageSize.getHeight() - 14;
      doc.setDrawColor(...amber);
      doc.setLineWidth(1);
      doc.line(30, y - 6, pageW - 30, y - 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 145);
      doc.text("Digital Library Management System  —  Confidential", 30, y);
      doc.text(`Page ${p} of ${pageCount}`, pageW - 30, y, { align: "right" });
    }

    // ── Build filename from filters ───────────────────────────────────────────
    const slug = [
      filterProgram  !== "All" ? filterProgram  : "All-Programs",
      filterYrLevel  !== "All" ? filterYrLevel.replace(/\s+/g, "-")  : null,
      filterSemester !== "All" ? filterSemester.replace(/\s+/g, "-") : null,
    ].filter(Boolean).join("_");
    doc.save(`LowUsage_${slug}_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{
        background: "var(--bg-surface)", borderRadius: 14,
        border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)",
        width: "100%", maxWidth: 820,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--border-light)",
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--text-primary)" }}>
              Low / No Usage Students
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
              {filtered.length} student{filtered.length !== 1 ? "s" : ""} matching filters
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={downloadPDF}
              disabled={loading || filtered.length === 0}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 700, padding: "5px 12px",
                borderRadius: 7, cursor: loading || filtered.length === 0 ? "not-allowed" : "pointer",
                background: loading || filtered.length === 0 ? "rgba(238,162,58,.35)" : "#17006b",
                border: "none", color: "#fff",
                boxShadow: loading || filtered.length === 0 ? "none" : "0 2px 8px rgba(238,162,58,.35)",
                opacity: loading || filtered.length === 0 ? 0.6 : 1,
                transition: "opacity .15s",
              }}
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button onClick={onClose} style={{
              background: "var(--bg-subtle)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "5px 7px", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <X size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 20px",
          borderBottom: "1px solid var(--border-light)", flexShrink: 0, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Course / Program</span>
            <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} style={selStyle}>
              {programs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Year Level</span>
            <select value={filterYrLevel} onChange={e => setFilterYrLevel(e.target.value)} style={selStyle}>
              {yrLevels.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Semester</span>
            <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} style={selStyle}>
              {semesters.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {(filterProgram !== "All" || filterYrLevel !== "All" || filterSemester !== "All") && (
            <button
              onClick={() => { setFilterProgram("All"); setFilterYrLevel("All"); setFilterSemester("All"); }}
              style={{
                alignSelf: "flex-end", fontSize: 11, fontWeight: 600, padding: "4px 10px",
                borderRadius: 6, cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
                background: "rgba(239,68,68,.06)", color: "#ef4444",
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No students match the selected filters.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-surface)", zIndex: 1 }}>
                <tr>
                  {["#", "Student Name", "Course / Program", "Year Level", "Semester", "Visits", "Total Hours", "Last Visit"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".4px",
                      padding: "10px 10px 10px 0", paddingLeft: h === "#" ? 20 : 0,
                      borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
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
  const [programTab, setProgramTab] = useState("By Visits");
  const [visitsFilter, setVisitsFilter] = useState("Daily");
  const [showLowUsageModal, setShowLowUsageModal] = useState(false);
  const [showTopStudentsModal, setShowTopStudentsModal] = useState(false);

  // ── Global dashboard filters ───────────────────────────────────────────────
  const [globalFilter, setGlobalFilter] = useState({
    program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "",
  });
  const gf = globalFilter; // shorthand

  // ── Real KPI data ──────────────────────────────────────────────────────────
  const [kpi, setKpi] = useState(null);
  const [topStudents, setTopStudents] = useState(TOP_STUDENTS);
  const [programData, setProgramData] = useState(PROGRAM_DATA);
  const [visitsOverTime, setVisitsOverTime] = useState(VISITS_OVER_TIME);
  const [peakHours, setPeakHours] = useState(PEAK_HOURS);
  const [visitsByDay, setVisitsByDay] = useState(DAYS_OF_WEEK);
  const [lowUsage, setLowUsage] = useState(LOW_USAGE);
  const [sessionDist, setSessionDist] = useState(SESSION_DIST);
  const [sessionTotal, setSessionTotal] = useState(3842);
  const [otherInsights, setOtherInsights] = useState(null);

  // Ref to track latest visitsFilter for WS callback (avoids stale closure)
  const visitsFilterRef = useRef(visitsFilter);
  useEffect(() => {
    visitsFilterRef.current = visitsFilter;
  }, [visitsFilter]);

  // ── Data fetching functions ───────────────────────────────────────────────
  const fetchAllData = async (filters = gf) => {
    await Promise.all([
      getAttendanceDashboardStats(filters).then(res => {
        if (res.success) setKpi(res.data);
      }),
      getTopStudents(filters).then(res => {
        if (res.success && res.data.length > 0) setTopStudents(res.data);
      }),
      getProgramUsage(filters).then(res => {
        if (res.success && res.data.length > 0) setProgramData(res.data);
      }),
      getPeakHours(filters).then(res => {
        if (res.success && res.data.length > 0) setPeakHours(res.data);
      }),
      getVisitsByDay(filters).then(res => {
        if (res.success && res.data.length > 0) setVisitsByDay(res.data);
      }),
      getLowUsageStudents(filters).then(res => {
        if (res.success && res.data.length > 0) setLowUsage(res.data);
      }),
      getSessionDistribution(filters).then(res => {
        if (res.success && res.data.length > 0) {
          setSessionDist(res.data);
          setSessionTotal(res.totalVisits ?? 0);
        }
      }),
      getOtherInsights(filters).then(res => {
        if (res.success) setOtherInsights(res.data);
      }),
    ]);
  };

  const refetchAllData = async () => {
    setKpi(null);
    await fetchAllData(gf);
    getVisitsOverTime(visitsFilterRef.current, gf).then(res => {
      if (res.success && res.data.length > 0) setVisitsOverTime(res.data);
    });
  };

  // ── WebSocket real-time updates ────────────────────────────────────────────
  useWebSocket({
    isAdmin: false,
    onAttendanceUpdate: (payload) => {
      console.log("[WS] Attendance update:", payload.action, payload.data);
      refetchAllData();
    },
  });

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    fetchAllData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch ALL data whenever global filters change
  useEffect(() => {
    setKpi(null);
    fetchAllData(globalFilter);
    getVisitsOverTime(visitsFilterRef.current, globalFilter).then(res => {
      if (res.success && res.data.length > 0) setVisitsOverTime(res.data);
    });
  }, [globalFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch visits over time whenever groupBy changes (keep current global filter)
  useEffect(() => {
    getVisitsOverTime(visitsFilter, globalFilter).then(res => {
      if (res.success && res.data.length > 0) setVisitsOverTime(res.data);
    });
  }, [visitsFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helpers to format values (show "—" while loading)
  const totalVisits = kpi
    ? kpi.totalVisits.toLocaleString()
    : "—";

  const totalHours = kpi
    ? (() => {
        const h = Math.floor(kpi.totalMinutes / 60);
        return `${h.toLocaleString()} hrs`;
      })()
    : "—";

  const avgDuration = kpi
    ? (() => {
        const h = Math.floor(kpi.avgDurationMinutes / 60);
        const m = kpi.avgDurationMinutes % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      })()
    : "—";

  const peakHourLabel = kpi ? kpi.peakHourLabel : "—";
  const peakHourSub   = kpi ? `${kpi.peakHourCount} check-ins` : "No data yet";

  const mostActiveProgram = kpi ? kpi.mostActiveProgram : "—";
  const mostActiveSub     = kpi ? `${kpi.mostActiveProgramVisits.toLocaleString()} visits` : "—";

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showLowUsageModal    && <LowUsageModal    onClose={() => setShowLowUsageModal(false)} />}
      {showTopStudentsModal && <TopStudentsModal  onClose={() => setShowTopStudentsModal(false)} />}

      {/* ── Page Header + Inline Filters (matches screenshot) ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        {/* Left: title */}
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 7 }}>
            <Users size={17} color={C.amber} /> Library Attendance Dashboard
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
            Monitor student library usage, visits, and engagement
          </p>
        </div>

        {/* Right: Date Range + filters + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

          {/* Date Range — from/to date inputs hidden behind a single display */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Date Range</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="date"
                value={globalFilter.dateFrom}
                onChange={e => setGlobalFilter(f => ({ ...f, dateFrom: e.target.value }))}
                style={{
                  fontSize: 11, padding: "3px 7px", borderRadius: 5, cursor: "pointer",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>–</span>
              <input
                type="date"
                value={globalFilter.dateTo}
                onChange={e => setGlobalFilter(f => ({ ...f, dateTo: e.target.value }))}
                style={{
                  fontSize: 11, padding: "3px 7px", borderRadius: 5, cursor: "pointer",
                  background: "var(--bg-surface)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>
          </div>

          {/* Course / Program */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Course / Program</span>
            <select
              value={globalFilter.program}
              onChange={e => setGlobalFilter(f => ({ ...f, program: e.target.value }))}
              style={{
                fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                color: "var(--text-primary)", outline: "none", cursor: "pointer",
                appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center",
              }}
            >
              {["All", ...Array.from(new Set(programData.map(p => p.program).filter(p => p !== "Others"))).sort(), "Others"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Year Level */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Year Level</span>
            <select
              value={globalFilter.yrLevel}
              onChange={e => setGlobalFilter(f => ({ ...f, yrLevel: e.target.value }))}
              style={{
                fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                color: "var(--text-primary)", outline: "none", cursor: "pointer",
                appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center",
              }}
            >
              {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Semester / School Year */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>Semester</span>
            <select
              value={globalFilter.schoolYear}
              onChange={e => setGlobalFilter(f => ({ ...f, schoolYear: e.target.value }))}
              style={{
                fontSize: 11, fontWeight: 500, padding: "3px 24px 3px 8px", borderRadius: 5,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                color: "var(--text-primary)", outline: "none", cursor: "pointer",
                appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat", backgroundPosition: "right 7px center",
              }}
            >
              {["All", "2024-2025", "2023-2024", "2022-2023"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters — only visible when any filter is active */}
          {(globalFilter.program !== "All" || globalFilter.yrLevel !== "All" || globalFilter.schoolYear !== "All" || globalFilter.dateFrom || globalFilter.dateTo) && (
            <button
              onClick={() => setGlobalFilter({ program: "All", yrLevel: "All", schoolYear: "All", dateFrom: "", dateTo: "" })}
              style={{
                alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                cursor: "pointer", border: "1px solid rgba(239,68,68,.25)",
                background: "rgba(239,68,68,.06)", color: "#ef4444",
              }}
            >
              <X size={10} /> Clear
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={refetchAllData}
            style={{
              alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", fontSize: 11, fontWeight: 700, borderRadius: 6,
              cursor: "pointer", background: "rgba(239,68,68,.06)",
              border: "1.5px solid rgba(239,68,68,.2)", color: "#ef4444",
            }}
          >
            <RefreshCw size={11} />
          </button>

          {/* Export Report */}
          <button style={{
            alignSelf: "flex-end", display: "flex", alignItems: "center", gap: 5,
            padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 6,
            cursor: "pointer", background: C.amber, border: "none", color: "#fff",
            boxShadow: "0 2px 8px rgba(238,162,58,.35)",
          }}>
            <Download size={11} /> Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12 }}>
        <KpiCard icon={Users}        iconBg="rgba(99,102,241,.12)"  iconColor={C.indigo}  label="Total Library Visits"    value={totalVisits}     sub={<span style={{ color: C.green }}>All-time check-ins</span>} />
        <KpiCard icon={Clock}        iconBg="rgba(34,197,94,.12)"   iconColor="#16a34a"   label="Total Hours Logged"      value={totalHours}      sub={<span style={{ color: C.green }}>Completed sessions</span>} />
        <KpiCard icon={Timer}        iconBg="rgba(238,162,58,.15)"  iconColor={C.amber}   label="Average Session Duration" value={avgDuration}    sub={<span style={{ color: C.green }}>Per completed session</span>} />
        <KpiCard icon={TrendingUp}   iconBg="rgba(45,212,191,.12)"  iconColor={C.mint}    label="Peak Hour Today"         value={peakHourLabel}   sub={peakHourSub} />
        <KpiCard icon={GraduationCap} iconBg="rgba(168,85,247,.12)" iconColor={C.purple}  label="Most Active Program"     value={mostActiveProgram} sub={mostActiveSub} />
        <KpiCard icon={UserCheck}    iconBg="rgba(50,102,127,.12)"  iconColor={C.teal}    label="Current Occupancy"       value="78 / 120"       sub="65% capacity" />
      </div>

      {/* ── Row 2: Top Students + Program Usage ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Top 50 Students */}
        <SCard
          title="Top 50 Students by Total Hours"
          info
          action={<DropBtn label="Sort by: Total Hours" />}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Rank", "Student Name", "Course / Program", "Visits", "Total Hours", "Avg Time / Visit"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: ".5px", paddingBottom: 10,
                    borderBottom: "1px solid var(--border-light)", paddingRight: 10,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topStudents.slice(0, 5).map((s) => (
                <tr key={s.rank} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: "10px 10px 10px 0" }}><RankBadge rank={s.rank} /></td>
                  <td style={{ padding: "10px 10px 10px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                  <td style={{ padding: "10px 10px 10px 0" }}><ProgramBadge prog={s.program} /></td>
                  <td style={{ padding: "10px 10px 10px 0", color: "var(--text-secondary)", fontWeight: 600 }}>{s.visits}</td>
                  <td style={{ padding: "10px 10px 10px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.hours}</td>
                  <td style={{ padding: "10px 0",           color: "var(--text-secondary)" }}>{s.avg}</td>
                </tr>
              ))}
              {topStudents.length > 5 && (
                <tr>
                  <td colSpan={6} style={{ padding: "6px 0", color: "var(--text-muted)", fontSize: 12 }}>…</td>
                </tr>
              )}
              {topStudents.length > 5 && (() => {
                const last = topStudents[topStudents.length - 1];
                return (
                  <tr>
                    <td style={{ padding: "10px 10px 0 0" }}><RankBadge rank={last.rank} /></td>
                    <td style={{ padding: "10px 10px 0 0", fontWeight: 600, color: "var(--text-primary)" }}>{last.name}</td>
                    <td style={{ padding: "10px 10px 0 0" }}><ProgramBadge prog={last.program} /></td>
                    <td style={{ padding: "10px 10px 0 0", color: "var(--text-secondary)", fontWeight: 600 }}>{last.visits}</td>
                    <td style={{ padding: "10px 10px 0 0", fontWeight: 700, color: "var(--text-primary)" }}>{last.hours}</td>
                    <td style={{ padding: "10px 0 0",      color: "var(--text-secondary)" }}>{last.avg}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button
              onClick={() => setShowTopStudentsModal(true)}
              style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}
            >
              View All
            </button>
          </div>
        </SCard>

        {/* Library Usage by Program */}
        <SCard
          title="Library Usage by Program"
          info
          action={
            <div style={{ display: "flex", gap: 4 }}>
              {["By Visits", "By Total Hours", "By Avg Hours / Student"].map(t => (
                <TabBtn key={t} label={t} active={programTab === t} onClick={() => setProgramTab(t)} />
              ))}
            </div>
          }
        >
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={programData} barSize={28} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="program" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(50,102,127,.07)" }} />
                <Bar dataKey={programTab === "By Total Hours" ? "totalHours" : programTab === "By Avg Hours / Student" ? "avgMinPerStudent" : "visits"} fill={C.teal} radius={[5, 5, 0, 0]}>
                  {programData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.indigo : C.teal} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}>
              View Program Details
            </button>
          </div>
        </SCard>
      </div>

      {/* ── Row 3: Visits Over Time + Peak Hours + Visits by Day ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 14 }}>

        {/* Visits Over Time */}
        <SCard title="Visits Over Time" action={
          <button onClick={() => setVisitsFilter(f => f === "Daily" ? "Weekly" : f === "Weekly" ? "Monthly" : "Daily")} style={{
            display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px",
            fontSize: 11, fontWeight: 500, borderRadius: 5, cursor: "pointer",
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}>
            {visitsFilter} <ChevronDown size={10} style={{ color: "var(--text-muted)" }} />
          </button>
        }>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitsOverTime} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                  interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, 800]} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="visits" stroke={C.teal} strokeWidth={2.5}
                  dot={{ r: 3, fill: C.teal, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: C.amber }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Peak Hours */}
        <SCard title="Peak Hours" action={<span style={{ fontSize: 11, color: "var(--text-muted)" }}>(Average Check-ins)</span>}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours} barSize={18} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(45,212,191,.07)" }} />
                <Bar dataKey="avg" fill={C.mint} radius={[4, 4, 0, 0]}>
                  {peakHours.map((d, i) => {
                    const peakVal = Math.max(...peakHours.map(h => h.avg));
                    return <Cell key={i} fill={d.avg === peakVal ? C.amber : C.mint} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Visits by Day of Week */}
        <SCard title="Visits by Day of Week">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitsByDay} barSize={32} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, 1000]} />
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

      {/* ── Row 4: Low Usage + Session Dist + Other Insights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

        {/* Low / No Usage Students */}
        <SCard title="Low / No Usage Students" info action={
          <button style={{ fontSize: 12, fontWeight: 700, color: C.rose, background: "rgba(244,63,94,.08)", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>
            Alert
          </button>
        }>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {["Student Name", "Course / Program", "Visits", "Total Hours", "Last Visit"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                    textTransform: "uppercase", letterSpacing: ".4px", paddingBottom: 8,
                    borderBottom: "1px solid var(--border-light)", paddingRight: 8,
                  }}>{h}</th>
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
            <button
              onClick={() => setShowLowUsageModal(true)}
              style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}
            >
              View All Low Usage Students
            </button>
          </div>
        </SCard>

        {/* Session Duration Distribution */}
        <SCard title="Session Duration Distribution">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", width: 170, height: 170 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sessionDist}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={80}
                    startAngle={90} endAngle={-270}
                    dataKey="pct"
                    paddingAngle={1.5}
                  >
                    {sessionDist.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
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
                    {d.pct}% <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({d.count.toLocaleString()})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SCard>

        {/* Other Insights */}
        <SCard title="Other Insights">
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              {
                icon: Clock, iconBg: "rgba(99,102,241,.12)", iconColor: C.indigo,
                label: "Longest Session Today",
                value: otherInsights ? otherInsights.longestSession : "—",
                sub:   otherInsights ? otherInsights.longestSub     : "Loading…",
              },
              {
                icon: CalendarDays, iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a",
                label: "Busiest Day",
                value: otherInsights ? otherInsights.busiestDay : "—",
                sub:   otherInsights ? otherInsights.busiestSub : "Loading…",
              },
              {
                icon: Trophy, iconBg: "rgba(238,162,58,.15)", iconColor: C.amber,
                label: "Most Consistent User",
                value: otherInsights ? otherInsights.consistentUser : "—",
                sub:   otherInsights ? otherInsights.consistentSub  : "Loading…",
              },
              {
                icon: Users, iconBg: "rgba(168,85,247,.12)", iconColor: C.purple,
                label: "Unique Students This Month",
                value: otherInsights ? otherInsights.freshmenCount : "—",
                sub:   otherInsights ? otherInsights.freshmenSub   : "Loading…",
              },
            ].map((item, i, arr) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border-light)" : "none",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: item.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <item.icon size={17} color={item.iconColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.value}
                  </p>
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