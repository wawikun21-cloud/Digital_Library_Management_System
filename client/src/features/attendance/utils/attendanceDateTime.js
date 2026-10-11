/**
 * features/attendance/utils/attendanceDateTime.js
 *
 * Date/time formatting for attendance records. Single owner — previously
 * duplicated (with three in-file copies) in the attendance page and the
 * attendance table. Extracted from pages/Attendance.jsx.
 */

export const pad = (n) => String(n).padStart(2, "0");

// Parses a MySQL datetime string as UTC. Strings that already carry a
// timezone designator ("Z" or "+hh:mm") are parsed as-is.
export function parseAsUTC(dt) {
  if (!dt) return new Date();
  const s = String(dt);
  if (s.endsWith("Z") || s.includes("+")) return new Date(s);
  return new Date(s.replace(" ", "T") + "Z");
}

export function fmtDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtDate(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function fmtDuration(mins) {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
