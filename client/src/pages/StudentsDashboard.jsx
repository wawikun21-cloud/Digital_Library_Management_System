/**
 * client/src/pages/StudentsDashboard.jsx
 *
 * Students Overview Dashboard — pure UI, no backend.
 * Matches wireframe exactly:
 *  • Header with Academic Year selector + user info
 *  • Filter bar (Semester, Course/Program, Region, City, Barangay, Feeder School, Gender)
 *  • 6 KPI cards
 *  • Student Distribution Map (SVG choropleth) + Course Demand (bar + donut)
 *  • Top Feeder Schools table + Attendance Insights (3 panels) + Location vs Course table
 *  • Enrollment Trends line + Course Growth Trends multi-line + Enrollment by Gender donut
 */

import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, UserPlus, CalendarCheck, GraduationCap, MapPin, School,
  ChevronDown, RefreshCw, Bell, User, ArrowUpRight, ArrowDownRight,
  Filter, X,
} from "lucide-react";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  navy:   "#132F45",
  teal:   "#32667F",
  amber:  "#EEA23A",
  blue:   "#3b82f6",
  indigo: "#6366f1",
  green:  "#22c55e",
  rose:   "#f43f5e",
  purple: "#a855f7",
  cyan:   "#06b6d4",
  orange: "#f97316",
  pink:   "#ec4899",
  slate:  "#64748b",
};

// ── Mock Data ─────────────────────────────────────────────────────────────────
const COURSE_BAR = [
  { course: "BSIT",   students: 808 },
  { course: "BSBA",   students: 617 },
  { course: "BSED",   students: 470 },
  { course: "BSN",    students: 352 },
  { course: "BSA",    students: 222 },
  { course: "BEED",   students: 173 },
  { course: "BTVTED", students: 115 },
  { course: "Others", students: 86  },
];

const COURSE_DONUT = [
  { name: "BSIT",   value: 28.4, color: C.blue   },
  { name: "BSBA",   value: 21.7, color: C.cyan   },
  { name: "BSED",   value: 16.6, color: C.indigo },
  { name: "BSN",    value: 12.4, color: C.green  },
  { name: "BSA",    value: 7.8,  color: C.slate  },
  { name: "BEED",   value: 6.1,  color: C.amber  },
  { name: "Others", value: 5.0,  color: C.rose   },
];

const FEEDER_SCHOOLS = [
  { name: "Sapang High School",         location: "City A", enrollees: 186, topCourse: "BSIT"  },
  { name: "San Isidro National HS",     location: "City A", enrollees: 153, topCourse: "BSBA"  },
  { name: "Riverside High School",      location: "City B", enrollees: 142, topCourse: "BSED"  },
  { name: "East Valley Integrated HS",  location: "City B", enrollees: 118, topCourse: "BSN"   },
  { name: "West Point High School",     location: "City C", enrollees: 97,  topCourse: "BSIT"  },
];

const ATTENDANCE_OVER_TIME = [
  { month: "Aug", rate: 94 }, { month: "Sep", rate: 92 }, { month: "Oct", rate: 91 },
  { month: "Nov", rate: 88 }, { month: "Dec", rate: 85 }, { month: "Jan", rate: 87 },
  { month: "Feb", rate: 90 }, { month: "Mar", rate: 92 }, { month: "Apr", rate: 93 },
  { month: "May", rate: 91 },
];

const ATTENDANCE_BY_COURSE = [
  { course: "BSIT",   rate: 93.4 },
  { course: "BSBA",   rate: 92.1 },
  { course: "BSED",   rate: 91.7 },
  { course: "BSN",    rate: 90.8 },
  { course: "BSA",    rate: 89.6 },
  { course: "BEED",   rate: 88.3 },
  { course: "BTVTED", rate: 86.5 },
];

const AT_RISK = [
  { id: "20241001", course: "BSIT",  attendance: "62%" },
  { id: "20241022", course: "BSED",  attendance: "64%" },
  { id: "20241105", course: "BSBA",  attendance: "66%" },
  { id: "20241087", course: "BSN",   attendance: "67%" },
  { id: "20241132", course: "BSA",   attendance: "68%" },
];

const LOC_VS_COURSE = [
  { course: "BSIT",   students: 120, pct: 38.5 },
  { course: "BSBA",   students: 84,  pct: 26.9 },
  { course: "BSED",   students: 54,  pct: 17.3 },
  { course: "BSN",    students: 28,  pct: 9.0  },
  { course: "Others", students: 26,  pct: 8.3  },
];

const ENROLLMENT_TREND = [
  { year: "2020-21", students: 1850 },
  { year: "2021-22", students: 2150 },
  { year: "2022-23", students: 2320 },
  { year: "2023-24", students: 2620 },
  { year: "2024-25", students: 2843 },
];

const COURSE_GROWTH = [
  { year: "2020-21", BSIT: 480,  BSBA: 380, BSED: 290, BSN: 210, Others: 490 },
  { year: "2021-22", BSIT: 560,  BSBA: 420, BSED: 340, BSN: 240, Others: 590 },
  { year: "2022-23", BSIT: 640,  BSBA: 470, BSED: 380, BSN: 270, Others: 630 },
  { year: "2023-24", BSIT: 730,  BSBA: 540, BSED: 420, BSN: 310, Others: 620 },
  { year: "2024-25", BSIT: 808,  BSBA: 617, BSED: 470, BSN: 352, Others: 596 },
];

const GENDER_DONUT = [
  { name: "Female", value: 58.0, count: 1648, color: C.pink },
  { name: "Male",   value: 42.0, count: 1195, color: C.blue },
];

// ── Barangay map data ─────────────────────────────────────────────────────────
const BARANGAYS = [
  { id: "b5", label: "Barangay 5", students: 312, x: 270, y: 200, r: 38, shade: 5 },
  { id: "b2", label: "Barangay 2", students: 284, x: 155, y: 170, r: 30, shade: 4 },
  { id: "b1", label: "Barangay 1", students: 276, x: 110, y: 230, r: 28, shade: 4 },
  { id: "b4", label: "Barangay 4", students: 198, x: 350, y: 240, r: 24, shade: 3 },
  { id: "b3", label: "Barangay 3", students: 176, x: 220, y: 300, r: 22, shade: 3 },
  { id: "b7", label: "Barangay 7", students: 142, x: 160, y: 340, r: 20, shade: 2 },
  { id: "b8", label: "Barangay 8", students: 98,  x: 320, y: 320, r: 18, shade: 1 },
  { id: "b6", label: "Barangay 6", students: 73,  x: 420, y: 180, r: 15, shade: 1 },
];

const SHADE_COLORS = {
  5: "#1e3a5f",
  4: "#2d5282",
  3: "#3b6cb0",
  2: "#7eb3e0",
  1: "#c3dff5",
};

const TOP5 = BARANGAYS.slice(0, 5);

// ── Shared Components ─────────────────────────────────────────────────────────
function ChartTip({ active, payload, label, suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
      {label && <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: "var(--text-primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color || p.fill || p.stroke, display: "inline-block" }} />
          {p.name && <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{p.name}:</span>}
          {p.value?.toLocaleString()}{suffix}
        </p>
      ))}
    </div>
  );
}

function SCard({ title, subtitle, action, children, noPad }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)",
      display: "flex", flexDirection: "column",
    }}>
      {(title || action) && (
        <div style={{
          padding: "13px 18px", borderBottom: "1px solid var(--border-light)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{title}</p>
            {subtitle && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={noPad ? {} : { padding: 18, flex: 1 }}>{children}</div>
    </div>
  );
}

function DropBtn({ label, small }) {
  return (
    <button style={{
      display: "flex", alignItems: "center", gap: 5,
      padding: small ? "5px 10px" : "7px 12px",
      fontSize: small ? 11 : 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
      background: "var(--bg-subtle)", border: "1px solid var(--border-light)",
      color: "var(--text-secondary)", whiteSpace: "nowrap",
    }}>
      {label} <ChevronDown size={12} />
    </button>
  );
}

function TabBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 7,
      border: "none", cursor: "pointer", transition: "all .15s",
      background: active ? C.blue : "var(--bg-subtle)",
      color: active ? "#fff" : "var(--text-secondary)",
    }}>{label}</button>
  );
}

function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub, subUp }) {
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
      <div style={{
        width: 46, height: 46, borderRadius: 12, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={22} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 500, margin: "0 0 3px" }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, margin: "0 0 4px" }}>{value}</p>
        {sub && (
          <p style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 3, margin: 0 }}>
            {subUp !== undefined && (
              subUp
                ? <ArrowUpRight size={12} color={C.green} />
                : <ArrowDownRight size={12} color={C.rose} />
            )}
            <span style={{ color: subUp === true ? C.green : subUp === false ? C.rose : "var(--text-muted)" }}>{sub}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── SVG Choropleth Map ────────────────────────────────────────────────────────
function DistributionMap() {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox="0 0 560 420" style={{ width: "100%", borderRadius: 10, background: "var(--bg-subtle)" }}>
        {/* water bg */}
        <rect width="560" height="420" fill="var(--bg-subtle)" rx="10" />
        {/* coastline blob */}
        <path d="M30,60 Q80,20 160,40 Q240,55 310,30 Q390,10 460,50 Q520,80 530,160
                 Q540,240 510,320 Q480,390 400,400 Q300,415 200,400
                 Q120,390 70,340 Q20,290 20,210 Q15,130 30,60Z"
          fill="rgba(99,179,237,0.12)" stroke="rgba(99,179,237,0.25)" strokeWidth="1.5" />

        {/* barangay bubbles */}
        {BARANGAYS.map(b => (
          <g key={b.id}
            onMouseEnter={() => setHovered(b)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: "pointer" }}
          >
            <circle cx={b.x} cy={b.y} r={b.r + 4} fill={SHADE_COLORS[b.shade]} opacity={0.15} />
            <circle cx={b.x} cy={b.y} r={b.r}
              fill={hovered?.id === b.id ? C.amber : SHADE_COLORS[b.shade]}
              stroke={hovered?.id === b.id ? "#fff" : "rgba(255,255,255,0.3)"}
              strokeWidth={1.5}
              style={{ transition: "fill .2s" }}
            />
            <text x={b.x} y={b.y - b.r - 6} textAnchor="middle"
              fontSize={9.5} fontWeight={600} fill="var(--text-secondary)">{b.label}</text>
          </g>
        ))}

        {/* tooltip */}
        {hovered && (
          <g>
            <rect x={hovered.x + hovered.r + 6} y={hovered.y - 18} width={110} height={36}
              rx={6} fill="var(--bg-surface)" stroke="var(--border)" strokeWidth={1} />
            <text x={hovered.x + hovered.r + 12} y={hovered.y - 3}
              fontSize={11} fontWeight={700} fill="var(--text-primary)">{hovered.label}</text>
            <text x={hovered.x + hovered.r + 12} y={hovered.y + 12}
              fontSize={10} fill="var(--text-secondary)">{hovered.students} students</text>
          </g>
        )}

        {/* zoom controls */}
        <g>
          <rect x={520} y={20} width={26} height={26} rx={6} fill="var(--bg-surface)" stroke="var(--border)" strokeWidth={1} />
          <text x={533} y={37} textAnchor="middle" fontSize={16} fill="var(--text-secondary)">+</text>
          <rect x={520} y={50} width={26} height={26} rx={6} fill="var(--bg-surface)" stroke="var(--border)" strokeWidth={1} />
          <text x={533} y={67} textAnchor="middle" fontSize={16} fill="var(--text-secondary)">−</text>
        </g>
      </svg>

      {/* Legend */}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 4px" }}>Number of Students</p>
        {[
          { label: "200 and above", shade: 5 },
          { label: "101 – 200",     shade: 4 },
          { label: "51 – 100",      shade: 3 },
          { label: "21 – 50",       shade: 2 },
          { label: "20 and below",  shade: 1 },
        ].map(l => (
          <div key={l.shade} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, background: SHADE_COLORS[l.shade], flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Top 5 Barangays panel */}
      <div style={{
        marginTop: 14, background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px",
        border: "1px solid var(--border-light)",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>
          Top 5 Barangays <span style={{ fontSize: 10, fontWeight: 500, color: "var(--text-muted)" }}>by number of students</span>
        </p>
        {TOP5.map((b, i) => (
          <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 4 ? 7 : 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", width: 72, flexShrink: 0 }}>{b.label}</span>
            <div style={{ flex: 1, height: 8, background: "var(--border-light)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, background: C.blue,
                width: `${(b.students / 312) * 100}%`, transition: "width .4s",
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", width: 30, textAlign: "right" }}>{b.students}</span>
          </div>
        ))}
        <button style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          View all locations
        </button>
      </div>
    </div>
  );
}

// ── Attendance Rate Bar (horizontal) ─────────────────────────────────────────
function AttendanceByCourseBars() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ATTENDANCE_BY_COURSE.map(d => (
        <div key={d.course} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", width: 46, flexShrink: 0 }}>{d.course}</span>
          <div style={{ flex: 1, height: 10, background: "var(--border-light)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 5,
              background: d.rate >= 92 ? C.green : d.rate >= 89 ? C.blue : C.amber,
              width: `${d.rate}%`, transition: "width .5s",
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", width: 36, textAlign: "right" }}>{d.rate}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StudentsDashboard() {
  const [courseTab, setCourseTab] = useState("Overall");

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(59,130,246,.12)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} color={C.blue} />
            </span>
            Overview
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>
            Summary of enrollment, attendance and student insights
          </p>
        </div>

        {/* Right: Academic Year + User */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>Academic Year</p>
            <DropBtn label="2024 – 2025" />
          </div>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "rgba(238,162,58,.12)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative",
          }}>
            <Bell size={17} color={C.amber} />
            <span style={{
              position: "absolute", top: 6, right: 6, width: 8, height: 8,
              background: C.rose, borderRadius: "50%", border: "2px solid var(--bg-surface)",
            }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: "var(--bg-subtle)", borderRadius: 10, border: "1px solid var(--border-light)", cursor: "pointer" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <User size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Admin User</p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Administrator</p>
            </div>
            <ChevronDown size={13} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 16px", boxShadow: "var(--shadow-sm)",
      }}>
        {[
          { label: "Semester",         value: "All" },
          { label: "Course / Program", value: "All" },
          { label: "Region",           value: "All" },
          { label: "City / Municipality", value: "All" },
          { label: "Barangay",         value: "All" },
          { label: "Feeder School",    value: "All" },
          { label: "Gender",           value: "All" },
        ].map(f => (
          <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".4px" }}>{f.label}</span>
            <DropBtn label={f.value} small />
          </div>
        ))}
        <button style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8,
          cursor: "pointer", background: "rgba(239,68,68,.08)",
          border: "1.5px solid rgba(239,68,68,.2)", color: "#ef4444",
        }}>
          <RefreshCw size={12} /> Clear Filters
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <KpiCard icon={Users}        iconBg="rgba(59,130,246,.12)"  iconColor={C.blue}   label="Total Students"    value="2,843" sub="8.5% vs last year"   subUp={true}  />
        <KpiCard icon={UserPlus}     iconBg="rgba(34,197,94,.12)"   iconColor={C.green}  label="New Enrollees"     value="1,234" sub="12.4% vs last year"  subUp={true}  />
        <KpiCard icon={CalendarCheck} iconBg="rgba(238,162,58,.12)" iconColor={C.amber}  label="Attendance Rate"   value="92.6%" sub="1.8% vs last year"   subUp={false} />
        <KpiCard icon={GraduationCap} iconBg="rgba(99,102,241,.12)" iconColor={C.indigo} label="Top Course"        value="BSIT"  sub="28.4% of total"                    />
        <KpiCard icon={MapPin}       iconBg="rgba(244,63,94,.12)"   iconColor={C.rose}   label="Top Barangay"      value="Barangay 5" sub="312 students"                />
        <KpiCard icon={School}       iconBg="rgba(6,182,212,.12)"   iconColor={C.cyan}   label="Top Feeder School" value="Sapang HS"  sub="186 students"                />
      </div>

      {/* ── Row 2: Map + Course Demand ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}>

        <SCard title="Student Distribution Map" subtitle="Number of students by location">
          <DistributionMap />
        </SCard>

        <SCard
          title="Course Demand"
          subtitle="Enrollment per course"
          action={
            <div style={{ display: "flex", gap: 4 }}>
              <TabBtn label="Overall"     active={courseTab === "Overall"}     onClick={() => setCourseTab("Overall")} />
              <TabBtn label="By Location" active={courseTab === "By Location"} onClick={() => setCourseTab("By Location")} />
            </div>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "center" }}>
            {/* Bar chart */}
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={COURSE_BAR} barSize={22} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--border-light)" />
                  <XAxis dataKey="course" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTip />} cursor={{ fill: "rgba(59,130,246,.06)" }} />
                  <Bar dataKey="students" fill={C.blue} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Donut + legend */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ position: "relative", width: 140, height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={COURSE_DONUT} cx="50%" cy="50%" innerRadius={42} outerRadius={66}
                      startAngle={90} endAngle={-270} dataKey="value" paddingAngle={1.5}>
                      {COURSE_DONUT.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>Total</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>2,843</span>
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
                {COURSE_DONUT.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)" }}>{d.value}%</span>
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer" }}>
                View course details
              </button>
            </div>
          </div>
        </SCard>
      </div>

      {/* ── Row 3: Feeder Schools + Attendance Insights + Location vs Course ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1fr", gap: 16 }}>

        {/* Top Feeder Schools */}
        <SCard title="Top Feeder Schools" subtitle="by number of enrollees" noPad>
          <div style={{ padding: "0 18px 14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {["School Name", "Location", "Enrollees", "Top Course"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".4px",
                      padding: "14px 8px 10px 0", borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEEDER_SCHOOLS.map((s, i) => (
                  <tr key={i} style={{ borderBottom: i < FEEDER_SCHOOLS.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <td style={{ padding: "9px 8px 9px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: 12 }}>{s.name}</td>
                    <td style={{ padding: "9px 8px 9px 0", color: "var(--text-muted)", fontSize: 11 }}>{s.location}</td>
                    <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: "var(--text-primary)" }}>{s.enrollees}</td>
                    <td style={{ padding: "9px 0" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "rgba(59,130,246,.1)", color: C.blue }}>{s.topCourse}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              View all feeder schools
            </button>
          </div>
        </SCard>

        {/* Attendance Insights */}
        <SCard title="Attendance Insights">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

            {/* Over Time line */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 10px" }}>Attendance Rate Over Time</p>
              <div style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ATTENDANCE_OVER_TIME} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border-light)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[80, 100]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${v}%`} />
                    <Tooltip content={<ChartTip suffix="%" />} />
                    <Line type="monotone" dataKey="rate" stroke={C.blue} strokeWidth={2}
                      dot={{ r: 2.5, fill: C.blue, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Course horizontal bars */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 10px" }}>Attendance Rate by Course</p>
              <AttendanceByCourseBars />
            </div>

            {/* At-risk table */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: "0 0 10px" }}>Students at Risk (Low Attendance)</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["Student ID", "Course", "Attendance"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".3px", paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {AT_RISK.map((s, i) => (
                    <tr key={i} style={{ borderBottom: i < AT_RISK.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                      <td style={{ padding: "7px 0", color: "var(--text-primary)", fontWeight: 600, fontSize: 11 }}>{s.id}</td>
                      <td style={{ padding: "7px 4px" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "rgba(59,130,246,.1)", color: C.blue }}>{s.course}</span>
                      </td>
                      <td style={{ padding: "7px 0", fontWeight: 700, color: C.rose, fontSize: 11 }}>{s.attendance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                View all at-risk students
              </button>
            </div>
          </div>
        </SCard>

        {/* Location vs Course */}
        <SCard
          title="Location vs Course"
          subtitle="Top Courses per Location"
          action={<DropBtn label="Barangay 5" small />}
          noPad
        >
          <div style={{ padding: "0 18px 14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Course", "Number of Students", "Percentage"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: ".3px",
                      padding: "14px 8px 10px 0", borderBottom: "1px solid var(--border-light)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LOC_VS_COURSE.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < LOC_VS_COURSE.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <td style={{ padding: "9px 8px 9px 0", fontWeight: 700, color: "var(--text-primary)" }}>{r.course}</td>
                    <td style={{ padding: "9px 8px 9px 0", color: "var(--text-secondary)" }}>{r.students}</td>
                    <td style={{ padding: "9px 0", fontWeight: 700, color: C.blue }}>{r.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              View other locations
            </button>
          </div>
        </SCard>
      </div>

      {/* ── Row 4: Enrollment Trends + Course Growth + Gender ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: 16 }}>

        {/* Enrollment Trends */}
        <SCard title="Enrollment Trends" subtitle="Total enrollment over time">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ENROLLMENT_TREND} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip content={<ChartTip />} />
                <Line type="monotone" dataKey="students" stroke={C.blue} strokeWidth={2.5}
                  dot={{ r: 4, fill: C.blue, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: C.amber }}
                  label={({ x, y, value }) => (
                    <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--text-primary)">{value.toLocaleString()}</text>
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Course Growth Trends */}
        <SCard title="Course Growth Trends" subtitle="Enrollment per course over time">
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={COURSE_GROWTH} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {[
                  { key: "BSIT",   color: C.blue   },
                  { key: "BSBA",   color: C.cyan   },
                  { key: "BSED",   color: C.indigo },
                  { key: "BSN",    color: C.orange },
                  { key: "Others", color: C.slate  },
                ].map(l => (
                  <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2}
                    dot={{ r: 3, fill: l.color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SCard>

        {/* Enrollment by Gender */}
        <SCard title="Enrollment by Gender" subtitle="Distribution of students by gender">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={GENDER_DONUT} cx="50%" cy="50%" innerRadius={50} outerRadius={76}
                    startAngle={90} endAngle={-270} dataKey="value" paddingAngle={2}>
                    {GENDER_DONUT.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>2,843</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              {GENDER_DONUT.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    {d.count.toLocaleString()} <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>({d.value}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SCard>
      </div>
    </main>
  );
}
