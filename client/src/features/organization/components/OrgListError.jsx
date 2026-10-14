// ─────────────────────────────────────────────────────────
//  features/organization/components/OrgListError.jsx
//
//  Shared load-error + retry block for the organization pages —
//  one implementation instead of the same callout copy-pasted
//  into Schools / Departments / Categories.
// ─────────────────────────────────────────────────────────

import { AlertTriangle, RotateCw } from "lucide-react";

export default function OrgListError({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-xl border p-4 text-sm"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      <p className="flex items-start gap-2" style={{ color: "var(--accent-danger)" }}>
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {message}
      </p>
      <button type="button" onClick={onRetry} className="rp-btn rp-btn--secondary mt-3">
        <RotateCw size={14} aria-hidden="true" /> Retry
      </button>
    </div>
  );
}
