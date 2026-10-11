/**
 * features/attendance/components/kiosk/KioskAvatar.jsx
 *
 * Initials avatar with the kiosk's desaturated palette. Extracted from the
 * former pages/KioskAttendance.jsx (was `Avatar`).
 */

import { getInitials, avatarColors } from "../../utils/kioskFormat";

export default function KioskAvatar({ name, size = 56 }) {
  const accent = avatarColors(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `${accent}14`,
      border: `1.5px solid ${accent}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.round(size * 0.32), fontWeight: 700,
      color: accent, flexShrink: 0, letterSpacing: "-0.3px",
    }}>
      {getInitials(name)}
    </div>
  );
}
