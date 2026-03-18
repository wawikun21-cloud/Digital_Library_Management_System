// ─────────────────────────────────────────────────────────
//  services/api/studentsApi.js
//  Students API Service - Frontend API calls for student management
// ─────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Get all students
 */
export async function getAllStudents() {
  try {
    const response = await fetch(`${API_BASE}/api/students`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting all students:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get student by ID
 */
export async function getStudentById(id) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting student by ID:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get student by student ID number
 */
export async function getStudentByStudentIdNumber(studentIdNumber) {
  try {
    const response = await fetch(`${API_BASE}/api/students/student-id/${studentIdNumber}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error getting student by student ID number:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a new student
 */
export async function createStudent(studentData) {
  try {
    const response = await fetch(`${API_BASE}/api/students`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a student
 */
export async function updateStudent(id, studentData) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a student
 */
export async function deleteStudent(id) {
  try {
    const response = await fetch(`${API_BASE}/api/students/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error deleting student:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Bulk import students from Excel
 */
export async function bulkImportStudents(studentsData) {
  try {
    const response = await fetch(`${API_BASE}/api/students/bulk-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studentsData),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error bulk importing students:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get student statistics
 */
export async function getStudentStats() {
  try {
    const response = await fetch(`${API_BASE}/api/students/stats`);
    const data = await response.json();
    return data;
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
