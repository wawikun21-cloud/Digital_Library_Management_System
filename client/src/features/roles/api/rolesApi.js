const API_BASE = import.meta.env.VITE_API_URL || "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

async function unwrap(res) {
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data: body?.success ? body.data : null, message: body?.error || null, raw: body };
}

/**
 * Roles & Permissions API — the single HTTP boundary for this feature.
 * Shapes here mirror LMS-SOP's contract so the editor components can stay
 * a faithful port instead of adapting DLMS responses at every call site.
 */

// ── Roles ──────────────────────────────────────────────────
export async function getRoles() {
  return unwrap(await fetch(`${API_BASE}/api/roles`, withCreds()));
}

export async function getRole(roleName) {
  return unwrap(await fetch(`${API_BASE}/api/roles/${encodeURIComponent(roleName)}`, withCreds()));
}

export async function createRole(payload) {
  return unwrap(await fetch(`${API_BASE}/api/roles`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  }));
}

export async function updateRole(roleName, payload) {
  return unwrap(await fetch(`${API_BASE}/api/roles/${encodeURIComponent(roleName)}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  }));
}

export async function deleteRole(roleName) {
  return unwrap(await fetch(`${API_BASE}/api/roles/${encodeURIComponent(roleName)}`, {
    ...withCreds({ method: "DELETE" }),
  }));
}

export async function getPermissions() {
  return unwrap(await fetch(`${API_BASE}/api/roles/permissions`, withCreds()));
}

/** Body: { grants: [{ permission_name, actions | null }] } */
export async function updateRolePermissions(roleName, permissions) {
  return unwrap(await fetch(`${API_BASE}/api/roles/permissions/${encodeURIComponent(roleName)}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify({ grants: permissions }) }),
  }));
}

export async function restoreRoleDefaults(roleName) {
  return unwrap(await fetch(`${API_BASE}/api/roles/roles/${encodeURIComponent(roleName)}/restore-defaults`, {
    ...withCreds({ method: "POST" }),
  }));
}

// ── My permissions (every authenticated role) ─────────────
export async function getMyPermissions() {
  return unwrap(await fetch(`${API_BASE}/api/roles/my-permissions`, withCreds()));
}

// ── Specific-user editor ──────────────────────────────────
/** Whole editor context: user, role, role grants with role_actions, overrides. */
export async function getUserPermissions(userId) {
  return unwrap(await fetch(`${API_BASE}/api/roles/users/${userId}/permissions`, withCreds()));
}

export async function getUserEntityOverrides(userId) {
  return unwrap(await fetch(`${API_BASE}/api/roles/users/${userId}/entity-overrides`, withCreds()));
}

/** Atomic save of role + permission overrides + entity overrides. */
export async function updateUserFullSave(userId, payload) {
  return unwrap(await fetch(`${API_BASE}/api/roles/users/${userId}/full-save`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  }));
}

// ── Entity picker ─────────────────────────────────────────
export async function getEntities(entityType) {
  return unwrap(await fetch(`${API_BASE}/api/roles/entities?type=${encodeURIComponent(entityType)}`, withCreds()));
}

export async function getEntitiesSearch(entityType, query) {
  const qs = new URLSearchParams({ type: entityType, search: query });
  return unwrap(await fetch(`${API_BASE}/api/roles/entities?${qs.toString()}`, withCreds()));
}

// ── Role-level entity permissions ─────────────────────────
export async function getRoleEntityPermissions(roleName) {
  return unwrap(await fetch(`${API_BASE}/api/roles/roles/${encodeURIComponent(roleName)}/entity-permissions`, withCreds()));
}

export async function updateRoleEntityPermissions(roleName, rows) {
  return unwrap(await fetch(`${API_BASE}/api/roles/roles/${encodeURIComponent(roleName)}/entity-permissions`, {
    ...withCreds({ method: "PUT", body: JSON.stringify({ rows }) }),
  }));
}
