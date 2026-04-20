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

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Clock, Timer, TrendingUp, GraduationCap, UserCheck,
  ChevronDown, SlidersHorizontal, Info, CalendarDays,
  Trophy, Star, ArrowUpRight, Download,
} from "lucide-react";

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
      borderRadius: 12, padding: "16px 18px", display: "flex",
      alignItems: "center", gap: 14, boxShadow: "var(--shadow-sm)",
      transition: "box-shadow .2s, transform .2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow-md)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "var(--shadow-sm)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, marginBottom: 3 }}>{value}</p>
        {sub && <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</p>}
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
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          {info && <Info size={13} style={{ color: "var(--text-muted)", cursor: "default" }} />}
        </div>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
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
      display: "flex", alignItems: "center", gap: 5, padding: "6px 12px",
      fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
      background: "var(--bg-subtle)", border: "1px solid var(--border-light)",
      color: "var(--text-secondary)",
    }}>
      {label} <ChevronDown size={13} />
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
      background: color ? color : "var(--bg-subtle)",
      color: color ? "#fff" : "var(--text-muted)",
    }}>
      {rank <= 3 ? <Trophy size={12} /> : rank}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AttendanceDashboard() {
  const [programTab, setProgramTab] = useState("By Visits");
  const [visitsFilter, setVisitsFilter] = useState("Daily");

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(238,162,58,.15)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color={C.amber} />
            </span>
            Library Attendance Dashboard
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Monitor student library usage, visits, and engagement
          </p>
        </div>

        {/* Filters row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <DropBtn label="📅  May 1 – May 31, 2025" />
          <DropBtn label="Course / Program: All" />
          <DropBtn label="Year Level: All" />
          <button style={{
            display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
            fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer",
            background: "rgba(99,102,241,.1)", border: "1.5px solid rgba(99,102,241,.3)",
            color: C.indigo,
          }}>
            <SlidersHorizontal size={13} /> More Filters
          </button>
          <button
            onClick={() => {}}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer",
              background: C.amber, border: "none", color: "#fff",
              boxShadow: "0 2px 8px rgba(238,162,58,.35)",
            }}
          >
            <Download size={13} /> Export Report
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <KpiCard icon={Users}        iconBg="rgba(99,102,241,.12)"  iconColor={C.indigo}  label="Total Library Visits"    value="3,842"          sub={<span style={{ color: C.green }}>↑ 12.6% vs Apr 1 – Apr 30</span>} />
        <KpiCard icon={Clock}        iconBg="rgba(34,197,94,.12)"   iconColor="#16a34a"   label="Total Hours Logged"      value="2,456 hrs"      sub={<span style={{ color: C.green }}>↑ 15.3% vs Apr 1 – Apr 30</span>} />
        <KpiCard icon={Timer}        iconBg="rgba(238,162,58,.15)"  iconColor={C.amber}   label="Average Session Duration" value="1h 18m"        sub={<span style={{ color: C.green }}>↑ 8.1% vs Apr 1 – Apr 30</span>} />
        <KpiCard icon={TrendingUp}   iconBg="rgba(45,212,191,.12)"  iconColor={C.mint}    label="Peak Hour Today"         value="2:00 PM – 3:00 PM" sub="256 check-ins" />
        <KpiCard icon={GraduationCap} iconBg="rgba(168,85,247,.12)" iconColor={C.purple}  label="Most Active Program"     value="BSIT"           sub="812 visits" />
        <KpiCard icon={UserCheck}    iconBg="rgba(50,102,127,.12)"  iconColor={C.teal}    label="Current Occupancy"       value="78 / 120"       sub="65% capacity" />
      </div>

      {/* ── Row 2: Top Students + Program Usage ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

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
              {TOP_STUDENTS.map((s, i) => (
                <tr key={s.rank} style={{ borderBottom: s.rank === 5 ? "none" : "1px solid var(--border-light)" }}>
                  {s.rank === 50
                    ? (
                      <>
                        <td colSpan={6} style={{ padding: "6px 0", color: "var(--text-muted)", fontSize: 12 }}>…</td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "10px 10px 10px 0" }}><RankBadge rank={s.rank} /></td>
                        <td style={{ padding: "10px 10px 10px 0", fontWeight: 600, color: "var(--text-primary)" }}>{s.name}</td>
                        <td style={{ padding: "10px 10px 10px 0" }}><ProgramBadge prog={s.program} /></td>
                        <td style={{ padding: "10px 10px 10px 0", color: "var(--text-secondary)", fontWeight: 600 }}>{s.visits}</td>
                        <td style={{ padding: "10px 10px 10px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.hours}</td>
                        <td style={{ padding: "10px 0",           color: "var(--text-secondary)" }}>{s.avg}</td>
                      </>
                    )
                  }
                </tr>
              ))}
              {/* Row 50 */}
              <tr>
                <td style={{ padding: "10px 10px 0 0" }}><RankBadge rank={50} /></td>
                <td style={{ padding: "10px 10px 0 0", fontWeight: 600, color: "var(--text-primary)" }}>Patrick Valdez</td>
                <td style={{ padding: "10px 10px 0 0" }}><ProgramBadge prog="BSBA" /></td>
                <td style={{ padding: "10px 10px 0 0", color: "var(--text-secondary)", fontWeight: 600 }}>8</td>
                <td style={{ padding: "10px 10px 0 0", fontWeight: 700, color: "var(--text-primary)" }}>9h 20m</td>
                <td style={{ padding: "10px 0 0",      color: "var(--text-secondary)" }}>1h 10m</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}>
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
              <BarChart data={PROGRAM_DATA} barSize={28} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="program" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(50,102,127,.07)" }} />
                <Bar dataKey="visits" fill={C.teal} radius={[5, 5, 0, 0]}>
                  {PROGRAM_DATA.map((_, i) => (
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", gap: 16 }}>

        {/* Visits Over Time */}
        <SCard title="Visits Over Time" action={<DropBtn label={visitsFilter} />}>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={VISITS_OVER_TIME} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
              <BarChart data={PEAK_HOURS} barSize={18} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(45,212,191,.07)" }} />
                <Bar dataKey="avg" fill={C.mint} radius={[4, 4, 0, 0]}>
                  {PEAK_HOURS.map((d, i) => (
                    <Cell key={i} fill={d.hour === "2PM" ? C.amber : C.mint} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Visits by Day of Week */}
        <SCard title="Visits by Day of Week">
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DAYS_OF_WEEK} barSize={32} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} domain={[0, 1000]} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(34,197,94,.07)" }} />
                <Bar dataKey="visits" fill={C.green} radius={[5, 5, 0, 0]}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <Cell key={i} fill={d.day === "Wed" ? C.amber : C.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SCard>
      </div>

      {/* ── Row 4: Low Usage + Session Dist + Other Insights ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

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
              {LOW_USAGE.map((s, i) => (
                <tr key={i} style={{ borderBottom: i < LOW_USAGE.length - 1 ? "1px solid var(--border-light)" : "none" }}>
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
            <button style={{ fontSize: 12, fontWeight: 700, color: C.teal, background: "none", border: "none", cursor: "pointer" }}>
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
                    data={SESSION_DIST}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={80}
                    startAngle={90} endAngle={-270}
                    dataKey="pct"
                    paddingAngle={1.5}
                  >
                    {SESSION_DIST.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>3,842</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Total Visits</span>
              </div>
            </div>

            <div style={{ width: "100%", marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {SESSION_DIST.map((d, i) => (
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
                label: "Longest Session Today", value: "5h 42m", sub: "Mark Anthony Lim (BSIT)",
              },
              {
                icon: CalendarDays, iconBg: "rgba(34,197,94,.12)", iconColor: "#16a34a",
                label: "Busiest Day", value: "Wednesday", sub: "782 visits",
              },
              {
                icon: Trophy, iconBg: "rgba(238,162,58,.15)", iconColor: C.amber,
                label: "Most Consistent User", value: "Maria Santos (BSN)", sub: "Visited 20 of 22 days",
              },
              {
                icon: Users, iconBg: "rgba(168,85,247,.12)", iconColor: C.purple,
                label: "Unique Students This Month", value: "1,342", sub: "35% of total enrollment",
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
