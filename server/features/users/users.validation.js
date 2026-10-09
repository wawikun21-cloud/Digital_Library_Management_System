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
  return { errors, isValid: Object.keys(errors).length === 0 };
}

module.exports = {
  VALID_ROLES,
  validateCreateUser,
  validateUpdateUser,
  validateChangeRole,
  validateChangePassword,
  validateListQuery,
};
