// ─────────────────────────────────────────────────────────
//  client/src/services/api/auditApi.js
//  Admin-only API calls for the Audit Trail feature.
// ─────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL || "/api";

/** Build query string from a plain object, omitting null/undefined/empty values. */
function toQS(params = {}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

const auditApi = {
  /**
   * Fetch paginated + filtered audit log entries.
   * @param {{ page?, limit?, entity_type?, action?, user_username?, date_from?, date_to? }} params
   */
  async getLogs(params = {}) {
    const res = await fetch(`${BASE}/audit${toQS(params)}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Audit API error: ${res.status}`);
    return res.json();
  },

  /** Fetch summary statistics for the stats widget. */
  async getStats() {
    const res = await fetch(`${BASE}/audit/stats`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Audit stats API error: ${res.status}`);
    return res.json();
  },

  /**
   * Fetch a single audit log entry by ID.
   * @param {number} id
   */
  async getById(id) {
    const res = await fetch(`${BASE}/audit/${id}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Audit entry API error: ${res.status}`);
    return res.json();
  },

  /**
   * Trigger CSV export — opens as file download.
   * @param {{ entity_type?, action?, user_username?, date_from?, date_to? }} params
   */
  exportCsv(params = {}) {
    // Navigate to the URL — browser will handle the download
    window.open(`${BASE}/audit/export${toQS(params)}`, "_blank");
  },
};

export default auditApi;
