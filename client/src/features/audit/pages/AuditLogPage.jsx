/**
 * features/audit/pages/AuditLogPage.jsx
 *
 * Audit Trail — composition only.
 *
 * All data, fetching, debounced filtering and WebSocket handling live in
 * useAuditLog; presentation lives in the Audit* components. Replaces the
 * former pages/AuditLog.jsx.
 */

import "../auditLog.css";
import { useAuditLog } from "../hooks/useAuditLog";
import AuditToastStack from "../components/AuditToastStack";
import AuditDetailModal from "../components/AuditDetailModal";
import AuditFilterBar from "../components/AuditFilterBar";
import AuditLogTable from "../components/AuditLogTable";

export default function AuditLogPage() {
  const {
    logs, pagination, loading, error,
    filters, handleFilterChange, clearFilters, activeFilterCount,
    page, goToPage, handleRefresh, handleExport,
    toasts, dismissToast, newBadge,
    selectedEntry, setSelectedEntry,
  } = useAuditLog();

  return (
    <>
      {/* ── Toast notifications ── */}
      <AuditToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* ── Detail modal ── */}
      <AuditDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Audit Trail
              {newBadge > 0 && (
                <button onClick={handleRefresh} style={{
                  background: "var(--accent-amber)", color: "#fff", border: "none",
                  borderRadius: "20px", padding: "3px 10px", fontSize: "11px",
                  fontWeight: 700, cursor: "pointer",
                }}>
                  +{newBadge} new · Refresh
                </button>
              )}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
              Immutable history of all admin and staff actions across the library system.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button className="audit-btn audit-btn-ghost" onClick={handleRefresh}>
              ↻ Refresh
            </button>
            {/* <button className="audit-btn audit-btn-secondary" onClick={handleExport}>
              ↓ Export CSV
            </button> */}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <AuditFilterBar
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearFilters}
          activeFilterCount={activeFilterCount}
          loading={loading}
        />

        {/* ── Table Card ── */}
        <AuditLogTable
          logs={logs}
          loading={loading}
          error={error}
          pagination={pagination}
          activeFilterCount={activeFilterCount}
          page={page}
          onSelectEntry={setSelectedEntry}
          onGoToPage={goToPage}
        />

        {/* ── Footer note ── */}
        <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "16px" }}>
          Audit logs are retained for 1 year and purged automatically every day at 02:00.
          Records are immutable and cannot be manually edited or deleted.
        </p>
      </div>
    </>
  );
}
