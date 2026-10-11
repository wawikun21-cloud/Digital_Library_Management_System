/**
 * features/audit/components/AuditDetailModal.jsx
 *
 * Audit entry detail with before/after JSON diff. Extracted from the former
 * pages/AuditLog.jsx (was `DetailModal`).
 */

import AuditJsonBlock from "./AuditJsonBlock";
import { actionColor, entityIcon, actionIcon, formatDate } from "../utils/auditFormat";

export default function AuditDetailModal({ entry, onClose }) {
  if (!entry) return null;

  const ac = actionColor(entry.action);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: "14px",
        boxShadow: "var(--shadow-xl)",
        width: "100%", maxWidth: "640px", maxHeight: "90vh",
        overflow: "auto", padding: "28px",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "22px" }}>{entityIcon(entry.entity_type)}</span>
              <span style={{
                padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                background: ac.bg, color: ac.text,
              }}>
                {actionIcon(entry.action)} {entry.action}
              </span>
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              {entry.entity_type} {entry.entity_id ? `#${entry.entity_id}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--bg-subtle)", border: "none",
            borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
            fontSize: "18px", color: "var(--text-secondary)", lineHeight: 1,
          }}>×</button>
        </div>

        {/* Meta */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
          background: "var(--bg-subtle)", borderRadius: "8px",
          padding: "14px", marginBottom: "20px", fontSize: "13px",
        }}>
          {[
            ["Log ID",     `#${entry.id}`],
            ["User",       entry.user_username],
            ["Timestamp",  formatDate(entry.created_at)],
            ["IP Address", entry.ip_address || "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginBottom: "2px" }}>{label}</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* User Agent */}
        {entry.user_agent && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".04em" }}>
              User Agent
            </div>
            <div style={{
              fontSize: "11px", color: "var(--text-secondary)",
              background: "var(--bg-subtle)", padding: "8px", borderRadius: "6px",
              wordBreak: "break-all", border: "1px solid var(--border)",
            }}>
              {entry.user_agent}
            </div>
          </div>
        )}

        {/* Before / After */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <AuditJsonBlock data={entry.old_data} label="Before (old_data)" />
          <AuditJsonBlock data={entry.new_data} label="After (new_data)" />
        </div>
      </div>
    </div>
  );
}
