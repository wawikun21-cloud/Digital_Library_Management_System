// ─────────────────────────────────────────────────────────
//  features/organization/api/organizationApi.js
//
//  HTTP only — every /api/organization/* call used by the
//  Schools / Departments / Categories pages and the category↔book
//  assignment controls. Responses pass through as the server
//  shapes them: lists answer { success, data: [] }, mutations
//  answer { success, data } or { success: false, error }.
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

function query(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
}

// ── Hierarchy ─────────────────────────────────────────────

export async function fetchHierarchy() {
  const res = await fetch(`${API_BASE}/api/organization/hierarchy`, withCreds());
  return res.json();
}

// ── Schools ───────────────────────────────────────────────

export async function fetchSchools() {
  const res = await fetch(`${API_BASE}/api/organization/schools`, withCreds());
  return res.json();
}

export async function createSchool(payload) {
  const res = await fetch(`${API_BASE}/api/organization/schools`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateSchool(id, payload) {
  const res = await fetch(`${API_BASE}/api/organization/schools/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteSchool(id) {
  const res = await fetch(`${API_BASE}/api/organization/schools/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

// ── Departments ───────────────────────────────────────────

export async function fetchDepartments(schoolId) {
  const res = await fetch(
    `${API_BASE}/api/organization/departments${query({ school_id: schoolId })}`,
    withCreds()
  );
  return res.json();
}

export async function createDepartment(payload) {
  const res = await fetch(`${API_BASE}/api/organization/departments`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateDepartment(id, payload) {
  const res = await fetch(`${API_BASE}/api/organization/departments/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteDepartment(id) {
  const res = await fetch(`${API_BASE}/api/organization/departments/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

// ── Categories ────────────────────────────────────────────

export async function fetchCategories({ departmentId, schoolId } = {}) {
  const res = await fetch(
    `${API_BASE}/api/organization/categories${query({ department_id: departmentId, school_id: schoolId })}`,
    withCreds()
  );
  return res.json();
}

export async function createCategory(payload) {
  const res = await fetch(`${API_BASE}/api/organization/categories`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateCategory(id, payload) {
  const res = await fetch(`${API_BASE}/api/organization/categories/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteCategory(id) {
  const res = await fetch(`${API_BASE}/api/organization/categories/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

/** Books (physical + digital) currently assigned to a category. */
export async function fetchCategoryBooks(categoryId) {
  const res = await fetch(`${API_BASE}/api/organization/categories/${categoryId}/books`, withCreds());
  return res.json();
}

// ── Category ↔ book assignments ───────────────────────────

/** Current category ids of a physical book (seeds assignment controls). */
export async function fetchBookCategories(bookId) {
  const res = await fetch(`${API_BASE}/api/organization/books/${bookId}/categories`, withCreds());
  return res.json();
}

/** Current category ids of a digital book (seeds assignment controls). */
export async function fetchLexoraBookCategories(bookId) {
  const res = await fetch(`${API_BASE}/api/organization/lexora-books/${bookId}/categories`, withCreds());
  return res.json();
}

export async function setBookCategories(bookId, categoryIds) {
  const res = await fetch(`${API_BASE}/api/organization/books/${bookId}/categories`, {
    ...withCreds({ method: "PUT", body: JSON.stringify({ category_ids: categoryIds }) }),
  });
  return res.json();
}

export async function setLexoraBookCategories(bookId, categoryIds) {
  const res = await fetch(`${API_BASE}/api/organization/lexora-books/${bookId}/categories`, {
    ...withCreds({ method: "PUT", body: JSON.stringify({ category_ids: categoryIds }) }),
  });
  return res.json();
}

// ── Book search for the assignment picker ─────────────────
//
// Reaches the scoped book list endpoints directly: the picker only
// needs id/title/author to toggle an assignment. Kept in this
// module (not a cross-feature import) so the organization feature
// stays removable and the books feature never imports organization.
//
// The filter keys mirror the server's list contract (physical:
// search + collection + status; lexora: search + status +
// visibility + source_type) so a bulk assignment always selects
// exactly what the book lists show.

async function searchBooks(term, filters, type) {
  const qs = query({
    search: term,
    limit: 20,
    ...(type === "lexora"
      ? {
          status: filters.status,
          visibility: filters.visibility,
          source_type: filters.source_type,
        }
      : {
          genre: filters.collection || undefined,
          status: filters.status,
        }),
  });
  const path = type === "lexora" ? "/api/lexora-books" : "/api/books";
  const res = await fetch(`${API_BASE}${path}${qs}`, withCreds());
  return res.json();
}

export async function searchBooksForAssignment(term, filters = {}) {
  return searchBooks(term, filters, "physical");
}

export async function searchLexoraBooksForAssignment(term, filters = {}) {
  return searchBooks(term, filters, "lexora");
}

/**
 * Bulk-assign books to one category. `dry_run` previews the counts
 * (matched / already assigned) without writing.
 */
export async function assignCategoryBooks(categoryId, payload) {
  const res = await fetch(`${API_BASE}/api/organization/categories/${categoryId}/books`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export default {
  fetchHierarchy,
  fetchSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  fetchCategoryBooks,
  fetchBookCategories,
  fetchLexoraBookCategories,
  setBookCategories,
  setLexoraBookCategories,
  searchBooksForAssignment,
  searchLexoraBooksForAssignment,
};
