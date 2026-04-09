/**
 * client/src/pages/Dashboard.jsx
 *
 * Fully dynamic analytics dashboard.
 * — All hardcoded BORROWED_DATA / ATTENDANCE_DATA / FINES_DATA /
 *   OVERDUE_DATA arrays have been removed.
 * — Each chart widget fetches its own slice of data via useDashboard().
 * — KPI stats update in real time via Socket.io (useWebSocket).
 * — Loading skeletons + error banners shown while fetching.
 * — Holdings breakdown table with NEMCO vs Lexora progress bars (bottom).
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate }   from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Crown, Users, AlertTriangle, Calendar, RefreshCw, BookOpen, Library } from "lucide-react";
import StatsCard            from "../components/StatsCard";
import { useDashboard }     from "../hooks/useDashboard";
import { useWebSocket } from "../hooks/useWebsocket";

// ── Constants ─────────────────────────────────────────────────────────────────

const SEMESTERS = ["1st Sem", "2nd Sem"];

const SCHOOL_YEARS = ["2025–2026", "2024–2025", "2023–2024"];

const SEM_MONTHS = {
  "1st Sem": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  "2nd Sem": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
};

const RANK_COLORS = [
  "#EEA23A", "#32667F", "#132F45", "#276096", "#2d71b0",
  "#3a7a96", "#4290ae", "#5aa0bc", "#6dafc8", "#82bed4",
];

// Brand colours for the two collections
const NEMCO_COLOR  = "#132F45";
const LEXORA_COLOR = "#32667F";

// ── Shared formatting helpers ─────────────────────────────────────────────────

const fmtK    = v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v;
const fmtPeso = v => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`;

// ── Shared primitives ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", zIndex: 9999 }}>
      {label && (
        <p className="font-bold mb-1.5 pb-1.5 text-[11px] uppercase tracking-wide"
          style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map(p => (
          <p key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: p.fill || p.color || p.stroke }} />
              <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            </span>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>
              {prefix}{p.value?.toLocaleString()}{suffix}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, iconColor, iconBg, badge, children }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-md"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg }}>
              <Icon size={13} style={{ color: iconColor }} />
            </div>
          )}
          <h2 className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: "var(--text-secondary)" }}>
            {title}
          </h2>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatPills({ items }) {
  return (
    <div className="grid gap-2 px-4 py-2.5 flex-shrink-0"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderBottom: "1px solid var(--border-light)",
        background: "var(--bg-subtle)",
      }}>
      {items.map((s, i) => (
        <div key={i} className="flex flex-col items-center justify-center py-1.5 rounded-xl"
          style={{ background: s.bg }}>
          <span className="text-[14px] font-bold leading-none tabular-nums" style={{ color: s.color }}>
            {s.value}
          </span>
          <span className="text-[9px] font-semibold mt-0.5 text-center leading-tight" style={{ color: s.color }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Skeleton shimmer used while chart data is loading
function ChartSkeleton({ height = 200 }) {
  return (
    <div className="flex items-center justify-center animate-pulse"
      style={{ height, background: "var(--bg-subtle)", margin: "12px 16px", borderRadius: 12 }}>
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Loading…</span>
    </div>
  );
}

// Error banner shown when an API call fails
function ChartError({ message }) {
  return (
    <div className="flex items-center justify-center gap-2 m-4 p-3 rounded-xl"
      style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}>
      <AlertTriangle size={14} color="#dc2626" />
      <span className="text-[11px]" style={{ color: "#dc2626" }}>
        {message || "Failed to load data"}
      </span>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

function FilterBar({ schoolYear, onSchoolYear, semester, month, onSemester, onMonth, onRefresh }) {
  const months = ["All", ...SEM_MONTHS[semester]];
  return (
    <div className="rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2.5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center gap-1.5">
        <Calendar size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Filter
        </span>
      </div>

      {/* School Year */}
      <select
        value={schoolYear}
        onChange={e => { onSchoolYear(e.target.value); onMonth("All"); }}
        className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-150 outline-none cursor-pointer"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}>
        {SCHOOL_YEARS.map(sy => <option key={sy} value={sy}>{sy}</option>)}
      </select>

      <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Semester toggle */}
      <div className="flex gap-0.5 p-0.5 rounded-lg"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        {SEMESTERS.map(s => (
          <button key={s} onClick={() => { onSemester(s); onMonth("All"); }}
            className="px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150"
            style={{
              background: semester === s ? "var(--accent-amber)" : "transparent",
              color:      semester === s ? "#fff" : "var(--text-secondary)",
              boxShadow:  semester === s ? "0 2px 6px rgba(238,162,58,0.35)" : "none",
            }}>
            {s}
          </button>
        ))}
      </div>

      <div className="w-px h-4 flex-shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Month chips */}
      <div className="flex flex-wrap gap-1">
        {months.map(m => (
          <button key={m} onClick={() => onMonth(m)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-150"
            style={{
              background: month === m ? "var(--accent-amber)" : "var(--bg-subtle)",
              color:      month === m ? "#fff" : "var(--text-secondary)",
              border:     `1px solid ${month === m ? "var(--accent-amber)" : "var(--border-light)"}`,
              boxShadow:  month === m ? "0 2px 6px rgba(238,162,58,0.35)" : "none",
            }}>
            {m}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Refresh */}
      <button onClick={onRefresh}
        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", color: "var(--text-secondary)" }}
        title="Refresh data">
        <RefreshCw size={12} />
      </button>
    </div>
  );
}

// ── Chart Widgets ─────────────────────────────────────────────────────────────

// Medal colours for top 3
const MEDAL = [
  { bg: "rgba(255,193,7,0.15)",  border: "rgba(255,193,7,0.4)",  text: "#b8860b", label: "🥇" },
  { bg: "rgba(176,190,197,0.2)", border: "rgba(176,190,197,0.5)", text: "#546e7a", label: "🥈" },
  { bg: "rgba(188,143,71,0.15)", border: "rgba(188,143,71,0.4)", text: "#795548", label: "🥉" },
];

function MostBorrowedBooks({ data, loading, error }) {
  const total   = data.reduce((s, r) => s + r.borrows, 0);
  const maxBorrows = data.length > 0 ? data[0].borrows : 1;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(238,162,58,0.15)" }}
          >
            <Crown size={13} style={{ color: "#EEA23A" }} />
          </div>
          <div>
            <h2 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Top 10 Most Borrowed Books
            </h2>
          </div>
        </div>
        {/* Live badge */}
        <span
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(238,162,58,0.12)", color: "#b87a1a" }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "#EEA23A" }}
          />
          {loading ? "…" : `Top ${data.length}`}
        </span>
      </div>

      {/* ── Summary pills ── */}
      <div
        className="grid grid-cols-2 gap-2 px-4 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}
      >
        <div className="flex flex-col items-center py-1.5 rounded-xl" style={{ background: "rgba(238,162,58,0.1)" }}>
          <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: "#EEA23A" }}>
            {loading ? "—" : total.toLocaleString()}
          </span>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#EEA23A" }}>Total Borrows</span>
        </div>
        <div className="flex flex-col items-center py-1.5 rounded-xl" style={{ background: "rgba(50,102,127,0.1)" }}>
          <span className="text-[14px] font-bold tabular-nums leading-none" style={{ color: "#32667F" }}>
            {loading ? "—" : data.length}
          </span>
          <span className="text-[9px] font-semibold mt-0.5" style={{ color: "#32667F" }}>Titles Tracked</span>
        </div>
      </div>

      {/* ── Table body ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          /* Skeleton rows */
          <div className="flex flex-col">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 animate-pulse"
                style={{ borderBottom: "1px solid var(--border-light)" }}
              >
                <div className="w-6 h-6 rounded-lg flex-shrink-0" style={{ background: "var(--border)" }} />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 rounded-full w-3/4" style={{ background: "var(--border)" }} />
                  <div className="h-2 rounded-full w-1/2" style={{ background: "var(--border-light)" }} />
                </div>
                <div className="w-10 h-5 rounded-lg flex-shrink-0" style={{ background: "var(--border)" }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <ChartError message={error} />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>No borrow data available</span>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th
                  className="px-4 py-2 text-left text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)", width: 36 }}
                >
                  Rank
                </th>
                <th
                  className="px-2 py-2 text-left text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)" }}
                >
                  Title / Author
                </th>
                <th
                  className="px-4 py-2 text-right text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)", width: 64 }}
                >
                  Borrows
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((book, idx) => {
                const isTop3    = idx < 3;
                const medal     = MEDAL[idx];
                const rankColor = RANK_COLORS[idx % RANK_COLORS.length];
                const barPct    = maxBorrows > 0 ? (book.borrows / maxBorrows) * 100 : 0;
                const isEven    = idx % 2 === 0;

                return (
                  <tr
                    key={book.id ?? idx}
                    style={{
                      background: isEven ? "var(--bg-surface)" : "var(--bg-subtle)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = isEven ? "var(--bg-surface)" : "var(--bg-subtle)")}
                  >
                    {/* Rank badge */}
                    <td
                      className="px-4 py-2.5"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}
                    >
                      {isTop3 ? (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-extrabold"
                          style={{
                            background: medal.bg,
                            border:     `1px solid ${medal.border}`,
                            color:      medal.text,
                          }}
                        >
                          {medal.label}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold"
                          style={{
                            background: `${rankColor}15`,
                            color:      rankColor,
                          }}
                        >
                          {idx + 1}
                        </span>
                      )}
                    </td>

                    {/* Title + author + borrow bar */}
                    <td
                      className="px-2 py-2.5"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}
                    >
                      <p
                        className="text-[11px] font-semibold leading-tight truncate"
                        style={{ color: "var(--text-primary)", maxWidth: 160 }}
                        title={book.title}
                      >
                        {book.title}
                      </p>
                      {book.author && (
                        <p
                          className="text-[10px] mt-0.5 truncate"
                          style={{ color: "var(--text-muted)", maxWidth: 160 }}
                          title={book.author}
                        >
                          {book.author}
                        </p>
                      )}
                      {/* Thin rank bar */}
                      <div
                        className="mt-1.5 rounded-full overflow-hidden"
                        style={{ height: 3, background: "var(--bg-subtle)" }}
                      >
                        <div
                          style={{
                            width:      `${barPct}%`,
                            height:     "100%",
                            background: rankColor,
                            borderRadius: 9999,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </td>

                    {/* Borrow count */}
                    <td
                      className="px-4 py-2.5 text-right"
                      style={{ borderBottom: "1px solid var(--border-light)", verticalAlign: "middle" }}
                    >
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold tabular-nums"
                        style={{
                          background: `${rankColor}18`,
                          color:      rankColor,
                        }}
                      >
                        {book.borrows}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendanceCount({ data, loading, error, semester, month }) {
  const total = data.reduce((s, r) => s + r.visits, 0);
  const peak  = data.reduce((mx, r) => r.visits > mx.visits ? r : mx, { visits: 0, x: "—" });
  return (
    <Card
      title="Library Attendance"
      icon={Users}
      iconColor="#32667F"
      iconBg="rgba(50,102,127,0.15)"
    >
      <StatPills items={[
        { value: total.toLocaleString(), label: "Total Visits", color: "#32667F", bg: "rgba(50,102,127,0.1)" },
        { value: peak.x,                label: "Peak Period",  color: "#EEA23A", bg: "rgba(238,162,58,0.1)"  },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#32667F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#32667F" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" visits" />} wrapperStyle={{ zIndex: 9999 }} />
              <Area dataKey="visits" name="Visits" type="monotone"
                stroke="#32667F" strokeWidth={2} fill="url(#attGrad)" dot={{ r: 3, fill: "#32667F" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function TotalFinesCollected({ data, loading, error }) {
  const totCollected   = data.reduce((s, r) => s + r.collected,   0);
  const totUncollected = data.reduce((s, r) => s + r.uncollected, 0);
  return (
    <Card
      title="Fines Overview"
      icon={AlertTriangle}
      iconColor="#EA8B33"
      iconBg="rgba(234,139,51,0.15)"
    >
      <StatPills items={[
        { value: fmtPeso(totCollected),   label: "Collected",   color: "#32667F", bg: "rgba(50,102,127,0.1)"  },
        { value: fmtPeso(totUncollected), label: "Uncollected", color: "#c05a0a", bg: "rgba(234,139,51,0.1)"  },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="35%" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={36}
                tickFormatter={v => `₱${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
              <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: "var(--bg-hover)" }} wrapperStyle={{ zIndex: 9999 }} />
              <Legend iconType="circle" iconSize={7}
                wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }} />
              <Bar dataKey="collected"   name="Collected"   fill="#32667F" radius={[3, 3, 0, 0]} />
              <Bar dataKey="uncollected" name="Uncollected" fill="#EA8B33" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function OverdueBooks({ data, loading, error }) {
  const totCrit = data.reduce((s, r) => s + r.critical, 0);
  const totWarn = data.reduce((s, r) => s + r.warning,  0);
  const totMin  = data.reduce((s, r) => s + r.minor,    0);
  return (
    <Card
      title="Overdue Books"
      icon={AlertTriangle}
      iconColor="#dc2626"
      iconBg="rgba(220,38,38,0.12)"
    >
      <StatPills items={[
        { value: totCrit, label: "Critical", color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
        { value: totWarn, label: "Warning",  color: "#c05a0a", bg: "rgba(234,139,51,0.1)"  },
        { value: totMin,  label: "Minor",    color: "#b87a1a", bg: "rgba(238,162,58,0.1)"  },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="py-3 pl-1 pr-3" style={{ height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="35%" margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="x"
                tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={22} allowDecimals={false} />
              <Tooltip content={<ChartTooltip suffix=" books" />} cursor={{ fill: "var(--bg-hover)" }} wrapperStyle={{ zIndex: 9999 }} />
              <Legend iconType="circle" iconSize={7}
                wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }} />
              <Bar dataKey="critical" name="Critical" fill="#dc2626" stackId="o" radius={[0, 0, 0, 0]} />
              <Bar dataKey="warning"  name="Warning"  fill="#c05a0a" stackId="o" radius={[0, 0, 0, 0]} />
              <Bar dataKey="minor"    name="Minor"    fill="#EEA23A" stackId="o" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ── Holdings Breakdown ────────────────────────────────────────────────────────

function HoldingsBreakdown({ data: rawData, loading, error }) {
  const data        = Array.isArray(rawData) ? rawData : [];
  const totalNemco  = data.reduce((s, r) => s + r.nemco,  0);
  const totalLexora = data.reduce((s, r) => s + r.lexora, 0);
  const grandTotal  = totalNemco + totalLexora;

  // ── Skeleton rows
  function SkeletonRows() {
    return Array.from({ length: 6 }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-5 py-3.5" style={{ borderBottom: "1px solid var(--border-light)" }}>
          <div className="h-3 w-20 rounded-full" style={{ background: "var(--border)" }} />
        </td>
        {[1,2,3].map(j => (
          <td key={j} className="px-5 py-3.5 text-right" style={{ borderBottom: "1px solid var(--border-light)" }}>
            <div className="h-3 w-12 rounded-full ml-auto" style={{ background: "var(--border)" }} />
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        {/* Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(50,102,127,0.13)" }}
          >
            <Library size={15} style={{ color: LEXORA_COLOR }} />
          </div>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
              Books Total Holdings
            </h2>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              NEMCO &amp; Lexora — by Program / Category
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Grand Total</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {grandTotal.toLocaleString()}
            </span>
          </div>

          <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--border-light)" }} />

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(19,47,69,0.07)", border: "1px solid rgba(19,47,69,0.14)" }}
          >
            <BookOpen size={11} style={{ color: NEMCO_COLOR }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NEMCO_COLOR }}>NEMCO</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: NEMCO_COLOR }}>
              {totalNemco.toLocaleString()}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(50,102,127,0.08)", border: "1px solid rgba(50,102,127,0.18)" }}
          >
            <Library size={11} style={{ color: LEXORA_COLOR }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LEXORA_COLOR }}>LEXORA</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: LEXORA_COLOR }}>
              {totalLexora.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      {error ? (
        <ChartError message={error} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>

            {/* ── Column headers ── */}
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {/* # */}
                <th
                  className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", width: 42, borderBottom: "2px solid var(--border)" }}
                >
                  #
                </th>

                {/* Program / Category */}
                <th
                  className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border)" }}
                >
                  Program / Category
                </th>

                {/* NEMCO — split into two sub-cols via a grouped header */}
                <th
                  colSpan={2}
                  className="py-0 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: NEMCO_COLOR, borderBottom: "2px solid var(--border)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}
                >
                  <div
                    className="flex items-center justify-center gap-1.5 px-4 py-3"
                    style={{ borderBottom: `3px solid ${NEMCO_COLOR}` }}
                  >
                    <BookOpen size={11} />
                    NEMCO
                  </div>
                </th>

                {/* LEXORA — split into two sub-cols */}
                <th
                  colSpan={2}
                  className="py-0 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: LEXORA_COLOR, borderBottom: "2px solid var(--border)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}
                >
                  <div
                    className="flex items-center justify-center gap-1.5 px-4 py-3"
                    style={{ borderBottom: `3px solid ${LEXORA_COLOR}` }}
                  >
                    <Library size={11} />
                    LEXORA
                  </div>
                </th>

                {/* Row total */}
                <th
                  className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border)", borderLeft: "1px solid var(--border-light)" }}
                >
                  Total
                </th>
              </tr>

              {/* Sub-headers for count / share */}
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th style={{ borderBottom: "1px solid var(--border-light)" }} />
                <th style={{ borderBottom: "1px solid var(--border-light)" }} />

                <th
                  className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: NEMCO_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}
                >
                  Count
                </th>
                <th
                  className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: NEMCO_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)" }}
                >
                  Share
                </th>

                <th
                  className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: LEXORA_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}
                >
                  Count
                </th>
                <th
                  className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: LEXORA_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)" }}
                >
                  Share
                </th>

                <th style={{ borderBottom: "1px solid var(--border-light)", borderLeft: "1px solid var(--border-light)" }} />
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                    No holdings data available
                  </td>
                </tr>
              ) : (
                data.map((row, idx) => {
                  const rowTotal    = row.nemco + row.lexora;
                  const nemcoShare  = rowTotal > 0 ? ((row.nemco  / rowTotal) * 100).toFixed(1) : "0.0";
                  const lexoraShare = rowTotal > 0 ? ((row.lexora / rowTotal) * 100).toFixed(1) : "0.0";
                  const isEven      = idx % 2 === 0;

                  return (
                    <tr
                      key={row.category}
                      style={{
                        background: isEven ? "var(--bg-surface)" : "var(--bg-subtle)",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = isEven ? "var(--bg-surface)" : "var(--bg-subtle)")}
                    >
                      {/* Row number */}
                      <td
                        className="px-5 py-3.5 text-[11px] font-semibold tabular-nums"
                        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)" }}
                      >
                        {idx + 1}
                      </td>

                      {/* Category */}
                      <td
                        className="px-4 py-3.5"
                        style={{ borderBottom: "1px solid var(--border-light)" }}
                      >
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide"
                          style={{
                            background: "rgba(50,102,127,0.08)",
                            color:      "var(--text-primary)",
                            border:     "1px solid rgba(50,102,127,0.14)",
                          }}
                        >
                          {row.category}
                        </span>
                      </td>

                      {/* NEMCO Count */}
                      <td
                        className="px-4 py-3.5 text-center"
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          borderLeft:   `2px solid ${NEMCO_COLOR}22`,
                        }}
                      >
                        <span
                          className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                          style={{
                            background: row.nemco > 0 ? "rgba(19,47,69,0.07)" : "transparent",
                            color:      row.nemco > 0 ? NEMCO_COLOR : "var(--text-muted)",
                          }}
                        >
                          {row.nemco.toLocaleString()}
                        </span>
                      </td>

                      {/* NEMCO Share */}
                      <td
                        className="px-4 py-3.5 text-center"
                        style={{ borderBottom: "1px solid var(--border-light)" }}
                      >
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{ color: row.nemco > 0 ? NEMCO_COLOR : "var(--text-muted)", opacity: row.nemco > 0 ? 0.75 : 0.4 }}
                        >
                          {nemcoShare}%
                        </span>
                      </td>

                      {/* LEXORA Count */}
                      <td
                        className="px-4 py-3.5 text-center"
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          borderLeft:   `2px solid ${LEXORA_COLOR}22`,
                        }}
                      >
                        <span
                          className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                          style={{
                            background: row.lexora > 0 ? "rgba(50,102,127,0.08)" : "transparent",
                            color:      row.lexora > 0 ? LEXORA_COLOR : "var(--text-muted)",
                          }}
                        >
                          {row.lexora.toLocaleString()}
                        </span>
                      </td>

                      {/* LEXORA Share */}
                      <td
                        className="px-4 py-3.5 text-center"
                        style={{ borderBottom: "1px solid var(--border-light)" }}
                      >
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{ color: row.lexora > 0 ? LEXORA_COLOR : "var(--text-muted)", opacity: row.lexora > 0 ? 0.75 : 0.4 }}
                        >
                          {lexoraShare}%
                        </span>
                      </td>

                      {/* Row total */}
                      <td
                        className="px-5 py-3.5 text-right"
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          borderLeft:   "1px solid var(--border-light)",
                        }}
                      >
                        <span
                          className="text-[12px] font-extrabold tabular-nums"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {rowTotal.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* ── Footer totals ── */}
            {!loading && data.length > 0 && (
              <tfoot>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  <td style={{ borderTop: "2px solid var(--border)" }} />
                  <td
                    className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)", borderTop: "2px solid var(--border)" }}
                  >
                    Grand Total
                  </td>

                  {/* NEMCO total count */}
                  <td
                    className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}
                  >
                    <span
                      className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                      style={{ background: "rgba(19,47,69,0.1)", color: NEMCO_COLOR }}
                    >
                      {totalNemco.toLocaleString()}
                    </span>
                  </td>

                  {/* NEMCO grand share */}
                  <td
                    className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)" }}
                  >
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: NEMCO_COLOR, opacity: 0.75 }}>
                      {grandTotal > 0 ? ((totalNemco / grandTotal) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </td>

                  {/* LEXORA total count */}
                  <td
                    className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}
                  >
                    <span
                      className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                      style={{ background: "rgba(50,102,127,0.1)", color: LEXORA_COLOR }}
                    >
                      {totalLexora.toLocaleString()}
                    </span>
                  </td>

                  {/* LEXORA grand share */}
                  <td
                    className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)" }}
                  >
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: LEXORA_COLOR, opacity: 0.75 }}>
                      {grandTotal > 0 ? ((totalLexora / grandTotal) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </td>

                  {/* Grand total */}
                  <td
                    className="px-5 py-3.5 text-right"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: "1px solid var(--border-light)" }}
                  >
                    <span className="text-[13px] font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {grandTotal.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();

  // Filter state
  const [schoolYear, setSchoolYear] = useState(SCHOOL_YEARS[0]);
  const [semester,   setSemester]   = useState("2nd Sem");
  const [month,      setMonth]      = useState("All");

  // All data + loading/error via useDashboard
  const {
    kpiStats, mostBorrowed, attendance, fines, overdue,
    holdingsBreakdown,
    loading, errors,
    refresh, updateKpiStats,
  } = useDashboard({ schoolYear, semester, month });

  // Real-time updates via Socket.io
  const handleStatsUpdate = useCallback((newStats) => {
    updateKpiStats(newStats);
  }, [updateKpiStats]);

  useWebSocket({ onStatsUpdate: handleStatsUpdate });

  // KPI cards
  const stats = useMemo(() => {
    const pctOf = (n, total) => {
      if (!total) return undefined;
      return Math.max(0, Math.min(100, Math.round((n / total) * 100)));
    };

    if (!kpiStats) {
      return [
        { label: "NEMCO BOOKS",  value: "—", change: loading.kpiStats ? "Loading…" : "—", accent: "#132F45" },
        { label: "LEXORA BOOKS", value: "—", change: loading.kpiStats ? "Loading…" : "—", accent: "#32667F" },
        { label: "Out of Stock", value: "—", change: loading.kpiStats ? "Loading…" : "—", accent: "#dc2626" },
        { label: "Returned",     value: "—", change: loading.kpiStats ? "Loading…" : "—", accent: "#32667F" },
      ];
    }

    const { nemcoTotal = 0, lexoraTotal = 0, nemcoOutOfStock = 0, returned = 0 } = kpiStats;

    return [
      {
        label:      "NEMCO BOOKS",
        value:      Number(nemcoTotal).toLocaleString(),
        change:     "Live",
        accent:     "#132F45",
        percentage: nemcoTotal ? 100 : undefined,
        onClick:    () => navigate("/dashboard/books"),
      },
      {
        label:      "LEXORA BOOKS",
        value:      Number(lexoraTotal).toLocaleString(),
        change:     "Live",
        accent:     "#32667F",
        percentage: lexoraTotal ? 100 : undefined,
        onClick:    () => navigate("/dashboard/lexora-books"),
      },
      {
        label:      "Out of Stock",
        value:      Number(nemcoOutOfStock).toLocaleString(),
        change:     "Live",
        accent:     "#dc2626",
        percentage: pctOf(nemcoOutOfStock, nemcoTotal),
        onClick:    () => navigate("/dashboard/books?status=OutOfStock"),
      },
      {
        label:      "Returned",
        value:      Number(returned).toLocaleString(),
        change:     "Live",
        accent:     "#32667F",
        percentage: pctOf(returned, nemcoTotal),
        onClick:    () => navigate("/dashboard/borrowed?status=Returned"),
      },
    ];
  }, [kpiStats, loading.kpiStats, navigate]);

  return (
    <main className="flex flex-col gap-4 lg:gap-5" aria-label="Library Analytics Dashboard">
      <h1 className="sr-only">Analytics Dashboard Overview</h1>

      {/* KPI Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map(stat => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            accent={stat.accent}
            percentage={stat.percentage}
            onClick={stat.onClick}
          />
        ))}
      </section>

      {/* KPI error banner */}
      {errors.kpiStats && (
        <div className="rounded-xl p-3 flex items-center gap-2"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.18)" }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span className="text-[11px]" style={{ color: "#dc2626" }}>
            Stats unavailable: {errors.kpiStats}
          </span>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        schoolYear={schoolYear} onSchoolYear={sy => { setSchoolYear(sy); setMonth("All"); }}
        semester={semester}     onSemester={s  => { setSemester(s);   setMonth("All"); }}
        month={month}           onMonth={setMonth}
        onRefresh={refresh}
      />

      {/*
        Bento Grid — 5 columns, 3 rows
        Row 1: Most Borrowed (col 1-2) | Attendance (col 3-5)
        Row 2: Most Borrowed (col 1-2) | Fines      (col 3-5)
        Row 3: Overdue Books — spans all 5 columns
      */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        <div className="lg:col-start-1 lg:col-span-2 lg:row-start-1 lg:row-span-2">
          <MostBorrowedBooks
            data={mostBorrowed}
            loading={loading.charts}
            error={errors.mostBorrowed}
          />
        </div>

        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-1">
          <AttendanceCount
            data={attendance}
            loading={loading.charts}
            error={errors.attendance}
            semester={semester}
            month={month}
          />
        </div>

        <div className="lg:col-start-3 lg:col-span-3 lg:row-start-2">
          <TotalFinesCollected
            data={fines}
            loading={loading.charts}
            error={errors.fines}
            semester={semester}
            month={month}
          />
        </div>

        <div className="lg:col-start-1 lg:col-span-5 lg:row-start-3">
          <OverdueBooks
            data={overdue}
            loading={loading.charts}
            error={errors.overdue}
          />
        </div>

      </div>

      {/* ── Holdings Breakdown — always at the very bottom ── */}
      <HoldingsBreakdown
        data={holdingsBreakdown.data}
        loading={loading.holdingsBreakdown}
        error={errors.holdingsBreakdown}
      />

    </main>
  );
}