/**
 * features/analytics/components/chart/ChartCard.jsx
 *
 * Titled card shell for chart widgets. Extracted from the former
 * pages/Dashboard.jsx (was `Card`).
 */

export default function ChartCard({ title, icon: Icon, iconColor, iconBg, badge, children }) {
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-md"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-4 py-3 flex items-center justify-between gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: iconBg }}>
              <Icon size={13} style={{ color: iconColor }} />
            </div>
          )}
          <h2 className="text-[11px] font-bold uppercase tracking-wider truncate"
            style={{ color: "var(--text-secondary)" }}>
            {title}
          </h2>
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex flex-col flex-1 min-h-0">{children}</div>
    </div>
  );
}
