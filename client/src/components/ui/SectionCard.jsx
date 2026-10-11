/**
 * components/ui/SectionCard.jsx
 *
 * Generic titled section shell with optional header action and info icon.
 * Shared by the analytics and attendance features (was duplicated as
 * book-dashboard/SectionCard and the attendance page's SCard).
 */

import { Info } from "lucide-react";

export default function SectionCard({ title, action, children, info }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", boxShadow: "var(--shadow-sm)",
    }}>
      <div style={{
        padding: "14px 18px", borderBottom: "1px solid var(--border-light)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{title}</span>
          {info && <Info size={12} style={{ color: "var(--text-muted)", cursor: "default" }} />}
        </div>
        {action}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}
