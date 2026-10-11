/**
 * features/analytics/components/chart/ChartSkeleton.jsx
 *
 * Loading placeholder for chart widgets. Extracted from the former
 * pages/Dashboard.jsx (was `ChartSkeleton`).
 */

export default function ChartSkeleton({ height = 200 }) {
  return (
    <div className="flex items-center justify-center animate-pulse"
      style={{ height, background: "var(--bg-subtle)", margin: "12px 16px", borderRadius: 12 }}>
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Loading…</span>
    </div>
  );
}
