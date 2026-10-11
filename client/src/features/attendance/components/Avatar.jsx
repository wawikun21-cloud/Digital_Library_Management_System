/**
 * features/attendance/components/Avatar.jsx
 *
 * Initials avatar. Extracted from the former pages/Attendance.jsx
 * (was `Avatar`).
 */

import { getInitials } from "../utils/studentName";

const COLORS = ["#32667F", "#EEA23A", "#2d7a47", "#7c3aed", "#EA8B33"];

export default function Avatar({ name, size = 32 }) {
  const bg = COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 text-white"
      style={{ width: size, height: size, background: bg, fontSize: Math.round(size * 0.38) }}
    >
      {getInitials(name)}
    </div>
  );
}
