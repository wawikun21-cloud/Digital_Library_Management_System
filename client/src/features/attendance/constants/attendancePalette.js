/**
 * features/attendance/constants/attendancePalette.js
 *
 * Feature constants for the attendance dashboard. The `C` brand palette
 * comes from the shared constants/dashboardPalette.js; PROG_COLORS and the
 * library seating capacity stay feature-specific. Extracted from the
 * module scope of the former pages/AttendanceDashboard.jsx.
 */

import { DASHBOARD_COLORS } from "../../../constants/dashboardPalette";

export const C = DASHBOARD_COLORS;

// Maximum library seating capacity — adjust as needed
export const LIBRARY_CAPACITY = 120;

export const PROG_COLORS = {
  BSIT: { bg: "rgba(99,102,241,.12)",  color: "#6366f1" },
  BSN:  { bg: "rgba(34,197,94,.12)",   color: "#16a34a" },
  BSCS: { bg: "rgba(238,162,58,.15)",  color: "#b87a1a" },
  BSA:  { bg: "rgba(50,102,127,.12)",  color: "#32667F" },
  BSBA: { bg: "rgba(168,85,247,.12)",  color: "#a855f7" },
  BEED: { bg: "rgba(244,63,94,.12)",   color: "#f43f5e" },
  BA:   { bg: "rgba(45,212,191,.12)",  color: "#0d9488" },
};
