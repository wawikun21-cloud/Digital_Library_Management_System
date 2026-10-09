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
