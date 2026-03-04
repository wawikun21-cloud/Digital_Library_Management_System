import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from "recharts";
import StatsCard from "../components/StatsCard";

const STATS = [
  { label: "Total Books", value: "1,284", change: "+12 this month", accent: "#132F45", percentage: 85 },
  { label: "Borrowed",    value: "340",   change: "+5 today",        accent: "#EEA23A", percentage: 26 },
  { label: "Returned",    value: "920",   change: "+8 this week",    accent: "#32667F", percentage: 72 },
  { label: "Overdue",     value: "24",    change: "-3 from last week", accent: "#EA8B33", percentage: 2 },
];

const ACTIVITY = [
  { book: "Clean Code",               member: "Alice M.",  action: "Borrowed", date: "Feb 22" },
  { book: "The Pragmatic Programmer", member: "Bob K.",    action: "Returned", date: "Feb 21" },
  { book: "Design Patterns",          member: "Carol T.",  action: "Borrowed", date: "Feb 20" },
  { book: "Refactoring",              member: "David L.",  action: "Overdue",  date: "Feb 15" },
];

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

const TOP_BOOKS = [
  { title: "Clean Code",               author: "R. Martin",  borrows: 87, color: "#EEA23A" },
  { title: "The Pragmatic Programmer", author: "Hunt & Thomas", borrows: 74, color: "#32667F" },
  { title: "Design Patterns",          author: "GoF",        borrows: 61, color: "#132F45" },
  { title: "Refactoring",              author: "M. Fowler",  borrows: 55, color: "#EA8B33" },
  { title: "You Don't Know JS",        author: "K. Simpson", borrows: 48, color: "#32667F" },
];

const RETURN_RATE = 73; // percentage

const GENRE_DATA = [
  { genre: "Programming",  books: 420 },
  { genre: "Architecture", books: 210 },
  { genre: "Management",   books: 185 },
  { genre: "JavaScript",   books: 162 },
  { genre: "Design",       books: 148 },
  { genre: "Database",     books: 96  },
  { genre: "DevOps",       books: 63  },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-[11px] sm:text-[12px]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        color: "var(--text-primary)",
      }}
    >
      {label && (
        <p className="font-semibold mb-1.5 pb-1.5 border-b border-[var(--border-light)]"
          style={{ color: "var(--text-secondary)" }}>
          {label}
        </p>
      )}
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
          <span style={{ color: "var(--text-secondary)" }}>{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, children, icon, className = "" }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col flex-1 ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}>
          {icon && <span>{icon}</span>}
          {title}
        </h2>
      </div>
      <div className="px-3 py-4 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Badge({ children, type }) {
  const styles = {
    Borrowed: { bg: "rgba(238,162,58,0.15)", color: "#b87a1a" },
    Returned: { bg: "rgba(50,102,127,0.15)", color: "#32667F" },
    Overdue:  { bg: "rgba(234,139,51,0.15)", color: "#c05a0a" },
  };
  const style = styles[type] || styles.Borrowed;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ background: style.bg, color: style.color }}
    >
      {children}
    </span>
  );
}

/* ── Top Borrowed Books ──────────────────────── */
function TopBorrowedBooks() {
  const max = TOP_BOOKS[0].borrows;
  return (
    <ChartCard title="Top Borrowed Books" className="h-full">
      <div className="flex flex-col justify-evenly flex-1 px-1">
        {TOP_BOOKS.map((book, i) => (
          <div key={book.title} className="flex items-center gap-3">
            {/* Rank */}
            <span
              className="text-[11px] font-bold w-5 text-center flex-shrink-0"
              style={{ color: i === 0 ? "#EEA23A" : "var(--text-muted)" }}
            >
              {i + 1}
            </span>
            {/* Info + Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {book.title}
                </span>
                <span className="text-[11px] font-bold ml-2 flex-shrink-0" style={{ color: book.color }}>
                  {book.borrows}x
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(book.borrows / max) * 100}%`, background: book.color }}
                />
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{book.author}</span>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── Return Rate Radial Gauge ────────────────── */
function ReturnRateGauge() {
  const rate = RETURN_RATE;
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Only use top 180° arc (semicircle)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (rate / 100) * arcLength;

  return (
    <ChartCard title="Return Rate">
      <div className="flex flex-col items-center justify-center gap-2 py-1">
        <div className="relative" style={{ width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background arc */}
            <circle
              cx="80" cy="80" r={normalizedRadius}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={-(circumference - arcLength) / 2}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
            />
            {/* Value arc */}
            <circle
              cx="80" cy="80" r={normalizedRadius}
              fill="none"
              stroke="#32667F"
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={offset + (circumference - arcLength) / 2}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold leading-none" style={{ color: "#32667F" }}>{rate}%</span>
            <span className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>of borrowed</span>
          </div>
        </div>
        {/* Legend row */}
        <div className="flex gap-6 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#32667F" }} />
            <span style={{ color: "var(--text-secondary)" }}>Returned <strong style={{ color: "var(--text-primary)" }}>920</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--border-light)" }} />
            <span style={{ color: "var(--text-secondary)" }}>Pending <strong style={{ color: "var(--text-primary)" }}>260</strong></span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-4">

      {/* ── Row 1: 4 Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(stat => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            accent={stat.accent}
            percentage={stat.percentage}
          />
        ))}
      </div>

      {/* ── Row 2: Monthly (wide 3fr) + Pie (2fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ChartCard title="Monthly Borrowing Trends">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MONTHLY_DATA} barCategoryGap="30%" barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }} />
                <Bar dataKey="Borrowed" fill="#EEA23A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Returned" fill="#32667F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Book Status Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={STATUS_PIE} cx="50%" cy="45%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value">
                  {STATUS_PIE.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 3: Genre (2fr) + Weekly Area (3fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Books by Genre">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={GENRE_DATA} layout="vertical" barCategoryGap="25%">
                <CartesianGrid horizontal={false} stroke="var(--border-light)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="genre" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={82} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
                <Bar dataKey="books" fill="#132F45" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-3">
          <ChartCard title="Weekly Activity">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY_DATA}>
                <defs>
                  <linearGradient id="gradBorrowed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EEA23A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#EEA23A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32667F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#32667F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)", paddingTop: 8 }} />
                <Area type="monotone" dataKey="Borrowed" stroke="#EEA23A" strokeWidth={2} fill="url(#gradBorrowed)" dot={false} activeDot={{ r: 4, fill: "#EEA23A" }} />
                <Area type="monotone" dataKey="Returned" stroke="#32667F" strokeWidth={2} fill="url(#gradReturned)" dot={false} activeDot={{ r: 4, fill: "#32667F" }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 4: Top Borrowed Books (3fr) + Return Rate Gauge (2fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <TopBorrowedBooks />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <ReturnRateGauge />
        </div>
      </div>

      {/* ── Row 5: Audit Trail full width ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="px-5 sm:px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Audit Trail
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" aria-label="Audit Trail">
            <thead>
              <tr>
                {["Book", "Member", "Action", "Date"].map(h => (
                  <th
                    key={h}
                    scope="col"
                    className="text-left px-5 py-3 text-[10px] sm:text-[11px] font-medium uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVITY.map((row, i) => (
                <tr
                  key={i}
                  className="transition-all duration-200 hover:bg-[var(--bg-hover)]"
                  style={{ borderBottom: i < ACTIVITY.length - 1 ? "1px solid var(--border-light)" : "none" }}
                >
                  <td className="px-5 py-3 text-[12px] sm:text-[13px]" style={{ color: "var(--text-primary)" }}>
                    <span className="line-clamp-1">{row.book}</span>
                  </td>
                  <td className="px-5 py-3 text-[12px] sm:text-[13px]" style={{ color: "var(--text-primary)" }}>
                    <span className="line-clamp-1">{row.member}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge type={row.action}>{row.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[12px] sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
                    {row.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}