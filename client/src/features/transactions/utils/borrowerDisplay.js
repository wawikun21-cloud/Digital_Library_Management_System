/**
 * features/transactions/utils/borrowerDisplay.js
 *
 * Display helpers for borrower lookup rows. Extracted from the IIFE inside
 * the former pages/Borrowed.jsx so component files stay component-only.
 */

/** Full display name for a student or faculty record. */
export function borrowerDisplayName(person, type) {
  if (type === "student") {
    return (person.first_name && person.last_name)
      ? `${person.first_name} ${person.last_name}`.trim()
      : (person.student_name || "");
  }
  return person.faculty_name || "";
}

/** First letter of the borrower's display name, uppercased. */
export function borrowerInitial(person, type) {
  return (borrowerDisplayName(person, type) || "?").charAt(0).toUpperCase();
}

/** Secondary line under the borrower's name. */
export function borrowerSubline(person, type) {
  if (type === "student") {
    return [person.student_id_number, person.student_course, person.student_yr_level].filter(Boolean).join(" · ");
  }
  return person.department;
}
