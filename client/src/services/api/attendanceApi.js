// ─────────────────────────────────────────────────────────
//  services/api/attendanceApi.js
//  Attendance API Service - Frontend API calls for attendance management
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Get all attendance records
 */
export async function getAllAttendance() {
  try {
    const response = await fetch(`${API_BASE}/api/attendance`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting all attendance records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get active attendance records (checked in)
 */
export async function getActiveAttendance() {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/active`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting active attendance records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get attendance records by student ID number
 */
export async function getAttendanceByStudentId(studentIdNumber) {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/student/${studentIdNumber}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting student attendance records:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get attendance statistics
 */
export async function getAttendanceStats() {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/stats`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting attendance statistics:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check in a student
 */
export async function checkIn(attendanceData) {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/check-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attendanceData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking in student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check out a student
 */
export async function checkOut(studentIdNumber) {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/check-out/${studentIdNumber}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking out student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an attendance record
 */
export async function deleteAttendance(id) {
  try {
    const response = await fetch(`${API_BASE}/api/attendance/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting attendance record:", error);
    return { success: false, error: error.message };
  }
}

export default {
  getAllAttendance,
  getActiveAttendance,
  getAttendanceByStudentId,
  getAttendanceStats,
  checkIn,
  checkOut,
  deleteAttendance,
};
