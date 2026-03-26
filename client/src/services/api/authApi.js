// ─────────────────────────────────────────────────────────
//  services/api/authApi.js
//  Auth API — login, logout, session check
// ─────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEBUG_ENDPOINT = "http://127.0.0.1:7267/ingest/c235186e-2452-4dfd-a678-d8c36a60fe32";
const DEBUG_SESSION_ID = "b9bd09";

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
    const url = `${BASE_URL}/auth/me`;

    // #region agent log
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: "initial",
        hypothesisId: "H2",
        location: "authApi.js:me:beforeFetch",
        message: "authApi.me fetch starting",
        data: {
          BASE_URL,
          url,
          pathname: window?.location?.pathname,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      // #region agent log
      fetch(DEBUG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": DEBUG_SESSION_ID,
        },
        body: JSON.stringify({
          sessionId: DEBUG_SESSION_ID,
          runId: "initial",
          hypothesisId: "H1",
          location: "authApi.js:me:afterFetch",
          message: "authApi.me fetch returned response",
          data: { url, status: res?.status, ok: res?.ok },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Not authenticated");
      return data;
    } catch (err) {
      let health = null;
      try {
        const h = await fetch("/api/health", { credentials: "include" });
        health = { status: h?.status, ok: h?.ok };
      } catch (healthErr) {
        health = {
          errorName: healthErr?.name,
          message: healthErr?.message,
        };
      }

      // #region agent log
      fetch(DEBUG_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": DEBUG_SESSION_ID,
        },
        body: JSON.stringify({
          sessionId: DEBUG_SESSION_ID,
          runId: "initial",
          hypothesisId: "H1",
          location: "authApi.js:me:catch",
          message: "authApi.me fetch failed",
          data: {
            url,
            error: { name: err?.name, message: err?.message },
            health,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      throw err;
    }
  },
};

export default authApi;
export { authApi };