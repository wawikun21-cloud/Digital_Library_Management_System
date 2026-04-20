// ─────────────────────────────────────────────────────────
//  services/api/rfidApi.js
//  RFID API Service - Frontend API calls for RFID management
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

/**
 * POST /api/rfid/tap
 * Called by the Kiosk when an RFID card is scanned.
 * Returns:
 *   { success: true,  action: 'checked_in'|'checked_out', data }  — registered card
 *   { success: false, unregistered: true, rfid_code }             — unknown card
 */
export async function tapRfid(rfidCode) {
  try {
    const res = await fetch(
      `${API_BASE}/api/rfid/tap`,
      withCreds({ method: "POST", body: JSON.stringify({ rfid_code: rfidCode }) })
    );
    return await res.json();
  } catch (error) {
    console.error("[rfidApi.tapRfid]", error);
    return { success: false, error: error.message };
  }
}

/**
 * POST /api/rfid/register
 * Called by the Admin Registration Modal on the Attendance page.
 * Links an RFID card code to a student_id_number.
 */
export async function registerRfid(rfidCode, studentIdNumber) {
  try {
    const res = await fetch(
      `${API_BASE}/api/rfid/register`,
      withCreds({
        method: "POST",
        body: JSON.stringify({ rfid_code: rfidCode, student_id_number: studentIdNumber }),
      })
    );
    return await res.json();
  } catch (error) {
    console.error("[rfidApi.registerRfid]", error);
    return { success: false, error: error.message };
  }
}

/**
 * GET /api/rfid/simulate?rfid_code=xxx
 * Simulates an RFID tap from the browser (testing without hardware).
 * Used by the RFID Detection modal on the Attendance page.
 */
export async function simulateRfidTap(rfidCode) {
  try {
    const res = await fetch(
      `${API_BASE}/api/rfid/simulate?rfid_code=${encodeURIComponent(rfidCode)}`,
      withCreds()
    );
    return await res.json();
  } catch (error) {
    console.error("[rfidApi.simulateRfidTap]", error);
    return { success: false, error: error.message };
  }
}

/**
 * GET /api/rfid
 * Get all registered RFID cards.
 */
export async function getAllRfidCards() {
  try {
    const res = await fetch(`${API_BASE}/api/rfid`, withCreds());
    return await res.json();
  } catch (error) {
    console.error("[rfidApi.getAllRfidCards]", error);
    return { success: false, error: error.message };
  }
}

/**
 * DELETE /api/rfid/:id
 * Remove an RFID card registration.
 */
export async function deleteRfidCard(id) {
  try {
    const res = await fetch(
      `${API_BASE}/api/rfid/${id}`,
      withCreds({ method: "DELETE" })
    );
    return await res.json();
  } catch (error) {
    console.error("[rfidApi.deleteRfidCard]", error);
    return { success: false, error: error.message };
  }
}

export default {
  tapRfid,
  registerRfid,
  simulateRfidTap,
  getAllRfidCards,
  deleteRfidCard,
};