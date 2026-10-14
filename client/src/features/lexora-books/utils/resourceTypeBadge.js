/**
 * Badge styling for a book's resource type, following the tinted
 * background + solid text convention used by the book table badges.
 * User-created types fall back to the neutral primary tint.
 */
const RESOURCE_TYPE_STYLE = {
  "open source": { background: "rgba(36,97,57,0.12)", color: "#246139" },
  premium:       { background: "rgba(153,101,0,0.12)", color: "#996500" },
};

const DEFAULT_STYLE = { background: "rgba(50,102,127,0.12)", color: "#32667F" };

export function resourceTypeBadgeStyle(rawType) {
  const key = String(rawType || "").trim().toLowerCase();
  return RESOURCE_TYPE_STYLE[key] || DEFAULT_STYLE;
}
