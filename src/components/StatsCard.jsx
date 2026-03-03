import { useTilt } from "../hooks/useTilt";

export default function StatsCard({ label, value, change, accent }) {
  const up   = change?.startsWith("+");
  const down = change?.startsWith("-");

  const { ref, tiltProps, cardStyle, glare } = useTilt({
    maxTilt:      13,
    perspective:  700,
    glareOpacity: 0.10,
    scale:        1.035,
    transitionMs: 140,
  });

  return (
    <div
      ref={ref}
      {...tiltProps}
      className="relative rounded-xl p-4 sm:p-5 overflow-hidden cursor-default"
      style={{
        background: "var(--bg-surface)",
        border:     "1px solid var(--border)",
        boxShadow:  "var(--shadow-sm)",
        willChange: "transform",
        transformStyle: "preserve-3d",
        ...cardStyle,
      }}
    >
      {/* ── Glare overlay ── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glare.x} ${glare.y}, rgba(255,255,255,${glare.opacity * 2.5}) 0%, transparent 65%)`,
          transition: "opacity 200ms ease",
          zIndex: 10,
        }}
      />

      {/* ── Top accent bar ── */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl"
        style={{ background: accent }}
      />

      {/* ── Left accent glow ── */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full opacity-30"
        style={{ background: accent }}
      />

      {/* ── Content (slightly lifted in Z) ── */}
      <div style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}>
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
    </div>
  );
}
