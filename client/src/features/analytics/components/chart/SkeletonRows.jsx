/**
 * features/analytics/components/chart/SkeletonRows.jsx
 *
 * Skeleton rows for the holdings table while loading. Extracted from the
 * former pages/Dashboard.jsx (was `SkeletonRows`).
 */

export default function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} style={{ borderBottom: "1px solid var(--border-light)", padding: "14px 16px" }}>
              <div className="h-3 rounded-full" style={{ background: "var(--border)", width: j === 1 ? "60%" : "40%" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
