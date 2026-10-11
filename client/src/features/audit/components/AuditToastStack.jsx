/**
 * features/audit/components/AuditToastStack.jsx
 *
 * Real-time audit event toasts (bottom-right stack). Extracted from the
 * former pages/AuditLog.jsx (was `AuditToast`).
 */

import { entityIcon, actionIcon } from "../utils/auditFormat";

export default function AuditToastStack({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderLeft: "4px solid var(--accent-amber)", borderRadius: "8px",
          padding: "10px 14px", boxShadow: "var(--shadow-lg)",
          display: "flex", alignItems: "center", gap: "10px",
          minWidth: "260px", maxWidth: "340px",
          animation: "slideIn .25s ease",
        }}>
          <span style={{ fontSize: "18px" }}>{entityIcon(t.entity_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>
              New Audit Event
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {actionIcon(t.action)} {t.user_username} · {t.action} · {t.entity_type}
            </div>
          </div>
          <button onClick={() => onDismiss(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: "16px", lineHeight: 1,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}
