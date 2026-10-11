/**
 * features/analytics/components/chart/StatPills.jsx
 *
 * Row of coloured summary pills above a chart. Extracted from the former
 * pages/Dashboard.jsx (was `StatPills`).
 */

export default function StatPills({ items }) {
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
