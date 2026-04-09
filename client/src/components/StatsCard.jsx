import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function StatsCard({ label, value, change, accent, percentage, description, onClick }) {
  const up   = change?.startsWith("+");
  const down = change?.startsWith("-");

  // Donut chart data
  const pieData = percentage !== undefined ? [
    { name: "value", value: percentage },
    { name: "remaining", value: 100 - percentage },
  ] : [];

  return (
    <div
      className={`relative rounded-2xl p-3 sm:p-4 overflow-hidden transition-all duration-300 hover:shadow-lg stats-card ${onClick ? "cursor-pointer" : ""}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onClick={onClick}
    >
      {/* ── Top accent bar ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ 
          background: accent,
          boxShadow: `0 0 12px ${accent}40`,
        }}
      />

      {/* ── Left accent ── */}
      <div
        className="absolute left-0 top-2.5 bottom-2.5 w-[2px] rounded-r-full"
        style={{ 
          background: accent,
        }}
      />

      {/* ── Content ── */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p
              className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider mt-0.5 mb-1 truncate"
              style={{ color: "var(--text-secondary)" }}
            >
              {label}
            </p>

            <p
              className="text-[22px] sm:text-[26px] font-bold leading-tight mb-1 tabular-nums tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {value}
            </p>

            <div className="flex items-center gap-1.5">
              {(up || down) && (
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center"
                  style={{
                    background: up
                      ? "rgba(34,197,94,0.15)"
                      : down
                      ? "rgba(239,68,68,0.15)"
                      : "transparent",
                    color: up ? "#22c55e" : down ? "#ef4444" : "var(--text-muted)",
                  }}
                >
                  {up ? "↑" : "↓"}
                </span>
              )}
              <p
                className="text-[10px] sm:text-[11px] truncate"
                style={{ color: "var(--text-muted)" }}
              >
                {change}
              </p>
            </div>

            {description && (
              <p
                className="text-[9px] sm:text-[10px] mt-1.5 leading-snug"
                style={{ color: "var(--text-muted)", opacity: 0.75 }}
              >
                {description}
              </p>
            )}
          </div>

          {/* ── Donut Chart ── */}
          {percentage !== undefined && (
            <div className="relative flex-shrink-0" style={{ width: 48, height: 48 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={22}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell key="value" fill={accent} stroke="none" />
                    <Cell key="remaining" fill="var(--border-light)" stroke="none" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-[9px] font-bold"
                  style={{ color: accent }}
                >
                  {percentage}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}