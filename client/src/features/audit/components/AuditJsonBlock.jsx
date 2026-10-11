/**
 * features/audit/components/AuditJsonBlock.jsx
 *
 * Pretty-printed JSON block for the detail modal's before/after values.
 * Extracted from the former pages/AuditLog.jsx (was the nested `JsonBlock`).
 */

export default function AuditJsonBlock({ data, label }) {
  if (!data) return (
    <div style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "12px" }}>
      {label}: none
    </div>
  );
  let parsed = data;
  if (typeof data === "string") { try { parsed = JSON.parse(data); } catch (_) { parsed = data; } }
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".04em" }}>
        {label}
      </div>
      <pre style={{
        background: "var(--bg-subtle)", border: "1px solid var(--border)",
        borderRadius: "6px", padding: "10px", fontSize: "11px", lineHeight: 1.6,
        overflowX: "auto", maxHeight: "220px", overflowY: "auto",
        color: "var(--text-primary)", margin: 0,
      }}>
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}
