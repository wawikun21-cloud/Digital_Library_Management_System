/**
 * components/ui/KpiCard.jsx
 *
 * Generic KPI card: icon + label + value + optional sub-line.
 * Shared by the analytics and attendance features (was duplicated as
 * book-dashboard/BookKpiCard and the attendance page's KpiCard).
 */

export default function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 10, padding: "13px 15px", display: "flex",
      alignItems: "center", gap: 11, boxShadow: "0 1px 3px rgba(0,0,0,.05)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9, background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Icon size={18} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: "0 0 1px", fontSize: 10, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</p>
        <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>{sub}</p>}
      </div>
    </div>
  );
}
