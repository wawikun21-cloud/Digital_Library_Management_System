/**
 * features/attendance/utils/kioskFormat.js
 *
 * Formatting helpers for the kiosk display. Extracted from the module scope
 * of the former pages/KioskAttendance.jsx. `getInitials` / `getFullName`
 * are re-exported from their single owners instead of redefined.
 */

import { AVATAR_COLORS } from "../constants/kioskTheme";

export { getInitials } from "../../../utils/helpers";
export { getFullName } from "./studentName";

export const pad = (n) => String(n).padStart(2, "0");

export function avatarColors(name = "") {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export function fmtElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

// Treats strings without an explicit timezone offset as LOCAL time by
// replacing the space separator with "T" but NOT appending "Z". The browser
// then parses them as local time, matching the server's timezone.
export function parseTimestamp(dt) {
  if (!dt) return new Date();
  const s = String(dt);
  if (s.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  return new Date(s.replace(" ", "T"));
}

export function fmtCheckIn(dt) {
  if (!dt) return "—";
  return parseTimestamp(dt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
