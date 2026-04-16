// ─────────────────────────────────────────────────────────
//  services/api/studentsApi.js
//  Students API Service - Frontend API calls for student management
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Always send the session cookie */
const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

export async function getAllStudents() {
  try {
    const response = await fetch(`${API_BASE}/api/students`, withCreds());
    return await response.json();
  } catch (error) {
    console.error("Error getting all students:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentById(id) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`, withCreds());
    return await response.json();
  } catch (error) {
    console.error("Error getting student by ID:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentByStudentIdNumber(studentIdNumber) {
  try {
    const response = await fetch(`${API_BASE}/api/students/student-id/${studentIdNumber}`, withCreds());
    return await response.json();
  } catch (error) {
    console.error("Error getting student by student ID number:", error);
    return { success: false, error: error.message };
  }
}

export async function createStudent(studentData) {
  try {
    const response = await fetch(`${API_BASE}/api/students`,
      withCreds({ method: "POST", body: JSON.stringify(studentData) })
    );
    return await response.json();
  } catch (error) {
    console.error("Error creating student:", error);
    return { success: false, error: error.message };
  }
}

export async function updateStudent(id, studentData) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`,
      withCreds({ method: "PUT", body: JSON.stringify(studentData) })
    );
    return await response.json();
  } catch (error) {
    console.error("Error updating student:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStudent(id) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`, withCreds({ method: "DELETE" }));
    return await response.json();
  } catch (error) {
    console.error("Error deleting student:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkImportStudents(studentsData) {
  try {
    const response = await fetch(`${API_BASE}/api/students/bulk-import`,
      withCreds({ method: "POST", body: JSON.stringify(studentsData) })
    );
    return await response.json();
  } catch (error) {
    console.error("Error bulk importing students:", error);
    return { success: false, error: error.message };
  }
}

export async function getStudentStats() {
  try {
    const response = await fetch(`${API_BASE}/api/students/stats`, withCreds());
    return await response.json();
  } catch (error) {
    console.error("Error getting student statistics:", error);
    return { success: false, error: error.message };
  }
}

export default {
  getAllStudents,
  getStudentById,
  getStudentByStudentIdNumber,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
  getStudentStats,
};