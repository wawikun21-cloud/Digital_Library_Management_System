/**
 * features/students/validation/studentValidation.js
 *
 * Pre-flight validation for the bulk import modal. Extracted from
 * `handleBulkImport` in the former pages/Students.jsx.
 */

export function validateImportFields({ importCourse, importSchoolYear }) {
  const errs = {};
  if (!importCourse.trim())     errs.importCourse     = "Course is required before importing.";
  if (!importSchoolYear.trim()) errs.importSchoolYear = "School Year is required before importing.";
  return errs;
}
