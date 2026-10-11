/**
 * features/analytics/components/book-dashboard/BookPieTooltip.jsx
 *
 * Recharts tooltip for the status donut. Extracted from the former
 * pages/BookDashboard.jsx (was `PieTooltip`).
 */

export default function BookPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "8px 12px", fontSize: 12, boxShadow: "var(--shadow-lg)",
    }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
        {data.status}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
        Count: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{data.count?.toLocaleString() ?? 0}</span>
      </p>
    </div>
  );
}
