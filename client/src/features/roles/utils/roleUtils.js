/** Avatar helpers for the user lists in the roles drawer. */

export function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "rgba(50,102,127,0.16)",
  "rgba(34,197,94,0.16)",
  "rgba(168,85,247,0.16)",
  "rgba(238,162,58,0.16)",
  "rgba(244,63,94,0.16)",
  "rgba(6,182,212,0.16)",
  "rgba(99,102,241,0.16)",
  "rgba(20,184,166,0.16)",
];

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
