/**
 * features/analytics/utils/formatUtils.js
 *
 * Focused number formatting for the analytics feature (pages and widgets
 * share this — it was previously duplicated as `formatNum` inside the
 * former pages/BookDashboard.jsx).
 */

export const formatNum = n => n?.toLocaleString() ?? "—";
