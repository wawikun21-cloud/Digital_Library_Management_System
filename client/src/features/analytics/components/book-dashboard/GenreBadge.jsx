/**
 * features/analytics/components/book-dashboard/GenreBadge.jsx
 *
 * Genre pill. Extracted from the former pages/BookDashboard.jsx
 * (was `GenreBadge`).
 */

import { GENRE_COLORS } from "../../constants/bookDashboardPalette";

export default function GenreBadge({ genre }) {
  const c = GENRE_COLORS[genre] || { bg: "rgba(156,163,175,.15)", color: "#6b7280" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: c.bg, color: c.color }}>
      {genre}
    </span>
  );
}
