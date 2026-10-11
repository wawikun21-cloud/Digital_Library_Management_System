/**
 * features/attendance/utils/avatarColor.js
 *
 * Gradient avatar colours for student rows. Extracted from the former
 * components/AttendanceTable.jsx (was AVATAR_COLORS / avatarColor).
 */

const AVATAR_COLORS = [
  ['#32667F', '#1a4a5e'],
  ['#b87a1a', '#8a5a10'],
  ['#2d7a47', '#1d5a32'],
  ['#7c3aed', '#5b26b8'],
  ['#c2410c', '#9a3208'],
];

export const avatarColor = (name = '') =>
  AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
