// ─────────────────────────────────────────────────────────
//  features/organization/attendanceAccess.service.js
//
//  Shared student-user / attendance access rules. Attendance
//  records scope through the linked student USER
//  (attendance.student_id_number → users.student_id_number
//  where role = 'student'), so no attendance backfill exists.
//
//  Student-user join contract for callers:
//    LEFT JOIN users st
//      ON st.student_id_number = a.student_id_number
//     AND st.role = 'student'
//
//  Visibility predicate (for a scoped caller u):
//    • super_admin or legacy (school_id NULL) caller → all records
//    • st.school_id IS NULL (student user unassigned) → visible (legacy)
//    • st.school_id = u.school AND (u.department IS NULL
//        OR st.department IS NULL OR st.department = u.department)
//
//  Kiosk check-in is the ONE fail-closed case: a scoped operator
//  may only tap a student user whose school matches (or is
//  NULL-legacy). A student from another school is rejected
//  before any record is written.
// ─────────────────────────────────────────────────────────

const { isScoped } = require("./schoolScope");

/**
 * SQL fragment for queries that (LEFT) JOIN users as the student link.
 * `alias` must match the JOIN's alias in the caller's query
 * (attendance model uses "s", analytics uses "st").
 */
function studentScopeSql(scope, alias = "st") {
  if (!isScoped(scope)) return { sql: "", params: [] };
  return {
    sql: `AND (
      ${alias}.school_id IS NULL
      OR (
        ${alias}.school_id = ?
        AND (? IS NULL OR ${alias}.department_id IS NULL OR ${alias}.department_id = ?)
      )
    )`,
    params: [scope.schoolId, scope.departmentId, scope.departmentId],
  };
}

/**
 * Fail-closed check used by tap/check-in: may this operator check
 * in a student user whose school/department are `studentSchoolId`
 * / `studentDepartmentId`?
 */
function canCheckInStudent(scope, student) {
  if (!isScoped(scope)) return true;
  const schoolId = student?.school_id ?? null;
  if (schoolId === null) return true; // legacy, unassigned student user
  if (schoolId !== scope.schoolId) return false;
  if (scope.departmentId != null && student?.department_id != null
      && student.department_id !== scope.departmentId) {
    return false;
  }
  return true;
}

module.exports = { studentScopeSql, canCheckInStudent };
