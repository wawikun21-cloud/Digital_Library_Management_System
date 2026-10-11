/**
 * features/audit/components/AuditPagination.jsx
 *
 * Paginated navigation for the audit table. The page-window math that used
 * to be an IIFE inside the JSX now lives in utils/auditFormat.buildPageWindow.
 */

import { buildPageWindow } from "../utils/auditFormat";

export default function AuditPagination({ pagination, page, pageSize, onGoToPage }) {
  return (
    <div style={{
      padding: "14px 20px", borderTop: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        Showing {((pagination.page - 1) * pageSize) + 1}–{Math.min(pagination.page * pageSize, pagination.total)} of {pagination.total.toLocaleString()}
      </span>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        <button className="audit-page-btn" disabled={page <= 1} onClick={() => onGoToPage(page - 1)}>
          ‹ Prev
        </button>
        {buildPageWindow(pagination.totalPages, pagination.page).map(p => (
          <button key={p} className={`audit-page-btn${p === pagination.page ? " active" : ""}`} onClick={() => onGoToPage(p)}>
            {p}
          </button>
        ))}
        <button className="audit-page-btn" disabled={page >= pagination.totalPages} onClick={() => onGoToPage(page + 1)}>
          Next ›
        </button>
      </div>
    </div>
  );
}
