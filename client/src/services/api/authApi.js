// ─────────────────────────────────────────────────────────
//  services/api/authApi.js
//  Auth API — login, logout, session check, profile update
// ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
   */
  async me() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Not authenticated");
    return data;
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
    const form = new FormData();

    if (username !== undefined)        form.append("username",        username);
    if (password)                      form.append("password",        password);
    if (confirmPassword)               form.append("confirmPassword", confirmPassword);
    if (avatarFile instanceof File)    form.append("avatar",          avatarFile);

    const res = await fetch(`${BASE_URL}/auth/profile`, {
      method:      "PATCH",
      credentials: "include",
      // NOTE: Do NOT set Content-Type manually — browser sets multipart boundary automatically
      body: form,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update profile");
    return data; // { success, user, message }
  },
};

export default authApi;
export { authApi };