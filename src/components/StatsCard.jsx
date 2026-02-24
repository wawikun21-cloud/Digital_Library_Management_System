export default function StatsCard({ label, value, change, accent }) {
  const up   = change?.startsWith("+");
  const down = change?.startsWith("-");

  return (
    <div
      className="relative rounded-xl p-4 sm:p-5 overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-sm)",
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: accent }}
      />

      {/* Left accent glow */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full opacity-30"
        style={{ background: accent }}
      />

      <p
        className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mt-1 mb-2"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </p>

      <p
        className="text-[26px] sm:text-[30px] font-black leading-none mb-2 tabular-nums"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>

      <div className="flex items-center gap-1.5">
        {(up || down) && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
            style={{
              background: up
                ? "rgba(50,127,79,0.12)"
                : down
                ? "rgba(234,139,51,0.12)"
                : "transparent",
              color: up ? "#2d7a47" : down ? "#c05a0a" : "var(--text-muted)",
            }}
          >
            {up ? "▲" : "▼"}
          </span>
        )}
        <p
          className="text-[11px] sm:text-[12px]"
          style={{ color: "var(--text-muted)" }}
        >
          {change}
        </p>
      </div>
    </div>
  );
}