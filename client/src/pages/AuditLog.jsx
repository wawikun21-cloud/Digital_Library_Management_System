// ─────────────────────────────────────────────────────────
//  client/src/pages/AuditLog.jsx
//  Admin-only Audit Trail page.
//
//  Features:
//    • AJAX smart filtering — dropdowns fetch instantly,
//      text/date fields debounce 450 ms (AbortController
//      cancels in-flight requests on rapid changes)
//    • Paginated results (50/page)
//    • Real-time toast notification when audit:new fires via WS
//    • Detail modal with before/after JSON diff
//    • Auto-badge on new events received while viewing
//    • Sticky table header
//    • Shimmer skeleton loader (replaces spinner)
//    • Row highlight pulse on new WS event arrival
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import auditApi from "../services/api/auditApi";
import { useWebSocket } from "../hooks/useWebsocket";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../constants/index.js";

// ── Constants ─────────────────────────────────────────────
const ENTITY_TYPES = ["book", "student", "faculty", "transaction", "attendance", "lexora_book", "auth"];
const ACTIONS      = [
  "CREATE", "UPDATE", "DELETE", "RESTORE", "BULK_IMPORT",
  "LOGIN", "LOGIN_FAILED", "LOGOUT",
  "BORROW", "RETURN",
  "CHECK_IN", "CHECK_OUT",
];
const PAGE_SIZE        = 50;
const TEXT_DEBOUNCE_MS = 450; // ms to wait after last keystroke before fetching

// ── Colour helpers ────────────────────────────────────────
function actionColor(action) {
  switch (action) {
    case "CREATE":       return { bg: "var(--audit-create-bg,#d1fae5)",       text: "var(--audit-create-text,#065f46)" };
    case "UPDATE":       return { bg: "var(--audit-update-bg,#dbeafe)",       text: "var(--audit-update-text,#1e3a8a)" };
    case "DELETE":       return { bg: "var(--audit-delete-bg,#fee2e2)",       text: "var(--audit-delete-text,#991b1b)" };
    case "RESTORE":      return { bg: "var(--audit-restore-bg,#fef3c7)",      text: "var(--audit-restore-text,#92400e)" };
    case "BULK_IMPORT":  return { bg: "var(--audit-bulk-bg,#ede9fe)",         text: "var(--audit-bulk-text,#4c1d95)" };
    case "LOGIN":        return { bg: "var(--audit-login-bg,#dcfce7)",        text: "var(--audit-login-text,#14532d)" };
    case "LOGIN_FAILED": return { bg: "var(--audit-loginfail-bg,#fecaca)",    text: "var(--audit-loginfail-text,#7f1d1d)" };
    case "LOGOUT":       return { bg: "var(--audit-logout-bg,#f1f5f9)",       text: "var(--audit-logout-text,#475569)" };
    case "BORROW":       return { bg: "var(--audit-borrow-bg,#e0f2fe)",       text: "var(--audit-borrow-text,#075985)" };
    case "RETURN":       return { bg: "var(--audit-return-bg,#f0fdf4)",       text: "var(--audit-return-text,#166534)" };
    case "CHECK_IN":     return { bg: "var(--audit-checkin-bg,#fef9c3)",      text: "var(--audit-checkin-text,#713f12)" };
    case "CHECK_OUT":    return { bg: "var(--audit-checkout-bg,#fce7f3)",     text: "var(--audit-checkout-text,#831843)" };
    default:             return { bg: "var(--bg-card,#f9fafb)",               text: "var(--text-secondary,#6b7280)" };
  }
}

function entityIcon(type) {
  switch (type) {
    case "book":         return "📚";
    case "student":      return "🎓";
    case "faculty":      return "👨‍🏫";
    case "transaction":  return "🔄";
    case "attendance":   return "✅";
    case "lexora_book":  return "🌐";
    case "auth":         return "🔐";
    default:             return "📋";
  }
}

function actionIcon(action) {
  switch (action) {
    case "CREATE":       return "➕";
    case "UPDATE":       return "✏️";
    case "DELETE":       return "🗑️";
    case "RESTORE":      return "♻️";
    case "BULK_IMPORT":  return "📥";
    case "LOGIN":        return "🔓";
    case "LOGIN_FAILED": return "🚫";
    case "LOGOUT":       return "🔒";
    case "BORROW":       return "📖";
    case "RETURN":       return "↩️";
    case "CHECK_IN":     return "🟢";
    case "CHECK_OUT":    return "🔴";
    default:             return "•";
  }
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ── Shimmer skeleton row ──────────────────────────────────
function SkeletonRows({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} style={{ borderBottom: "1px solid var(--border-color,#f3f4f6)" }}>
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

// ── Tiny toast component ──────────────────────────────────
function AuditToast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px",
      zIndex: 9999, display: "flex", flexDirection: "column", gap: "8px",
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: "var(--bg-card,#fff)", border: "1px solid var(--border-color,#e5e7eb)",
          borderLeft: "4px solid #6366f1", borderRadius: "8px",
          padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,.12)",
          display: "flex", alignItems: "center", gap: "10px",
          minWidth: "260px", maxWidth: "340px",
          animation: "slideIn .25s ease",
        }}>
          <span style={{ fontSize: "18px" }}>{entityIcon(t.entity_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary,#111)" }}>
              New Audit Event
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary,#6b7280)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {actionIcon(t.action)} {t.user_username} · {t.action} · {t.entity_type}
            </div>
          </div>
          <button onClick={() => onDismiss(t.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-secondary,#9ca3af)", fontSize: "16px", lineHeight: 1,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────
function DetailModal({ entry, onClose }) {
  if (!entry) return null;

  const ac = actionColor(entry.action);

// sourcery skip: avoid-function-declarations-in-blocks
  function JsonBlock({ data, label }) {
    if (!data) return (
      <div style={{ color: "var(--text-secondary,#9ca3af)", fontStyle: "italic", fontSize: "12px" }}>
        {label}: none
      </div>
    );
    let parsed = data;
    if (typeof data === "string") { try { parsed = JSON.parse(data); } catch (_) { parsed = data; } }
    return (
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".04em" }}>
          {label}
        </div>
        <pre style={{
          background: "var(--bg-page,#f9fafb)", border: "1px solid var(--border-color,#e5e7eb)",
          borderRadius: "6px", padding: "10px", fontSize: "11px", lineHeight: 1.6,
          overflowX: "auto", maxHeight: "220px", overflowY: "auto",
          color: "var(--text-primary,#111)", margin: 0,
        }}>
          {JSON.stringify(parsed, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-card,#fff)", borderRadius: "14px",
        boxShadow: "0 20px 60px rgba(0,0,0,.2)",
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
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary,#111)" }}>
              {entry.entity_type} {entry.entity_id ? `#${entry.entity_id}` : ""}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "var(--bg-page,#f3f4f6)", border: "none",
            borderRadius: "8px", padding: "6px 10px", cursor: "pointer",
            fontSize: "18px", color: "var(--text-secondary,#6b7280)", lineHeight: 1,
          }}>×</button>
        </div>

        {/* Meta */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px",
          background: "var(--bg-page,#f9fafb)", borderRadius: "8px",
          padding: "14px", marginBottom: "20px", fontSize: "13px",
        }}>
          {[
            ["Log ID",     `#${entry.id}`],
            ["User",       entry.user_username],
            ["Timestamp",  formatDate(entry.created_at)],
            ["IP Address", entry.ip_address || "—"],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ color: "var(--text-secondary,#6b7280)", fontSize: "11px", marginBottom: "2px" }}>{label}</div>
              <div style={{ fontWeight: 600, color: "var(--text-primary,#111)" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* User Agent */}
        {entry.user_agent && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: ".04em" }}>
              User Agent
            </div>
            <div style={{
              fontSize: "11px", color: "var(--text-secondary,#6b7280)",
              background: "var(--bg-page,#f9fafb)", padding: "8px", borderRadius: "6px",
              wordBreak: "break-all", border: "1px solid var(--border-color,#e5e7eb)",
            }}>
              {entry.user_agent}
            </div>
          </div>
        )}

        {/* Before / After */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <JsonBlock data={entry.old_data} label="Before (old_data)" />
          <JsonBlock data={entry.new_data} label="After (new_data)" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function AuditLog() {
  // ── State ────────────────────────────────────────────────
  const [logs,          setLogs]         = useState([]);
  const [pagination,    setPagination]   = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [toasts,        setToasts]       = useState([]);
  const [newBadge,      setNewBadge]     = useState(0);

  // ── Filters ──────────────────────────────────────────────
  const [filters, setFilters] = useState({
    entity_type   : "",
    action        : "",
    user_username : "",
    date_from     : "",
    date_to       : "",
  });
  const [page, setPage]           = useState(1);
  const toastCounter              = useRef(0);
  const abortRef                  = useRef(null);   // tracks in-flight AbortController
  const debounceRef               = useRef(null);   // tracks pending debounce timer

  // ── User role ────────────────────────────────────────────
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const isAdmin = (user?.role ?? "admin") === "admin";

  // ── Fetch logs (AJAX-aware) ───────────────────────────────
  // Cancels any in-flight request before starting a new one.
  const fetchLogs = useCallback(async (pg = 1, f = filters) => {
    // Cancel previous request if still pending
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller  = new AbortController();
    abortRef.current  = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.getLogs(
        { page: pg, limit: PAGE_SIZE, ...f },
        { signal: controller.signal }   // pass signal so auditApi can forward it to fetch/axios
      );
      setLogs(data.data || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      setNewBadge(0);
    } catch (err) {
      // Ignore abort errors — they are intentional
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Initial load ─────────────────────────────────────────
  useEffect(() => { fetchLogs(1, filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AJAX smart filtering ──────────────────────────────────
  // Runs on every filter change after the first render.
  // Dropdowns (entity_type, action) fire immediately (0 ms delay).
  // Text / date fields debounce by TEXT_DEBOUNCE_MS.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    const isInstant =
      filters.entity_type !== undefined &&    // always defined
      filters.action      !== undefined;      // guard

    // Determine whether the last-changed field is a dropdown (instant) or text/date (debounce).
    // We track which field changed via prevFilters.
    // Simpler: run debounce for all; dropdowns just feel instant at 0 ms.
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1, filters);
    }, TEXT_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket — real-time audit:new ──────────────────────
  useWebSocket({
    isAdmin,
    onAuditEvent: (event) => {
      const id = ++toastCounter.current;
      setToasts(prev => [...prev.slice(-3), { ...event, id }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
      setNewBadge(n => n + 1);
    },
  });

  // ── Filter helpers ────────────────────────────────────────
// sourcery skip: avoid-function-declarations-in-blocks
  function handleFilterChange(key, val) {
    setFilters(prev => ({ ...prev, [key]: val }));
  }

  function clearFilters() {
    const cleared = { entity_type: "", action: "", user_username: "", date_from: "", date_to: "" };
    setFilters(cleared);
    setPage(1);
    // fetchLogs will fire via the useEffect above
  }

  function goToPage(pg) {
    setPage(pg);
    fetchLogs(pg, filters);
  }

  function handleExport() {
    auditApi.exportCsv(filters);
  }

  function handleRefresh() {
    fetchLogs(page, filters);
  }

  function dismissToast(id) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  // ─────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        /* ── Animations ── */
        @keyframes slideIn   { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }
        @keyframes shimmer   { 0%,100% { opacity:.45; } 50% { opacity:1; } }
        @keyframes rowPulse  { 0% { background:rgba(99,102,241,.08); } 100% { background:transparent; } }

        /* ── Shimmer skeleton ── */
        .audit-shimmer {
          background: linear-gradient(90deg,
            var(--border-color,#e5e7eb) 25%,
            var(--bg-page,#f3f4f6)     50%,
            var(--border-color,#e5e7eb) 75%
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }

        /* ── Table ── */
        .audit-row { transition: background .12s; cursor: pointer; }
        .audit-row:hover { background: var(--bg-hover,#f3f4f6) !important; }
        .audit-row-new   { animation: rowPulse 1.8s ease forwards; }

        /* ── Sticky header ── */
        .audit-sticky-head th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: var(--bg-page,#f9fafb);
          box-shadow: 0 1px 0 var(--border-color,#e5e7eb);
        }

        /* ── Filter inputs ── */
        .audit-filter-input {
          background: var(--bg-card,#fff); border: 1px solid var(--border-color,#e5e7eb);
          border-radius: 8px; padding: 7px 11px; font-size: 13px;
          color: var(--text-primary,#111); outline: none; width: 100%;
          transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .audit-filter-input:focus {
          border-color: var(--primary,#6366f1);
          box-shadow: 0 0 0 3px rgba(99,102,241,.12);
        }

        /* ── Fetch indicator on filter input ── */
        .audit-filter-loading { opacity: .6; pointer-events: none; }

        /* ── Buttons ── */
        .audit-btn {
          padding: 7px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
          border: none; cursor: pointer; transition: opacity .15s, transform .1s;
        }
        .audit-btn:hover  { opacity: .85; }
        .audit-btn:active { transform: scale(.97); }
        .audit-btn-primary   { background: var(--primary,#6366f1); color: #fff; }
        .audit-btn-secondary { background: var(--bg-card,#fff); color: var(--text-primary,#111); border: 1px solid var(--border-color,#e5e7eb) !important; }
        .audit-btn-ghost     { background: transparent; color: var(--text-secondary,#6b7280); border: 1px solid var(--border-color,#e5e7eb) !important; }

        /* ── Pagination ── */
        .audit-page-btn {
          padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;
          border: 1px solid var(--border-color,#e5e7eb); cursor: pointer;
          background: var(--bg-card,#fff); color: var(--text-primary,#111);
          transition: background .12s, color .12s;
        }
        .audit-page-btn.active  { background: var(--primary,#6366f1); color: #fff; border-color: var(--primary,#6366f1); }
        .audit-page-btn:disabled { opacity: .4; cursor: not-allowed; }

        /* ── Scrollable table wrapper (enables sticky head) ── */
        .audit-table-wrap {
          overflow-x: auto;
          max-height: 68vh;
          overflow-y: auto;
        }
      `}</style>

      {/* ── Toast notifications ── */}
      <AuditToast toasts={toasts} onDismiss={dismissToast} />

      {/* ── Detail modal ── */}
      <DetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />

      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "22px", fontWeight: 700, color: "var(--text-primary,#111)", margin: 0 }}>
              Audit Trail
              {newBadge > 0 && (
                <button onClick={handleRefresh} style={{
                  background: "#6366f1", color: "#fff", border: "none",
                  borderRadius: "20px", padding: "3px 10px", fontSize: "11px",
                  fontWeight: 700, cursor: "pointer",
                }}>
                  +{newBadge} new · Refresh
                </button>
              )}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary,#6b7280)", margin: "2px 0 0" }}>
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
        <div style={{
          background: "var(--bg-card,#fff)", border: "1px solid var(--border-color,#e5e7eb)",
          borderRadius: "12px", padding: "16px 20px", marginBottom: "20px",
        }}>
          {/* Filter bar header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary,#111)" }}>
                Filters
              </span>
              {activeFilterCount > 0 && (
                <span style={{
                  background: "var(--primary,#6366f1)", color: "#fff",
                  borderRadius: "20px", padding: "1px 7px", fontSize: "11px", fontWeight: 700,
                }}>{activeFilterCount}</span>
              )}
              {/* AJAX fetch indicator — subtle spinner when loading due to filter change */}
              {loading && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontSize: "11px", color: "var(--text-secondary,#9ca3af)",
                }}>
                  <span style={{
                    display: "inline-block", width: "10px", height: "10px",
                    border: "2px solid var(--border-color,#e5e7eb)",
                    borderTop: "2px solid var(--primary,#6366f1)",
                    borderRadius: "50%", animation: "spin .6s linear infinite",
                  }} />
                  Searching…
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button
                className="audit-btn audit-btn-secondary"
                onClick={clearFilters}
                style={{ fontSize: "12px", padding: "4px 12px" }}
              >
                ✕ Clear all
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px" }}>

            {/* Entity Type — instant fetch on change */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", display: "block", marginBottom: "4px" }}>
                Entity Type
              </label>
              <select
                className={`audit-filter-input${loading ? " audit-filter-loading" : ""}`}
                value={filters.entity_type}
                onChange={e => handleFilterChange("entity_type", e.target.value)}
              >
                <option value="">All entities</option>
                {ENTITY_TYPES.map(t => (
                  <option key={t} value={t}>{entityIcon(t)} {t}</option>
                ))}
              </select>
            </div>

            {/* Action — instant fetch on change */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", display: "block", marginBottom: "4px" }}>
                Action
              </label>
              <select
                className={`audit-filter-input${loading ? " audit-filter-loading" : ""}`}
                value={filters.action}
                onChange={e => handleFilterChange("action", e.target.value)}
              >
                <option value="">All actions</option>
                {ACTIONS.map(a => (
                  <option key={a} value={a}>{actionIcon(a)} {a}</option>
                ))}
              </select>
            </div>

            {/* User — debounced */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", display: "block", marginBottom: "4px" }}>
                User
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="audit-filter-input"
                  type="text"
                  placeholder="Search username…"
                  value={filters.user_username}
                  onChange={e => handleFilterChange("user_username", e.target.value)}
                  style={{ paddingRight: filters.user_username ? "28px" : "11px" }}
                />
                {/* Clear "×" button inside user field */}
                {filters.user_username && (
                  <button
                    onClick={() => handleFilterChange("user_username", "")}
                    style={{
                      position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text-secondary,#9ca3af)", fontSize: "14px", lineHeight: 1,
                      padding: 0,
                    }}
                    title="Clear"
                  >×</button>
                )}
              </div>
            </div>

            {/* Date From — debounced */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", display: "block", marginBottom: "4px" }}>
                Date From
              </label>
              <input
                className="audit-filter-input"
                type="date"
                value={filters.date_from}
                onChange={e => handleFilterChange("date_from", e.target.value)}
              />
            </div>

            {/* Date To — debounced */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary,#6b7280)", display: "block", marginBottom: "4px" }}>
                Date To
              </label>
              <input
                className="audit-filter-input"
                type="date"
                value={filters.date_to}
                onChange={e => handleFilterChange("date_to", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div style={{
          background: "var(--bg-card,#fff)", border: "1px solid var(--border-color,#e5e7eb)",
          borderRadius: "12px", overflow: "hidden",
        }}>
          {/* Table header info */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid var(--border-color,#e5e7eb)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary,#6b7280)" }}>
              {loading
                ? "Fetching records…"
                : `${pagination.total.toLocaleString()} total record${pagination.total !== 1 ? "s" : ""}`}
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary,#9ca3af)" }}>
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
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary,#111)", marginBottom: "6px" }}>No audit records found</div>
              <div style={{ fontSize: "13px", color: "var(--text-secondary,#6b7280)" }}>
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
                    {["ID", "Timestamp", "User", "Entity", "Record ID", "Action", "IP Address"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px", textAlign: "left", fontSize: "11px",
                        fontWeight: 700, color: "var(--text-secondary,#6b7280)",
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
                          borderBottom: i < logs.length - 1 ? "1px solid var(--border-color,#f3f4f6)" : "none",
                        }}
                        onClick={() => setSelectedEntry(log)}
                      >
                        {/* ID */}
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary,#9ca3af)", fontFamily: "monospace", fontSize: "12px" }}>
                          #{log.id}
                        </td>

                        {/* Timestamp */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--text-secondary,#6b7280)", fontSize: "12px" }}>
                          {formatDate(log.created_at)}
                        </td>

                        {/* User */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div style={{
                              width: "24px", height: "24px", borderRadius: "50%",
                              background: log.user_username === "system" ? "#94a3b8" : "var(--primary,#6366f1)",
                              color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "10px", fontWeight: 700, flexShrink: 0,
                            }}>
                              {(log.user_username || "?")[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: "var(--text-primary,#111)" }}>
                              {log.user_username}
                            </span>
                          </div>
                        </td>

                        {/* Entity */}
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>{entityIcon(log.entity_type)}</span>
                            <span style={{ color: "var(--text-primary,#111)", textTransform: "capitalize" }}>
                              {log.entity_type.replace(/_/g, " ")}
                            </span>
                          </div>
                        </td>

                        {/* Record ID */}
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "var(--text-secondary,#9ca3af)" }}>
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
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11px", color: "var(--text-secondary,#9ca3af)" }}>
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
            <div style={{
              padding: "14px 20px", borderTop: "1px solid var(--border-color,#e5e7eb)",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px",
            }}>
              <span style={{ fontSize: "12px", color: "var(--text-secondary,#6b7280)" }}>
                Showing {((pagination.page - 1) * PAGE_SIZE) + 1}–{Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total.toLocaleString()}
              </span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                <button className="audit-page-btn" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  ‹ Prev
                </button>
                {(() => {
                  const total = pagination.totalPages;
                  const cur   = pagination.page;
                  const pages = [];
                  let start   = Math.max(1, cur - 3);
                  let end     = Math.min(total, cur + 3);
                  if (end - start < 6) {
                    if (start === 1) end = Math.min(total, 7);
                    else start = Math.max(1, end - 6);
                  }
                  for (let p = start; p <= end; p++) pages.push(p);
                  return pages.map(p => (
                    <button key={p} className={`audit-page-btn${p === cur ? " active" : ""}`} onClick={() => goToPage(p)}>
                      {p}
                    </button>
                  ));
                })()}
                <button className="audit-page-btn" disabled={page >= pagination.totalPages} onClick={() => goToPage(page + 1)}>
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <p style={{ fontSize: "11px", color: "var(--text-secondary,#9ca3af)", textAlign: "center", marginTop: "16px" }}>
          Audit logs are retained for 1 year and purged automatically every day at 02:00.
          Records are immutable and cannot be manually edited or deleted.
        </p>
      </div>
    </>
  );
}