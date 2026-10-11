/**
 * features/faculty/validation/facultyValidation.js
 *
 * Faculty form validation. Extracted from the `validate()` function in the
 * former pages/Faculty.jsx.
 */

export function validateFacultyForm(formData) {
  const e = {};
  if (!formData.faculty_name.trim()) e.faculty_name = 'Name is required';
  if (!formData.department)          e.department   = 'Department is required';
  return e;
}
