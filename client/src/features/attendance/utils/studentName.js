/**
 * features/attendance/utils/studentName.js
 *
 * Student name helpers. `getInitials` is re-exported from the shared
 * utils/helpers.js (identical semantics — previously duplicated in three
 * in-file copies); `getFullName` combines first_name + last_name with
 * fallbacks to display_name / student_name / full_name (student users
 * carry the name in full_name — the students table is retired).
 */

export { getInitials } from "../../../utils/helpers";

export function getFullName(student = {}) {
  const { first_name, last_name, display_name, student_name, full_name } = student;
  const combined = [first_name, last_name].filter(Boolean).join(" ").trim();
  return combined || display_name || student_name || full_name || "";
}
