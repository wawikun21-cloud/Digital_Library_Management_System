const API_BASE = import.meta.env.VITE_API_URL || "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

export async function fetchUsers(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      if (key === "is_active") {
        if (val !== "all") qs.append(key, val);
      } else {
        qs.append(key, val);
      }
    }
  });
  const res = await fetch(`${API_BASE}/api/users?${qs.toString()}`, withCreds());
  return res.json();
}

export async function fetchUserById(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, withCreds());
  return res.json();
}

export async function fetchUserStats() {
  const res = await fetch(`${API_BASE}/api/users/stats`, withCreds());
  return res.json();
}

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/api/users/me`, withCreds());
  return res.json();
}

export async function createUser(payload) {
  const res = await fetch(`${API_BASE}/api/users`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateUser(id, payload) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function changeUserRole(id, newRole, reason) {
  const res = await fetch(`${API_BASE}/api/users/${id}/role`, {
    ...withCreds({
      method: "PUT",
      body: JSON.stringify({ role: newRole, reason }),
    }),
  });
  return res.json();
}

export async function changeUserPassword(id, password, confirmPassword) {
  const res = await fetch(`${API_BASE}/api/users/${id}/password`, {
    ...withCreds({
      method: "PUT",
      body: JSON.stringify({ password, confirmPassword }),
    }),
  });
  return res.json();
}

export async function deactivateUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

export async function reactivateUser(id) {
  const res = await fetch(`${API_BASE}/api/users/${id}/reactivate`, {
    ...withCreds({ method: "PATCH" }),
  });
  return res.json();
}

// ── Student users (students are users with role='student') ──────────
//
// Dedicated endpoints with their own permission (manage_students:*)
// and school scope. The server derives username AND password from
// the student ID number — neither is ever sent from the client.

export async function fetchStudentUsers(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}/api/users/students?${qs.toString()}`, withCreds());
  return res.json();
}

export async function searchStudentUsers(term) {
  const qs = new URLSearchParams({ q: term || "" });
  const res = await fetch(`${API_BASE}/api/users/students/search?${qs.toString()}`, withCreds());
  return res.json();
}

export async function fetchStudentUserStats() {
  const res = await fetch(`${API_BASE}/api/users/students/stats`, withCreds());
  return res.json();
}

export async function checkStudentIdExists(studentIdNumber) {
  const res = await fetch(`${API_BASE}/api/users/students/check-id`, {
    ...withCreds({ method: "POST", body: JSON.stringify({ student_id_number: studentIdNumber }) }),
  });
  return res.json();
}

export async function createStudentUser(payload) {
  const res = await fetch(`${API_BASE}/api/users/students`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateStudentUser(id, payload) {
  const res = await fetch(`${API_BASE}/api/users/students/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteStudentUser(id) {
  const res = await fetch(`${API_BASE}/api/users/students/${id}`, {
    ...withCreds({ method: "DELETE" }),
  });
  return res.json();
}

/**
 * Bulk import. The body is the array of parsed rows; the answer is a
 * per-row report (imported / failed + reason), never a silent drop.
 */
export async function bulkImportStudentUsers(rows) {
  const res = await fetch(`${API_BASE}/api/users/students/bulk-import`, {
    ...withCreds({ method: "POST", body: JSON.stringify(rows) }),
  });
  return res.json();
}
