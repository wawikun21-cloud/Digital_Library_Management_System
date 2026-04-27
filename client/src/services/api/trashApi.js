// ─────────────────────────────────────────────────────────
//  client/src/services/api/trashApi.js
//  Frontend API calls for the Recently Deleted / Trash system
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * Fetch all trash entries
 * @param {Object} options
 * @param {string} [options.entityType]  - "book"|"lexora_book"|"student"|"faculty"|"transaction"|"attendance"|"all"
 * @param {string} [options.search]      - search term
 */
export async function fetchTrash(options = {}) {
  try {
    const params = new URLSearchParams();
    if (options.entityType && options.entityType !== "all")
      params.append("entityType", options.entityType);
    if (options.search) params.append("search", options.search);

    const qs  = params.toString();
    const url = qs ? `${API_BASE}/trash?${qs}` : `${API_BASE}/trash`;
    const res = await fetch(url, { credentials: "include" });
    return await res.json();
  } catch (error) {
    console.error("[TrashAPI] fetchTrash:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Restore a single trash entry
 * @param {number} trashLogId
 */
export async function restoreTrashItem(trashLogId) {
  try {
    const res = await fetch(`${API_BASE}/trash/restore/${trashLogId}`, {
      method: "POST",
      credentials: "include",
    });
    return await res.json();
  } catch (error) {
    console.error("[TrashAPI] restoreTrashItem:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Permanently delete a single trash entry
 * @param {number} trashLogId
 */
export async function permanentDeleteTrashItem(trashLogId) {
  try {
    const res = await fetch(`${API_BASE}/trash/${trashLogId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await res.json();
  } catch (error) {
    console.error("[TrashAPI] permanentDeleteTrashItem:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Permanently delete ALL trash entries (or by entity type)
 * @param {string} [entityType]
 */
export async function permanentDeleteAllTrash(entityType = null) {
  try {
    const qs  = entityType ? `?entityType=${entityType}` : "";
    const res = await fetch(`${API_BASE}/trash/all${qs}`, {
      method: "DELETE",
      credentials: "include",
    });
    return await res.json();
  } catch (error) {
    console.error("[TrashAPI] permanentDeleteAllTrash:", error.message);
    return { success: false, error: error.message };
  }
}

export default {
  fetchTrash,
  restoreTrashItem,
  permanentDeleteTrashItem,
  permanentDeleteAllTrash,
};
