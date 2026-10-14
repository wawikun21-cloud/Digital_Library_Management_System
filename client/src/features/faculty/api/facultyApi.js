// ─────────────────────────────────────────────────────────
//  features/faculty/api/facultyApi.js
//
//  HTTP only — /api/faculty/* (moved off the retired /api/students
//  routes when student records consolidated into users). The
//  management endpoints are school-scoped server-side; the faculty
//  borrower lookup in the borrow flow is deliberately unscoped
//  (faculty may borrow at any school).
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

export async function getAllFaculty() {
  const res = await fetch(`${API_BASE}/api/faculty`, withCreds());
  return res.json();
}

export async function createFaculty(payload) {
  const res = await fetch(`${API_BASE}/api/faculty`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateFaculty(id, payload) {
  const res = await fetch(`${API_BASE}/api/faculty/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteFaculty(id) {
  const res = await fetch(`${API_BASE}/api/faculty/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

/** Per-row import report, same contract as the student import. */
export async function bulkImportFaculty(rows) {
  const res = await fetch(`${API_BASE}/api/faculty/bulk-import`, {
    ...withCreds({ method: "POST", body: JSON.stringify(rows) }),
  });
  return res.json();
}

export default {
  getAllFaculty,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  bulkImportFaculty,
};
