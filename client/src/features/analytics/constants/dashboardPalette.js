/**
 * features/analytics/constants/dashboardPalette.js
 *
 * Palette and formatting constants for the main analytics dashboard.
 * Extracted from the former pages/Dashboard.jsx module scope.
 */

export const RANK_COLORS = [
  "#EEA23A", "#32667F", "#132F45", "#276096", "#2d71b0",
  "#3a7a96", "#4290ae", "#5aa0bc", "#6dafc8", "#82bed4",
];

export const NEMCO_COLOR  = "#132F45";
export const LEXORA_COLOR = "#32667F";

// Top-3 medal styling for the most-borrowed ranking table.
export const MEDAL = [
  { bg: "rgba(255,193,7,0.15)",  border: "rgba(255,193,7,0.4)",  text: "#b8860b", label: "🥇" },
  { bg: "rgba(176,190,197,0.2)", border: "rgba(176,190,197,0.5)", text: "#546e7a", label: "🥈" },
  { bg: "rgba(188,143,71,0.15)", border: "rgba(188,143,71,0.4)", text: "#795548", label: "🥉" },
];

// Peso formatting for KPI pills and chart tooltips.
export const fmtPeso = v => v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`;
