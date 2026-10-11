/**
 * features/analytics/components/chart/ChartTooltip.jsx
 *
 * Recharts tooltip with prefix/suffix support. Extracted from the former
 * pages/Dashboard.jsx (was `ChartTooltip`).
 */

export default function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
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
