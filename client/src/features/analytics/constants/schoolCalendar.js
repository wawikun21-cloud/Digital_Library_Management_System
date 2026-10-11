/**
 * features/analytics/constants/schoolCalendar.js
 *
 * Academic calendar constants for the analytics dashboard filter bar.
 * Extracted from the former pages/Dashboard.jsx module scope. The
 * school-year rule itself lives in the shared utils/schoolYearUtils.js.
 */

import { generateSchoolYears } from "../../../utils/schoolYearUtils";

export { generateSchoolYears };

export const SEMESTERS = ["1st Sem", "2nd Sem"];

// NOTE: school-year strings use Unicode en-dash "–" (U+2013), NOT a regular
// hyphen. URLSearchParams encodes it as %E2%80%93 — this is correct and the
// backend buildDateFilter already handles it via /[–\-]/ split. Do not
// replace with "-". Auto-generated from the current date — no manual updates
// needed. Produces the current S.Y. plus the 4 preceding years (5 total).
export const SCHOOL_YEARS = generateSchoolYears();

export const SEM_MONTHS = {
  "1st Sem": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  "2nd Sem": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
};
