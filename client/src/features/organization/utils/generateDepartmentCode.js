// ─────────────────────────────────────────────────────────
//  features/organization/utils/generateDepartmentCode.js
//
//  Code for the inline department fast-path (the modal path lets
//  the admin type one). Acronym of the name — "College of
//  Information Technology" → "CIT" — falling back to the first
//  letters of a single word. Codes are unique per school, so a
//  collision is answered by the server's duplicate-code error and
//  surfaces in the inline row; the "More options" affordance then
//  opens the modal for a hand-typed code.
// ─────────────────────────────────────────────────────────

const CODE_MAX = 50;
const FALLBACK = "DEPT";

export function generateDepartmentCode(name) {
  const words = String(name || "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  let code;
  if (words.length <= 1) {
    code = (words[0] || FALLBACK).slice(0, 3);
  } else {
    code = words.map((word) => word[0]).join("");
  }

  code = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) code = FALLBACK;
  return code.slice(0, CODE_MAX);
}
