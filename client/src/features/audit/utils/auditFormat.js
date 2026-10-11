/**
 * features/audit/utils/auditFormat.js
 *
 * Presentation helpers for the audit trail. Extracted from the module scope
 * and the IIFE inside the former pages/AuditLog.jsx.
 */

export function actionColor(action) {
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
    default:             return { bg: "var(--bg-subtle)",                     text: "var(--text-secondary)" };
  }
}

export function entityIcon(type) {
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

export function actionIcon(action) {
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

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/**
 * Pagination page window: current ± 3, widened to 7 entries when possible.
 * Extracted verbatim from the IIFE that previously rendered it inline.
 */
export function buildPageWindow(totalPages, currentPage) {
  const pages = [];
  let start = Math.max(1, currentPage - 3);
  let end   = Math.min(totalPages, currentPage + 3);
  if (end - start < 6) {
    if (start === 1) end = Math.min(totalPages, 7);
    else start = Math.max(1, end - 6);
  }
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}
