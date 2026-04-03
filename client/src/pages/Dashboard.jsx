/**
 * client/src/pages/Dashboard.jsx
 *
 * Fully dynamic analytics dashboard.
 * — All hardcoded BORROWED_DATA / ATTENDANCE_DATA / FINES_DATA /
 *   OVERDUE_DATA arrays have been removed.
 * — Each chart widget fetches its own slice of data via useDashboard().
 * — KPI stats update in real time via Socket.io (useWebSocket).
 * — Loading skeletons + error banners shown while fetching.
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate }   from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Crown, Users, AlertTriangle, Calendar, RefreshCw } from "lucide-react";
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
              background: month === m ? "#132F45" : "transparent",
              color:      month === m ? "#fff" : "var(--text-secondary)",
              border:     month === m ? "1px solid transparent" : "1px solid var(--border-light)",
            }}>
            {m}
          </button>
        ))}
      </div>

      <span className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
        style={{ background: "rgba(19,47,69,0.08)", color: "#132F45" }}>
        {schoolYear} · {semester}{month !== "All" ? ` · ${month}` : " · All Months"}
      </span>

      {/* Manual refresh */}
      <button onClick={onRefresh} title="Refresh all data"
        className="p-1.5 rounded-lg transition-all duration-150 hover:opacity-70"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <RefreshCw size={12} style={{ color: "var(--text-secondary)" }} />
      </button>
    </div>
  );
}

// ── Widget 1 — Most Borrowed ──────────────────────────────────────────────────

function MostBorrowedBooks({ data, loading, error }) {
  const sorted = useMemo(() =>
    [...(data || [])].sort((a, b) => b.borrows - a.borrows).slice(0, 10),
    [data]
  );
  const max   = sorted[0]?.borrows ?? 1;
  const total = sorted.reduce((s, d) => s + d.borrows, 0);

  return (
    <Card
      title="Top 10 Most Borrowed Books"
      icon={Crown}
      iconColor="#EEA23A"
      iconBg="rgba(238,162,58,0.12)"
      badge={{ label: `${total} total`, bg: "rgba(238,162,58,0.1)", color: "#b87a1a" }}
    >
      {loading ? (
        <ChartSkeleton height={320} />
      ) : error ? (
        <ChartError message={error} />
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-[11px]"
          style={{ color: "var(--text-muted)" }}>No borrow data for this period</div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 px-3 py-2 gap-0">
          {sorted.map((book, i) => {
            const pct   = Math.round((book.borrows / max) * 100);
            const color = RANK_COLORS[i];
            const isTop = i < 3;
            return (
              <div key={book.id || book.short}
                className="flex items-center gap-2 py-1.5"
                style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                <div className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: isTop ? color : "var(--bg-subtle)", border: isTop ? "none" : "1px solid var(--border-light)" }}>
                  <span className="text-[9px] font-bold leading-none tabular-nums"
                    style={{ color: isTop ? "#fff" : "var(--text-muted)" }}>
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[12px] font-semibold leading-none truncate"
                      style={{ color: "var(--text-primary)" }}>
                      {book.short}
                    </span>
                    <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color }}>
                      {book.borrows}
                    </span>
                  </div>
                  <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color, opacity: 0.85 }} />
                  </div>
                </div>
                <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                  style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Widget 2 — Attendance ─────────────────────────────────────────────────────

function AttendanceCount({ data, loading, error, semester, month }) {
  const total = (data || []).reduce((s, d) => s + (d.visits || 0), 0);
  const peak  = data?.length ? Math.max(...data.map(d => d.visits || 0)) : 0;

  return (
    <Card
      title="Attendance Count"
      icon={Users}
      iconColor="#32667F"
      iconBg="rgba(50,102,127,0.12)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(50,102,127,0.1)", color: "#32667F" }}
    >
      <StatPills items={[
        { value: total.toLocaleString(), label: "Total Visits", color: "#132F45", bg: "rgba(19,47,69,0.07)"  },
        { value: peak.toLocaleString(),  label: "Peak",         color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
      ]} />
      {loading ? (
        <ChartSkeleton />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="flex-1 min-h-0 py-3 pl-1 pr-3" style={{ minHeight: 150, maxHeight: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#32667F" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#32667F" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
              <XAxis dataKey="x" tick={{ fontSize: 9, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={44} />
              <YAxis tickFormatter={fmtK}
                tick={{ fontSize: 9, fill: "var(--text-secondary)", fontWeight: 600 }}
                axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<ChartTooltip suffix=" visits" />} wrapperStyle={{ zIndex: 9999 }} />
              <Area type="monotone" dataKey="visits" name="Visits"
                stroke="#32667F" strokeWidth={2} fill="url(#attGrad)"
                dot={{ r: 2.5, fill: "#32667F", strokeWidth: 0 }}
                activeDot={{ r: 4.5, fill: "#32667F", strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

// ── Widget 3 — Fines ─────────────────────────────────────────────────────────

function TotalFinesCollected({ data, loading, error, semester, month }) {
  const totCollect = (data || []).reduce((s, d) => s + (d.collected   || 0), 0);
  const totUnpaid  = (data || []).reduce((s, d) => s + (d.uncollected || 0), 0);
  const grand      = totCollect + totUnpaid || 1;
  const rate       = Math.round((totCollect / grand) * 100);

  const pieData = [
    { name: "Collected",   value: totCollect, color: "#32667F" },
    { name: "Uncollected", value: totUnpaid,  color: "#EEA23A" },
  ];

  const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="rounded-xl px-3 py-2.5 text-[11px]"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", zIndex: 9999 }}>
        <p className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.payload.color }} />
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</span>
        </p>
        <p className="font-bold text-[13px]" style={{ color: d.payload.color }}>
          ₱{d.value.toLocaleString()}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
          {((d.value / grand) * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  };

  return (
    <Card
      title="Total Fines Collected"
      icon={() => <span className="text-[12px] font-bold leading-none" style={{ color: "#132F45" }}>₱</span>}
      iconColor="#132F45"
      iconBg="rgba(19,47,69,0.1)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(19,47,69,0.08)", color: "#132F45" }}
    >
      <StatPills items={[
        { value: `₱${(totCollect / 1000).toFixed(1)}k`, label: "Collected",   color: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
        { value: `₱${(totUnpaid  / 1000).toFixed(1)}k`, label: "Uncollected", color: "#dc2626", bg: "rgba(220,38,38,0.07)"  },
        { value: `${rate}%`,                             label: "Rate",        color: "#32667F", bg: "rgba(50,102,127,0.08)" },
      ]} />

      {loading ? (
        <ChartSkeleton height={160} />
      ) : error ? (
        <ChartError message={error} />
      ) : (
        <div className="flex flex-1 min-h-0 items-center px-4 py-3 gap-4">
          {/* Donut */}
          <div className="relative flex-shrink-0" style={{ width: 150, height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius="58%" outerRadius="82%"
                  paddingAngle={3} startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<DonutTooltip />} wrapperStyle={{ zIndex: 9999 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[22px] font-bold leading-none tabular-nums" style={{ color: "#32667F" }}>
                {rate}%
              </span>
              <span className="text-[9px] font-semibold mt-0.5 text-center leading-tight" style={{ color: "var(--text-muted)" }}>
                collected
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col flex-1 gap-3 min-w-0">
            {pieData.map(entry => (
              <div key={entry.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {entry.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold tabular-nums flex-shrink-0" style={{ color: entry.color }}>
                    ₱{entry.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${(entry.value / grand) * 100}%`, background: entry.color }} />
                </div>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {((entry.value / grand) * 100).toFixed(1)}% of ₱{(grand / 1000).toFixed(1)}k total
                </span>
              </div>
            ))}
            <div className="pt-2 mt-auto" style={{ borderTop: "1px solid var(--border-light)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Total Fines Issued</span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  ₱{grand.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Widget 4 — Overdue ────────────────────────────────────────────────────────

function OverdueBooks({ data, loading, error }) {
  const totCrit = (data || []).reduce((s, d) => s + (d.critical || 0), 0);
  const totWarn = (data || []).reduce((s, d) => s + (d.warning  || 0), 0);
  const totMin  = (data || []).reduce((s, d) => s + (d.minor    || 0), 0);
  const grand   = totCrit + totWarn + totMin;

  return (
    <Card
      title="Overdue Books"
      icon={AlertTriangle}
      iconColor="#dc2626"
      iconBg="rgba(220,38,38,0.1)"
      badge={{ label: `${grand} total`, bg: "rgba(220,38,38,0.08)", color: "#dc2626" }}
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
    </main>
  );
}