/**
 * utils/schoolYearUtils.js
 *
 * Philippine academic calendar helpers. Single source of truth for the
 * school-year rule (August–July): previously duplicated in the analytics
 * dashboard's generateSchoolYears() and the attendance dashboard's
 * getCurrentSchoolYear().
 *
 * NOTE: these strings use Unicode en-dash "–" (U+2013), NOT a regular hyphen,
 * to match the analytics filter bar and the backend parser.
 */

export function getCurrentSchoolYear() {
  const now  = new Date();
  const year = now.getFullYear();
  // month >= 8 (August onward) → S.Y. starts this year, e.g. 2026–2027
  // month  < 8 (before August) → S.Y. started last year, e.g. 2025–2026
  const start = now.getMonth() + 1 >= 8 ? year : year - 1;
  return `${start}–${start + 1}`;
}

/** Current school year plus the (count - 1) preceding years, newest first. */
export function generateSchoolYears(count = 5) {
  const currentStart = Number(getCurrentSchoolYear().split("–")[0]);
  return Array.from({ length: count }, (_, i) => {
    const s = currentStart - i;
    return `${s}–${s + 1}`;
  });
}
