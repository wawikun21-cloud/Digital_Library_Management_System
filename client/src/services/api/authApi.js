// ─────────────────────────────────────────────────────────
//  services/api/authApi.js
//  Auth API — login, logout, session check, profile update
// ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// In-memory CSRF token cache
let csrfToken = null;

/**
 * Fetch a fresh CSRF token from the server.
 * Called before any state-changing authenticated request.
 * Returns null in development (CSRF is disabled there).
 */
async function fetchCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(`${BASE_URL}/auth/csrf-token`, {
      method: "GET",
      credentials: "include",
    });
    const data = await res.json();
    csrfToken = data.csrfToken || null;
    return csrfToken;
  } catch (err) {
    // In case of error, return null - CSRF is optional in development
    console.error("[authApi] Failed to fetch CSRF token:", err);
    return null;
  }
}

// Reset CSRF token (call after login/logout to force refresh)
function resetCsrfToken() {
  csrfToken = null;
}

/**
 * Map the server's auth payload onto the camelCase fields the client
 * permission helpers read.
 *
 * `login` / `me` / `updateProfile` answer with snake_case
 * `permission_details` and `entity_overrides`, while `permissionUtils`
 * reads `permissionDetails` / `entityOverrides`. Storing the raw response
 * left both undefined, which made every `hasPermissionAction` gate fall
 * through to its "details missing = fully granted" legacy branch — so
 * action-level buttons stayed visible and the server then refused them.
 *
 * Normalizing once here (the API layer owns response shaping) fixes every
 * gate that consumes the cached user. Idempotent: an already-camelCase
 * payload passes through untouched, and the snake_case keys are kept for
 * any consumer that still reads them.
 */
export function normalizeAuthUser(user) {
  if (!user || typeof user !== "object") return user;
  const normalized = { ...user };
  if (normalized.permissionDetails === undefined && normalized.permission_details !== undefined) {
    normalized.permissionDetails = normalized.permission_details;
  }
  if (normalized.entityOverrides === undefined && normalized.entity_overrides !== undefined) {
    normalized.entityOverrides = normalized.entity_overrides;
  }
  return normalized;
}

/** Shape of every auth response that carries the user + permission payload. */
function normalizeAuthResponse(data) {
  if (!data || typeof data !== "object" || !data.user) return data;
  return { ...data, user: normalizeAuthUser(data.user) };
}

const authApi = {
  /**
   * Login with username + password.
   */
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include",
      body:        JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    // Clear cached CSRF token so it's fetched fresh after login
    resetCsrfToken();
    return normalizeAuthResponse(data);
  },

  /**
   * Logout — destroys the server session.
   */
  async logout() {
    const token = await fetchCsrfToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["CSRF-Token"] = token;
    }
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method:      "POST",
      credentials: "include",
      headers,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logout failed");
    // Clear CSRF token since session is destroyed
    resetCsrfToken();
    return data;
  },

  /**
   * Check if the user has an active session.
   */
  async me() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Not authenticated");
    return normalizeAuthResponse(data);
  },

  /**
   * PATCH /api/auth/profile
   * Updates username, password, and/or avatar.
   *
   * @param {object} params
   * @param {string}  [params.username]
   * @param {string}  [params.password]
   * @param {string}  [params.confirmPassword]
   * @param {File}    [params.avatarFile]       – raw File object from <input type="file">
   */
  async updateProfile({ username, password, confirmPassword, avatarFile } = {}) {
    const token = await fetchCsrfToken();
    const form = new FormData();

    if (username !== undefined)        form.append("username",        username);
    if (password)                      form.append("password",        password);
    if (confirmPassword)               form.append("confirmPassword", confirmPassword);
    if (avatarFile instanceof File)    form.append("avatar",          avatarFile);

    const headers = {};
    if (token) {
      headers["CSRF-Token"] = token;
    }
    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method:      "PATCH",
      credentials: "include",
      headers,
      // NOTE: Do NOT set Content-Type manually — browser sets multipart boundary automatically
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update profile");
    return normalizeAuthResponse(data); // { success, user, message }
  },

  // Export for testing/debugging if needed
  _fetchCsrfToken: fetchCsrfToken,
  _resetCsrfToken: resetCsrfToken,
};

export default authApi;
export { authApi };