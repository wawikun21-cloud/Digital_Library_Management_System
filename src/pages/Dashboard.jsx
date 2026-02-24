import StatsCard from "../components/StatsCard";

const STATS = [
  { label: "Total Books", value: "1,284", change: "+12 this month", accent: "#132F45" },
  { label: "Borrowed", value: "340", change: "+5 today", accent: "#EEA23A" },
  { label: "Returned", value: "920", change: "+8 this week", accent: "#32667F" },
  { label: "Overdue", value: "24", change: "-3 from last week", accent: "#EA8B33" },
];

const ACTIVITY = [
  { book: "Clean Code", member: "Alice M.", action: "Borrowed", date: "Feb 22" },
  { book: "The Pragmatic Programmer", member: "Bob K.", action: "Returned", date: "Feb 21" },
  { book: "Design Patterns", member: "Carol T.", action: "Borrowed", date: "Feb 20" },
  { book: "Refactoring", member: "David L.", action: "Overdue", date: "Feb 15" },
];

const BADGE = {
  Borrowed: { bg: "rgba(238,162,58,0.15)", color: "#b87a1a" },
  Returned: { bg: "rgba(50,102,127,0.12)", color: "#32667F" },
  Overdue: { bg: "rgba(234,139,51,0.15)", color: "#c05a0a" },
};

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats Grid - Mobile-First Responsive ── */}
      {/* Mobile: 1 col, sm: 2 cols, lg: 3 cols, 2xl: 4 cols */}
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

      {/* ── Recent Activity - Responsive Card Layout ── */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
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

        {/* Activity Table - Scrollable on Mobile, Full on Desktop */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {["Book", "Member", "Action", "Date"].map(h => (
                  <th
                    key={h}
                    className="text-left px-3 sm:px-4 md:px-5 py-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      color: "var(--text-secondary)",
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