/**
 * features/analytics/constants/bookDashboardPalette.js
 *
 * Palette constants for the book dashboard. The `C` brand palette now comes
 * from the shared constants/dashboardPalette.js (single owner, also used by
 * the attendance feature); GENRE_COLORS stays feature-specific.
 */

import { DASHBOARD_COLORS } from "../../../constants/dashboardPalette";

export const C = DASHBOARD_COLORS;

export const GENRE_COLORS = {
  Fiction:       { bg: "rgba(99,102,241,.12)",  color: "#6366f1" },
  "Non-Fiction": { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  Science:       { bg: "rgba(238,162,58,.15)",  color: "#b87a1a" },
  History:       { bg: "rgba(50,102,127,.12)",  color: "#32667F" },
  Biography:     { bg: "rgba(168,85,247,.12)",  color: "#a855f7" },
  Arts:          { bg: "rgba(244,63,94,.12)",   color: "#f43f5e" },
};
