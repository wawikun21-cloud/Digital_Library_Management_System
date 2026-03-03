import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from "recharts";
import StatsCard from "../components/StatsCard";

const STATS = [
  { label: "Total Books", value: "1,284", change: "+12 this month", accent: "#132F45" },
  { label: "Borrowed",    value: "340",   change: "+5 today",        accent: "#EEA23A" },
  { label: "Returned",    value: "920",   change: "+8 this week",    accent: "#32667F" },
  { label: "Overdue",     value: "24",    change: "-3 from last week", accent: "#EA8B33" },
];

const ACTIVITY = [
  { book: "Clean Code",               member: "Alice M.",  action: "Borrowed", date: "Feb 22" },
  { book: "The Pragmatic Programmer", member: "Bob K.",    action: "Returned", date: "Feb 21" },
  { book: "Design Patterns",          member: "Carol T.",  action: "Borrowed", date: "Feb 20" },
  { book: "Refactoring",              member: "David L.",  action: "Overdue",  date: "Feb 15" },
];

const BADGE = {
  Borrowed: { bg: "rgba(238,162,58,0.15)", color: "#b87a1a" },
  Returned: { bg: "rgba(50,102,127,0.12)", color: "#32667F" },
  Overdue:  { bg: "rgba(234,139,51,0.15)", color: "#c05a0a" },
};

/* ── Chart data ────────────────────────────── */
const MONTHLY_DATA = [
  { month: "Sep", Borrowed: 48, Returned: 40 },
  { month: "Oct", Borrowed: 62, Returned: 55 },
  { month: "Nov", Borrowed: 53, Returned: 60 },
  { month: "Dec", Borrowed: 70, Returned: 65 },
  { month: "Jan", Borrowed: 58, Returned: 72 },
  { month: "Feb", Borrowed: 75, Returned: 68 },
];

const STATUS_PIE = [
  { name: "Available", value: 920 },
  { name: "Borrowed",  value: 340 },
  { name: "Overdue",   value: 24  },
];
const PIE_COLORS = ["#32667F", "#EEA23A", "#EA8B33"];

const WEEKLY_DATA = [
  { day: "Mon", Borrowed: 12, Returned: 9  },
  { day: "Tue", Borrowed: 18, Returned: 14 },
  { day: "Wed", Borrowed: 10, Returned: 16 },
  { day: "Thu", Borrowed: 22, Returned: 18 },
  { day: "Fri", Borrowed: 15, Returned: 11 },
  { day: "Sat", Borrowed: 8,  Returned: 6  },
  { day: "Sun", Borrowed: 5,  Returned: 4  },
];

const GENRE_DATA = [
  { genre: "Programming",  books: 420 },
  { genre: "Architecture", books: 210 },
  { genre: "Management",   books: 185 },
  { genre: "JavaScript",   books: 162 },
  { genre: "Design",       books: 148 },
  { genre: "Database",     books: 96  },
  { genre: "DevOps",       books: 63  },
];

/* ── Custom tooltip shared style ─────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-md)",
        color:      "var(--text-primary)",
      }}
    >
      {label && <p className="font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>}
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ── Shared card wrapper ─────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      <div
        className="px-4 sm:px-5 md:px-6 py-4 sm:py-5"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
      </div>
      <div className="px-2 sm:px-4 py-5">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {STATS.map(stat => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            accent={stat.accent}
          />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Bar Chart — Monthly Borrowing Trends */}
        <ChartCard title="Monthly Borrowing Trends">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY_DATA} barCategoryGap="30%" barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }}
              />
              <Bar dataKey="Borrowed" fill="#EEA23A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Returned" fill="#32667F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pie Chart — Book Status Distribution */}
        <ChartCard title="Book Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={STATUS_PIE}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {STATUS_PIE.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i]} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Area Chart — Weekly Activity */}
        <ChartCard title="Weekly Activity">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={WEEKLY_DATA}>
              <defs>
                <linearGradient id="gradBorrowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EEA23A" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EEA23A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReturned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#32667F" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#32667F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="Borrowed" stroke="#EEA23A" strokeWidth={2} fill="url(#gradBorrowed)" dot={false} activeDot={{ r: 4, fill: "#EEA23A" }} />
              <Area type="monotone" dataKey="Returned" stroke="#32667F" strokeWidth={2} fill="url(#gradReturned)" dot={false} activeDot={{ r: 4, fill: "#32667F" }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Horizontal Bar Chart — Books by Genre */}
        <ChartCard title="Books by Genre">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={GENRE_DATA} layout="vertical" barCategoryGap="25%">
              <CartesianGrid horizontal={false} stroke="var(--border-light)" />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="genre"
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                axisLine={false}
                tickLine={false}
                width={82}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
              <Bar dataKey="books" fill="#132F45" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── Recent Activity ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border:     "1px solid var(--border)",
          boxShadow:  "var(--shadow-sm)",
        }}
      >
        {/* Header */}
        <div
          className="px-4 sm:px-5 md:px-6 py-4 sm:py-5"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <h2 className="text-sm sm:text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Recent Activity
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm border-collapse"
            aria-label="Recent Activity"
          >
            <thead>
              <tr>
                {["Book", "Member", "Action", "Date"].map(h => (
                  <th
                    key={h}
                    scope="col"
                    className="text-left px-3 sm:px-4 md:px-5 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      color:        "var(--text-secondary)",
                      borderBottom: "1px solid var(--border-light)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVITY.map((row, i) => {
                const badge = BADGE[row.action];
                return (
                  <tr
                    key={i}
                    className="transition-colors duration-100"
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td
                      className="px-3 sm:px-4 md:px-5 py-3 text-[11px] sm:text-[12px] md:text-[13px]"
                      style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-light)" }}
                    >
                      <span className="line-clamp-1">{row.book}</span>
                    </td>
                    <td
                      className="px-3 sm:px-4 md:px-5 py-3 text-[11px] sm:text-[12px] md:text-[13px]"
                      style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-light)" }}
                    >
                      <span className="line-clamp-1">{row.member}</span>
                    </td>
                    <td
                      className="px-3 sm:px-4 md:px-5 py-3"
                      style={{ borderBottom: "1px solid var(--border-light)" }}
                    >
                      <span
                        className="inline-block text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 sm:py-0.5 py-0.5 rounded-full whitespace-nowrap"
                        style={badge}
                      >
                        {row.action}
                      </span>
                    </td>
                    <td
                      className="px-3 sm:px-4 md:px-5 py-3 text-[11px] sm:text-[12px] md:text-[13px]"
                      style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}
                    >
                      {row.date}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
