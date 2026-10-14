const ROLES = require("../../middleware/authMiddleware").ROLES;

const VALID_ROLES = Object.values(ROLES);

function validateCreateUser(data) {
  const errors = {};

  if (!data.username || data.username.trim().length < 2) {
    errors.username = "Username must be at least 2 characters";
  }
  if (data.username && data.username.trim().length > 100) {
    errors.username = "Username must be at most 100 characters";
  }

  if (!data.password || data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!VALID_ROLES.includes(data.role)) {
    errors.role = `Role must be one of: ${VALID_ROLES.join(", ")}`;
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (data.full_name && data.full_name.length > 255) {
    errors.full_name = "Full name must be at most 255 characters";
  }

  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateUpdateUser(data) {
  const errors = {};

  if (data.username !== undefined) {
    if (!data.username || data.username.trim().length < 2) {
      errors.username = "Username must be at least 2 characters";
    }
    if (data.username && data.username.trim().length > 100) {
      errors.username = "Username must be at most 100 characters";
    }
  }

  if (data.password && data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (data.password && data.confirmPassword && data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = "Must be a valid email address";
  }

  if (data.full_name && data.full_name.length > 255) {
    errors.full_name = "Full name must be at most 255 characters";
  }

  if (data.role && !VALID_ROLES.includes(data.role)) {
    errors.role = `Role must be one of: ${VALID_ROLES.join(", ")}`;
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateChangeRole(data) {
  const errors = {};
  if (!data.role || !VALID_ROLES.includes(data.role)) {
    errors.role = `Role must be one of: ${VALID_ROLES.join(", ")}`;
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateChangePassword(data) {
  const errors = {};
  if (!data.password || data.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateListQuery(query) {
  const errors = {};
  if (query.page && (isNaN(query.page) || Number(query.page) < 1)) {
    errors.page = "Page must be a positive integer";
  }
  if (query.limit && (isNaN(query.limit) || Number(query.limit) < 1 || Number(query.limit) > 100)) {
    errors.limit = "Limit must be between 1 and 100";
  }
  if (query.role && !VALID_ROLES.includes(query.role)) {
    errors.role = "Invalid role filter";
  }
  if (query.exclude_role && !VALID_ROLES.includes(query.exclude_role)) {
    errors.exclude_role = "Invalid role exclusion filter";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

/**
 * Student-user payload validation. The server derives username AND
 * password from the student ID number, so neither is ever accepted
 * from the client.
 */
function validateCreateStudentUser(data) {
  const errors = {};

  if (!data.student_id_number || !data.student_id_number.trim()) {
    errors.student_id_number = "Student ID number is required";
  } else {
    if (data.student_id_number.trim().length < 2) {
      errors.student_id_number = "Student ID number must be at least 2 characters";
    }
    if (data.student_id_number.trim().length > 100) {
      errors.student_id_number = "Student ID number must be at most 100 characters";
    }
  }

  if (data.full_name !== undefined && data.full_name !== null && data.full_name.length > 255) {
    errors.full_name = "Full name must be at most 255 characters";
  }
  if (data.student_course !== undefined && data.student_course !== null && data.student_course.length > 100) {
    errors.student_course = "Course must be at most 100 characters";
  }
  if (data.student_email !== undefined && data.student_email !== null && data.student_email.trim()
      && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.student_email)) {
    errors.student_email = "Must be a valid email address";
  }
  if (data.school_id !== undefined && data.school_id !== null && !Number.isInteger(Number(data.school_id))) {
    errors.school_id = "School must be a valid id";
  }
  if (data.department_id !== undefined && data.department_id !== null && !Number.isInteger(Number(data.department_id))) {
    errors.department_id = "Department must be a valid id";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

function validateUpdateStudentUser(data) {
  const errors = {};
  if (data.student_id_number !== undefined) {
    if (!data.student_id_number?.trim()) {
      errors.student_id_number = "Student ID number cannot be empty";
    } else if (data.student_id_number.trim().length > 100) {
      errors.student_id_number = "Student ID number must be at most 100 characters";
    }
  }
  if (data.full_name !== undefined && data.full_name !== null && data.full_name.length > 255) {
    errors.full_name = "Full name must be at most 255 characters";
  }
  if (data.student_email !== undefined && data.student_email !== null && data.student_email.trim()
      && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.student_email)) {
    errors.student_email = "Must be a valid email address";
  }
  if (data.department_id !== undefined && data.department_id !== null && !Number.isInteger(Number(data.department_id))) {
    errors.department_id = "Department must be a valid id";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

module.exports = {
  VALID_ROLES,
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validateChangePassword,
  validateListQuery,
  validateCreateStudentUser,
  validateUpdateStudentUser,
};
