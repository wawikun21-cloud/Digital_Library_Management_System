/**
 * components/ui/TabButton.jsx
 *
 * Generic small toggle button for chart period/metric switchers.
 * Shared by the analytics and attendance features (was duplicated as
 * book-dashboard/TabButton and the attendance page's TabBtn).
 */

export default function TabButton({ label, active, onClick, activeBg = "#32667F" }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 13px", fontSize: 12, fontWeight: 600, borderRadius: 7, border: "none",
      cursor: "pointer", transition: "all .15s",
      background: active ? activeBg : "var(--bg-subtle)",
      color: active ? "#fff" : "var(--text-secondary)",
    }}>
      {label}
    </button>
  );
}
