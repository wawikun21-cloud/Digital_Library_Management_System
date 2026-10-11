/**
 * features/audit/components/AuditLogTable.jsx
 *
 * Table card: header info, error / empty states, shimmer skeleton, sticky
 * header, rows and pagination. Extracted from the former
 * pages/AuditLog.jsx (SkeletonRows stays local — used once, no state).
 */

import { PAGE_SIZE, TABLE_HEADERS } from "../constants/auditUi";
import { actionColor, entityIcon, actionIcon, formatDate } from "../utils/auditFormat";
import AuditPagination from "./AuditPagination";

// ── Shimmer skeleton row ──────────────────────────────────
function SkeletonRows({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid var(--border-light)" }}>
          {[48, 120, 96, 88, 64, 80, 88].map((w, j) => (
            <td key={j} style={{ padding: "14px 16px" }}>
              <div
                className="audit-shimmer"
                style={{
                  width: `${w}px`, height: "12px", borderRadius: "6px",
                  animationDelay: `${(i * 7 + j) * 40}ms`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function AuditLogTable({
  logs, loading, error, pagination, activeFilterCount, page, onSelectEntry, onGoToPage,
}) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "12px", overflow: "hidden",
    }}>
      {/* Table header info */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {loading
            ? "Fetching records…"
            : `${pagination.total.toLocaleString()} total record${pagination.total !== 1 ? "s" : ""}`}
        </span>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "32px", textAlign: "center", color: "#991b1b", background: "#fef2f2" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && logs.length === 0 && (
        <div style={{ padding: "60px 32px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🔍</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>No audit records found</div>
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {activeFilterCount > 0 ? "Try adjusting your filters." : "Audit events will appear here as actions are taken."}
          </div>
        </div>
      )}

      {/* ── Scrollable table with sticky header ── */}
      {!error && (logs.length > 0 || loading) && (
        <div className="audit-table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead className="audit-sticky-head">
              <tr>
                {TABLE_HEADERS.map(h => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontSize: "11px",
                    fontWeight: 700, color: "var(--text-secondary)",
                    textTransform: "uppercase", letterSpacing: ".04em",
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Shimmer skeleton while loading */}
              {loading && <SkeletonRows count={8} />}

              {/* Actual rows */}
              {!loading && logs.map((log, i) => {
                const ac = actionColor(log.action);
                return (
                  <tr
                    key={log.id}
                    className="audit-row"
                    style={{
                      borderBottom: i < logs.length - 1 ? "1px solid var(--border-light)" : "none",
                    }}
                    onClick={() => onSelectEntry(log)}
                  >
                    {/* ID */}
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "12px" }}>
                      #{log.id}
                    </td>

                    {/* Timestamp */}
                    <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "12px" }}>
                      {formatDate(log.created_at)}
                    </td>

                    {/* User */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{
                          width: "24px", height: "24px", borderRadius: "50%",
                          background: log.user_username === "system" ? "var(--text-muted)" : "var(--accent-amber)",
                          color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "10px", fontWeight: 700, flexShrink: 0,
                        }}>
                          {(log.user_username || "?")[0].toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {log.user_username}
                        </span>
                      </div>
                    </td>

                    {/* Entity */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{entityIcon(log.entity_type)}</span>
                        <span style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>
                          {log.entity_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    {/* Record ID */}
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                      {log.entity_id ?? <span style={{ fontStyle: "italic" }}>—</span>}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
                        fontWeight: 700, background: ac.bg, color: ac.text,
                        whiteSpace: "nowrap",
                      }}>
                        {actionIcon(log.action)} {log.action}
                      </span>
                    </td>

                    {/* IP */}
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11px", color: "var(--text-muted)" }}>
                      {log.ip_address || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && !error && pagination.totalPages > 1 && (
        <AuditPagination
          pagination={pagination}
          page={page}
          pageSize={PAGE_SIZE}
          onGoToPage={onGoToPage}
        />
      )}
    </div>
  );
}
