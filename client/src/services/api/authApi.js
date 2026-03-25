// ─────────────────────────────────────────────────────────
//  services/api/authApi.js
//  Auth API — login, logout, session check
// ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const authApi = {
  /**
   * Login with username + password.
   * Returns { success, user } on success.
   * Throws an Error with message on failure.
   */
  async login(username, password) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "include", // send/receive session cookie
      body:        JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    return data;
  },

  /**
   * Logout — destroys the server session.
   */
  async logout() {
    const res = await fetch(`${BASE_URL}/auth/logout`, {
      method:      "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Logout failed");
    return data;
  },

  /**
   * Check if the user has an active session.
   * Returns { success, user } or throws if not authenticated.
   */
  async me() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Not authenticated");
    return data;
  },
};

export default authApi;
export { authApi };