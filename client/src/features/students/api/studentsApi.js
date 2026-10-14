// ─────────────────────────────────────────────────────────
//  features/students/api/studentsApi.js
//
//  Thin wrapper over the users feature's public API (the students
//  table is retired — students are users with role='student').
//  Every call pins role='student' and forwards school/department
//  from the form. No password is ever sent: the server applies the
//  default-credential rule (username = password = student ID).
// ─────────────────────────────────────────────────────────

import {
  fetchStudentUsers,
  searchStudentUsers,
  fetchStudentUserStats,
  checkStudentIdExists,
  createStudentUser,
  updateStudentUser,
  deleteStudentUser,
  bulkImportStudentUsers,
} from "../../users";

export async function getAllStudents(params = {}) {
  return fetchStudentUsers(params);
}

/** Student-users search for lookups (kiosk, RFID registration). */
export async function searchStudents(term) {
  return searchStudentUsers(term);
}

export async function getStudentStats() {
  return fetchStudentUserStats();
}

export { checkStudentIdExists };

/** Name field maps onto the user's full_name. */
export async function createStudent(studentData) {
  const { student_name, display_name, full_name, ...rest } = studentData;
  return createStudentUser({
    ...rest,
    role: "student",
    full_name: full_name || display_name || student_name || null,
  });
}

export async function updateStudent(id, studentData) {
  const { student_name, display_name, full_name, ...rest } = studentData;
  const name = full_name || display_name || student_name;
  return updateStudentUser(id, {
    ...rest,
    role: "student",
    ...(name !== undefined ? { full_name: name || null } : {}),
  });
}

/** Delete a student-user (students live in the users table). */
export async function deleteStudent(id) {
  return deleteStudentUser(id);
}

/** Per-row import report: { imported, failed, results[] }. */
export async function bulkImportStudents(rows) {
  return bulkImportStudentUsers(rows);
}

export default {
  getAllStudents,
  searchStudents,
  getStudentStats,
  checkStudentIdExists,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkImportStudents,
};
