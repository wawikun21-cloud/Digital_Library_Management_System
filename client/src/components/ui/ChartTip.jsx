/**
 * components/ui/ChartTip.jsx
 *
 * Generic recharts tooltip. Shared by the analytics and attendance features
 * (was duplicated as book-dashboard/BookChartTip and the attendance page's
 * ChartTip).
 */

export default function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
      {label && <p style={{ color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, fontSize: 11 }}>{label}</p>}
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
          <span style={{ color: p.fill || p.stroke, marginRight: 6 }}>●</span>
          {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
}
