// ─────────────────────────────────────────────────────────
//  features/organization/organization.validation.js
//
//  Input validation for the organization feature. Pure
//  functions reused by the controller; backend validation is
//  authoritative regardless of any client-side checks.
// ─────────────────────────────────────────────────────────

function validateSchoolPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";
  if (body.code !== undefined) {
    if (!body.code.trim()) return "School code cannot be empty";
    if (body.code.length > 50) return "School code must be 50 characters or less";
    if (!/^[A-Za-z0-9_-]+$/.test(body.code.trim())) {
      return "School code may only contain letters, numbers, hyphens and underscores";
    }
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) return "School name cannot be empty";
    if (body.name.length > 255) return "School name must be less than 255 characters";
  }
  if (body.description !== undefined && body.description !== null && body.description.length > 5000) {
    return "Description must be less than 5000 characters";
  }
  if (body.status !== undefined && !["active", "inactive"].includes(body.status)) {
    return "Status must be 'active' or 'inactive'";
  }
  if (body.feature_set !== undefined && !["library", "lexora", "both"].includes(body.feature_set)) {
    return "Feature set must be 'library', 'lexora', or 'both'";
  }
  return null;
}

function validateDepartmentPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";
  if (body.school_id !== undefined && !Number.isInteger(Number(body.school_id))) {
    return "School must be a valid id";
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) return "Department name cannot be empty";
    if (body.name.length > 255) return "Department name must be less than 255 characters";
  }
  if (body.code !== undefined) {
    if (!body.code.trim()) return "Department code cannot be empty";
    if (body.code.length > 50) return "Department code must be 50 characters or less";
  }
  if (body.description !== undefined && body.description !== null && body.description.length > 5000) {
    return "Description must be less than 5000 characters";
  }
  return null;
}

function validateCategoryPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";
  if (body.department_id !== undefined && !Number.isInteger(Number(body.department_id))) {
    return "Department must be a valid id";
  }
  if (body.name !== undefined) {
    if (!body.name.trim()) return "Category name cannot be empty";
    if (body.name.length > 255) return "Category name must be less than 255 characters";
  }
  if (body.description !== undefined && body.description !== null && body.description.length > 5000) {
    return "Description must be less than 5000 characters";
  }
  return null;
}

function validateCategoryAssignmentPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";
  if (body.category_ids === undefined) return "category_ids is required";
  if (!Array.isArray(body.category_ids)) return "category_ids must be an array";
  for (const id of body.category_ids) {
    if (!Number.isInteger(Number(id))) {
      return "category_ids must contain numeric ids";
    }
  }
  return null;
}

/** Guardrails shared by both bulk-assignment modes. */
const MAX_BULK_IDS = 1000; // explicit id lists per request
const MAX_BULK_MATCHES = 10000; // filter-driven matches per request
const BULK_FILTER_FIELDS = ["search", "collection", "status", "visibility", "source_type", "resource_type"];

function validateBulkAssignPayload(body) {
  if (!body || typeof body !== "object") return "Request body is required";

  if (!["physical", "lexora"].includes(body.type)) {
    return "type must be 'physical' or 'lexora'";
  }
  if (!["ids", "filter"].includes(body.mode)) {
    return "mode must be 'ids' or 'filter'";
  }

  const idError = (value) =>
    !Array.isArray(value) || value.length > MAX_BULK_IDS || !value.every((id) => Number.isInteger(Number(id)))
      ? "must be an array of numeric ids"
      : null;

  if (body.mode === "ids") {
    const err = idError(body.book_ids);
    if (err) return `book_ids ${err}`;
  } else {
    const err = idError(body.exclude_ids || []);
    if (err) return `exclude_ids ${err}`;
    if (body.filters !== undefined && (typeof body.filters !== "object" || body.filters === null)) {
      return "filters must be an object";
    }
    if (body.filters) {
      for (const [key, value] of Object.entries(body.filters)) {
        if (!BULK_FILTER_FIELDS.includes(key)) return `Unknown filter '${key}'`;
        if (value !== undefined && value !== null && typeof value !== "string") {
          return `Filter '${key}' must be a string`;
        }
        if (typeof value === "string" && value.length > 255) {
          return `Filter '${key}' must be 255 characters or less`;
        }
      }
    }
  }
  return null;
}

module.exports = {
  validateSchoolPayload,
  validateDepartmentPayload,
  validateCategoryPayload,
  validateCategoryAssignmentPayload,
  validateBulkAssignPayload,
  MAX_BULK_IDS,
  MAX_BULK_MATCHES,
};
