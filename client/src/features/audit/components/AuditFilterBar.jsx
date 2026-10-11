/**
 * features/audit/components/AuditFilterBar.jsx
 *
 * Entity / action / user / date-range filter card. Extracted from the
 * former pages/AuditLog.jsx.
 */

import { ENTITY_TYPES, ACTIONS } from "../constants/auditUi";
import { entityIcon, actionIcon } from "../utils/auditFormat";

export default function AuditFilterBar({ filters, onChange, onClear, activeFilterCount, loading }) {
  const labelStyle = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" };

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      borderRadius: "12px", padding: "16px 20px", marginBottom: "20px",
    }}>
      {/* Filter bar header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
            Filters
          </span>
          {activeFilterCount > 0 && (
            <span style={{
              background: "var(--accent-amber)", color: "#fff",
              borderRadius: "20px", padding: "1px 7px", fontSize: "11px", fontWeight: 700,
            }}>{activeFilterCount}</span>
          )}
          {/* AJAX fetch indicator — subtle spinner when loading due to filter change */}
          {loading && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              fontSize: "11px", color: "var(--text-muted)",
            }}>
              <span style={{
                display: "inline-block", width: "10px", height: "10px",
                border: "2px solid var(--border)",
                borderTop: "2px solid var(--accent-amber)",
                borderRadius: "50%", animation: "spin .6s linear infinite",
              }} />
              Searching…
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            className="audit-btn audit-btn-secondary"
            onClick={onClear}
            style={{ fontSize: "12px", padding: "4px 12px" }}
          >
            ✕ Clear all
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>

        {/* Entity Type — instant fetch on change */}
        <div>
          <label style={labelStyle}>Entity Type</label>
          <select
            className={`audit-filter-input${loading ? " audit-filter-loading" : ""}`}
            value={filters.entity_type}
            onChange={e => onChange("entity_type", e.target.value)}
          >
            <option value="">All entities</option>
            {ENTITY_TYPES.map(t => (
              <option key={t} value={t}>{entityIcon(t)} {t}</option>
            ))}
          </select>
        </div>

        {/* Action — instant fetch on change */}
        <div>
          <label style={labelStyle}>Action</label>
          <select
            className={`audit-filter-input${loading ? " audit-filter-loading" : ""}`}
            value={filters.action}
            onChange={e => onChange("action", e.target.value)}
          >
            <option value="">All actions</option>
            {ACTIONS.map(a => (
              <option key={a} value={a}>{actionIcon(a)} {a}</option>
            ))}
          </select>
        </div>

        {/* User — debounced */}
        <div>
          <label style={labelStyle}>User</label>
          <div style={{ position: "relative" }}>
            <input
              className="audit-filter-input"
              type="text"
              placeholder="Search username…"
              value={filters.user_username}
              onChange={e => onChange("user_username", e.target.value)}
              style={{ paddingRight: filters.user_username ? "28px" : "11px" }}
            />
            {/* Clear "×" button inside user field */}
            {filters.user_username && (
              <button
                onClick={() => onChange("user_username", "")}
                style={{
                  position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: "14px", lineHeight: 1,
                  padding: 0,
                }}
                title="Clear"
              >×</button>
            )}
          </div>
        </div>

        {/* Date From — debounced */}
        <div>
          <label style={labelStyle}>Date From</label>
          <input
            className="audit-filter-input"
            type="date"
            value={filters.date_from}
            onChange={e => onChange("date_from", e.target.value)}
          />
        </div>

        {/* Date To — debounced */}
        <div>
          <label style={labelStyle}>Date To</label>
          <input
            className="audit-filter-input"
            type="date"
            value={filters.date_to}
            onChange={e => onChange("date_to", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
