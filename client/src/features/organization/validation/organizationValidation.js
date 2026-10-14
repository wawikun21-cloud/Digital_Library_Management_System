// ─────────────────────────────────────────────────────────
//  features/organization/validation/organizationValidation.js
//
//  Client-side mirrors of the server's payload rules
//  (server/features/organization/organization.validation.js).
//  The server remains the authority — these exist for instant
//  feedback, not as the gate.
// ─────────────────────────────────────────────────────────

const NAME_MAX = 255;
const CODE_MAX = 50;

export function validateSchoolPayload({ name, code }) {
  const errors = {};
  if (!name?.trim()) errors.name = "School name is required";
  else if (name.trim().length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters`;

  if (!code?.trim()) errors.code = "School code is required";
  else if (code.trim().length > CODE_MAX) errors.code = `Code must be at most ${CODE_MAX} characters`;

  return { errors, isValid: Object.keys(errors).length === 0 };
}

// The validators receive the FORM state, whose keys mirror the server
// payload (snake_case): school_id / department_id, not schoolId /
// departmentId. The select's onChange stores the raw option value, so
// an id arrives as either a number or a numeric string — treat both as
// present and only "" / null / undefined as missing.

export function validateDepartmentPayload({ name, code, school_id: schoolId }) {
  // validateSchoolPayload answers { errors, isValid } — merge the inner
  // errors map (assigning the envelope itself made isValid permanently
  // false, since its keys are "errors"/"isValid").
  const { errors: nameErrors } = validateSchoolPayload({ name, code });
  const errors = { ...nameErrors };
  if (schoolId == null || schoolId === "") {
    errors.school_id = "Select the school this department belongs to";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

export function validateCategoryPayload({ name, department_id: departmentId }) {
  const errors = {};
  if (!name?.trim()) errors.name = "Category name is required";
  else if (name.trim().length > NAME_MAX) errors.name = `Name must be at most ${NAME_MAX} characters`;
  if (departmentId == null || departmentId === "") {
    errors.department_id = "Select the department this category belongs to";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}
