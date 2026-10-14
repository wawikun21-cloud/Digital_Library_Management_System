const usersRepo = require("./users.repository");
const bcrypt = require("bcryptjs");
const { pool } = require("../../config/db");
const ROLES = require("../../middleware/authMiddleware").ROLES;

const CREATABLE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT];
const STAFF_ROLES = [ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF];

/**
 * Validates that a department belongs to the given school.
 * Returns { ok, error } — never trusts client-supplied pairing.
 */
async function departmentBelongsToSchool(departmentId, schoolId) {
  const [rows] = await pool.query(
    "SELECT id FROM departments WHERE id = ? AND school_id = ? LIMIT 1",
    [departmentId, schoolId]
  );
  return rows.length > 0;
}

async function schoolExists(schoolId) {
  const [rows] = await pool.query(
    "SELECT id FROM schools WHERE id = ? LIMIT 1",
    [schoolId]
  );
  return rows.length > 0;
}

function canManageTarget(targetRole, requesterRole) {
  if (requesterRole === ROLES.SUPER_ADMIN) return true;
  if (requesterRole === ROLES.ADMIN) {
    return targetRole !== ROLES.SUPER_ADMIN && targetRole !== ROLES.ADMIN;
  }
  return false;
}

function canChangeRole(targetRole, requesterRole, newRole) {
  if (requesterRole === ROLES.SUPER_ADMIN) return true;
  if (requesterRole === ROLES.ADMIN) {
    if (newRole === ROLES.SUPER_ADMIN || newRole === ROLES.ADMIN) return false;
    if (targetRole === ROLES.SUPER_ADMIN || targetRole === ROLES.ADMIN) return false;
    return true;
  }
  return false;
}

function canDeactivateTarget(targetRole, requesterRole) {
  if (requesterRole === ROLES.SUPER_ADMIN) return true;
  if (requesterRole === ROLES.ADMIN) {
    return targetRole !== ROLES.SUPER_ADMIN && targetRole !== ROLES.ADMIN;
  }
  return false;
}

async function listUsers(requester, filters = {}, scope = null) {
  return usersRepo.listUsers(filters, scope);
}

async function getUserById(id) {
  return usersRepo.findById(id);
}

async function getUserStats(scope = null) {
  return usersRepo.getStats(scope);
}

async function createUser(requester, userData, scope = null) {
  const { role, email, username } = userData;

  if (!CREATABLE_ROLES.includes(role)) {
    const err = new Error("Invalid role");
    err.code = "BAD_REQUEST";
    throw err;
  }

  // Students have exactly one creation surface: /api/users/students
  if (role === ROLES.STUDENT) {
    const err = new Error("Students must be created through the student endpoints");
    err.code = "BAD_REQUEST";
    throw err;
  }

  if (!canManageTarget(role, requester.role)) {
    const err = new Error("Forbidden: cannot create this role");
    err.code = "FORBIDDEN";
    throw err;
  }

  // ── School scope ────────────────────────────────────────
  let schoolId = userData.school_id ?? null;
  let departmentId = userData.department_id ?? null;

  if (scope && scope.scoped) {
    // Scoped admin/librarian/staff can only create users in their own school.
    if (schoolId != null && Number(schoolId) !== Number(scope.schoolId)) {
      const err = new Error("Forbidden: you can only create users in your own school");
      err.code = "FORBIDDEN";
      throw err;
    }
    schoolId = scope.schoolId;
  }
  if (schoolId != null && !(await schoolExists(schoolId))) {
    const err = new Error("School not found");
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (departmentId != null) {
    if (schoolId == null) {
      const err = new Error("Assign a school before assigning a department");
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (!(await departmentBelongsToSchool(departmentId, schoolId))) {
      const err = new Error("Department must belong to the assigned school");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }
  // Admins must be anchored to a school.
  if (role === ROLES.ADMIN && schoolId == null && scope && scope.scoped) {
    schoolId = scope.schoolId;
  }

  const existing = await usersRepo.findByUsername(username);
  if (existing) {
    const err = new Error("Username already exists");
    err.code = "CONFLICT";
    throw err;
  }

  if (email) {
    const byEmail = await usersRepo.findByEmail(email);
    if (byEmail) {
      const err = new Error("Email already in use");
      err.code = "CONFLICT";
      throw err;
    }
  }

  return usersRepo.create({ ...userData, school_id: schoolId, department_id: departmentId });
}

async function updateUser(requester, id, updates, scope = null) {
  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  // ── School scope: admins may only edit users of their own school ──
  if (scope && scope.scoped && scope.schoolId != null) {
    if (existing.school_id == null || existing.school_id !== scope.schoolId) {
      const err = new Error("Forbidden: user belongs to another school");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  // Only super_admin may move a user to a different school.
  if (updates.school_id !== undefined && requester.role !== ROLES.SUPER_ADMIN) {
    if (Number(updates.school_id ?? -1) !== Number(existing.school_id ?? -1)) {
      const err = new Error("Forbidden: only a super admin can change a user's school");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  if (existing.id === requester.id) {
    const allowed = ["username", "password", "avatar_url", "full_name", "email"];
    const filtered = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        filtered[key] = updates[key];
      }
    }

    if (filtered.email && filtered.email !== existing.email) {
      const byEmail = await usersRepo.findByEmail(filtered.email);
      if (byEmail && byEmail.id !== existing.id) {
        const err = new Error("Email already in use");
        err.code = "CONFLICT";
        throw err;
      }
    }

    if (filtered.username && filtered.username !== existing.username) {
      const byName = await usersRepo.findByUsername(filtered.username);
      if (byName && byName.id !== existing.id) {
        const err = new Error("Username already taken");
        err.code = "CONFLICT";
        throw err;
      }
    }

    return usersRepo.update(id, filtered);
  }

  if (!canManageTarget(existing.role, requester.role)) {
    const err = new Error("Forbidden: cannot modify this user");
    err.code = "FORBIDDEN";
    throw err;
  }

  if (updates.role && updates.role !== existing.role) {
    if (!canChangeRole(existing.role, requester.role, updates.role)) {
      const err = new Error("Forbidden: cannot change role to that value");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  // ── Department must belong to the user's school ─────────
  if (updates.department_id !== undefined && updates.department_id !== null) {
    const targetSchoolId = updates.school_id ?? existing.school_id;
    if (targetSchoolId == null) {
      const err = new Error("Assign a school before assigning a department");
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (!(await departmentBelongsToSchool(updates.department_id, targetSchoolId))) {
      const err = new Error("Department must belong to the user's school");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  if (updates.school_id !== undefined && updates.school_id !== null) {
    if (!(await schoolExists(updates.school_id))) {
      const err = new Error("School not found");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  const updateData = { ...updates };
  delete updateData.role;

  if (updateData.email && updateData.email !== existing.email) {
    const byEmail = await usersRepo.findByEmail(updateData.email);
    if (byEmail && byEmail.id !== existing.id) {
      const err = new Error("Email already in use");
      err.code = "CONFLICT";
      throw err;
    }
  }

  return usersRepo.update(id, updateData);
}

async function changeUserRole(requester, id, newRole, reason) {
  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (!canChangeRole(existing.role, requester.role, newRole)) {
    const err = new Error("Forbidden: cannot change role to that value");
    err.code = "FORBIDDEN";
    throw err;
  }

  return usersRepo.updateRole(id, newRole, requester.id, reason);
}

async function changePassword(requester, id, newPassword, confirmPassword) {
  if (!newPassword || newPassword.length < 6) {
    const err = new Error("Password must be at least 6 characters");
    err.code = "BAD_REQUEST";
    throw err;
  }

  if (newPassword !== confirmPassword) {
    const err = new Error("Passwords do not match");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (existing.id === requester.id) {
    return usersRepo.update(id, { password: newPassword });
  }

  if (!canManageTarget(existing.role, requester.role)) {
    const err = new Error("Forbidden: cannot modify this user");
    err.code = "FORBIDDEN";
    throw err;
  }

  return usersRepo.update(id, { password: newPassword });
}

async function deactivateUser(requester, id) {
  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (existing.id === requester.id) {
    const err = new Error("Cannot deactivate your own account");
    err.code = "BAD_REQUEST";
    throw err;
  }

  if (!canDeactivateTarget(existing.role, requester.role)) {
    const err = new Error("Forbidden: cannot deactivate this user");
    err.code = "FORBIDDEN";
    throw err;
  }

  return usersRepo.deactivate(id);
}

async function reactivateUser(requester, id) {
  if (requester.role !== ROLES.SUPER_ADMIN && requester.role !== ROLES.ADMIN) {
    const err = new Error("Forbidden: requires Super Admin or Admin");
    err.code = "FORBIDDEN";
    throw err;
  }

  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (existing.role === ROLES.SUPER_ADMIN || existing.role === ROLES.ADMIN) {
    if (requester.role !== ROLES.SUPER_ADMIN) {
      const err = new Error("Forbidden: only Super Admin can reactivate Admin/Super Admin");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  return usersRepo.reactivate(id);
}

async function getCurrentUser(id) {
  return usersRepo.findById(id);
}

// ══════════════════════════════════════════════════════════
//  Student users — students are users with role = 'student'
//  (students table retired). One creation surface, one rule
//  set: school-scoped, department ∈ school, default
//  credentials applied server-side only.
// ══════════════════════════════════════════════════════════

/** Applies the default-credential rule server-side: username = password = student_id_number. */
function applyStudentCredentials(userData) {
  const studentIdNumber = (userData.student_id_number || "").trim();
  return {
    ...userData,
    role: ROLES.STUDENT,
    username: studentIdNumber,
    password: studentIdNumber,
    // users.employment_status is NOT NULL — students carry "Student".
    employment_status: "Student",
    must_change_password: 1,
  };
}

async function listStudentUsers(requester, filters = {}, scope = null) {
  return usersRepo.listStudentUsers(filters, scope);
}

async function getStudentUserStats(scope = null) {
  return usersRepo.getStudentStats(scope);
}

async function getStudentUserById(scope, id) {
  const user = await usersRepo.findStudentUserById(id, scope);
  return user;
}

/**
 * Kiosk lookup: returns the student user WITH school/department so
 * the caller can apply the fail-closed check-in rule.
 */
async function getStudentUserByStudentId(studentIdNumber) {
  return usersRepo.findStudentUserByStudentId(studentIdNumber);
}

async function searchStudentUsers(scope, term) {
  return usersRepo.findStudentUsersByStudentId(term, scope);
}

async function createStudentUser(requester, userData, scope = null) {
  if (!userData.student_id_number || !userData.student_id_number.trim()) {
    const err = new Error("Student ID number is required");
    err.code = "BAD_REQUEST";
    throw err;
  }

  // ── School scope ────────────────────────────────────────
  let schoolId = userData.school_id ?? null;
  let departmentId = userData.department_id ?? null;

  if (scope && scope.scoped) {
    if (schoolId != null && Number(schoolId) !== Number(scope.schoolId)) {
      const err = new Error("Forbidden: you can only create students in your own school");
      err.code = "FORBIDDEN";
      throw err;
    }
    schoolId = scope.schoolId;
  }
  if (schoolId != null && !(await schoolExists(schoolId))) {
    const err = new Error("School not found");
    err.code = "BAD_REQUEST";
    throw err;
  }
  if (departmentId != null) {
    if (schoolId == null) {
      const err = new Error("Assign a school before assigning a department");
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (!(await departmentBelongsToSchool(departmentId, schoolId))) {
      const err = new Error("Department must belong to the assigned school");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  // Unique student id / username check (both derive from the ID number).
  const existing = await usersRepo.findByStudentIdNumber(userData.student_id_number.trim());
  if (existing) {
    const err = new Error("Student ID number already exists");
    err.code = "CONFLICT";
    throw err;
  }
  const byUsername = await usersRepo.findByUsername(userData.student_id_number.trim());
  if (byUsername) {
    const err = new Error("Student ID number already exists");
    err.code = "CONFLICT";
    throw err;
  }

  const payload = applyStudentCredentials({
    ...userData,
    student_id_number: userData.student_id_number.trim(),
    full_name: userData.full_name || userData.display_name || userData.student_name || null,
    school_id: schoolId,
    department_id: departmentId,
    // The login email column is NOT used for students (it is UNIQUE and
    // shared); the contact email lives in student_email.
    email: null,
  });

  const { id } = await usersRepo.create(payload);
  return { id, credentialsDefaulted: true };
}

async function updateStudentUser(requester, id, updates, scope = null) {
  const existing = await usersRepo.findStudentUserById(id);
  if (!existing) {
    const err = new Error("Student not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  if (scope && scope.scoped && scope.schoolId != null) {
    if (existing.school_id == null || existing.school_id !== scope.schoolId) {
      const err = new Error("Forbidden: student belongs to another school");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  // Only super_admin may change the school (or the student id number that
  // anchors attendance/RFID identity).
  if (updates.school_id !== undefined && requester.role !== ROLES.SUPER_ADMIN) {
    if (Number(updates.school_id ?? -1) !== Number(existing.school_id ?? -1)) {
      const err = new Error("Forbidden: only a super admin can change a student's school");
      err.code = "FORBIDDEN";
      throw err;
    }
  }

  const updateData = { ...updates };

  if (updateData.student_id_number !== undefined
      && updateData.student_id_number.trim() !== existing.student_id_number) {
    const newId = updateData.student_id_number.trim();
    if (!newId) {
      const err = new Error("Student ID number cannot be empty");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const clash = await usersRepo.findByStudentIdNumber(newId);
    if (clash && clash.id !== existing.id) {
      const err = new Error("Student ID number already exists");
      err.code = "CONFLICT";
      throw err;
    }
    // The username follows the student id (default-credential identity).
    const nameClash = await usersRepo.findByUsername(newId);
    if (nameClash && nameClash.id !== existing.id) {
      const err = new Error("Student ID number already exists");
      err.code = "CONFLICT";
      throw err;
    }
    updateData.student_id_number = newId;
    updateData.username = newId;
  }

  if (updateData.department_id !== undefined && updateData.department_id !== null) {
    const targetSchoolId = updateData.school_id ?? existing.school_id;
    if (targetSchoolId == null) {
      const err = new Error("Assign a school before assigning a department");
      err.code = "BAD_REQUEST";
      throw err;
    }
    if (!(await departmentBelongsToSchool(updateData.department_id, targetSchoolId))) {
      const err = new Error("Department must belong to the student's school");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  if (updateData.school_id !== undefined && updateData.school_id !== null) {
    if (!(await schoolExists(updateData.school_id))) {
      const err = new Error("School not found");
      err.code = "BAD_REQUEST";
      throw err;
    }
  }

  // Password is never accepted through the student update path.
  delete updateData.password;
  delete updateData.role;

  if (updateData.full_name !== undefined && updates.display_name !== undefined) {
    delete updateData.display_name;
  }

  await usersRepo.update(id, updateData);
  return usersRepo.findStudentUserById(id);
}

/**
 * Soft-delete for student users = deactivate (the users table has no
 * soft-delete columns; the users page already exposes reactivate).
 */
async function deleteStudentUser(requester, id, scope = null) {
  const existing = await usersRepo.findStudentUserById(id);
  if (!existing) {
    const err = new Error("Student not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  if (scope && scope.scoped && scope.schoolId != null) {
    if (existing.school_id == null || existing.school_id !== scope.schoolId) {
      const err = new Error("Forbidden: student belongs to another school");
      err.code = "FORBIDDEN";
      throw err;
    }
  }
  return usersRepo.deactivate(id);
}

/**
 * Bulk import of student users. Every row is classified — never silently
 * dropped: the result report carries per-row status and reason.
 */
async function bulkImportStudentUsers(requester, rows, scope = null) {
  const report = { imported: 0, failed: 0, results: [] };
  if (!Array.isArray(rows)) {
    const err = new Error("Request body must be an array of students");
    err.code = "BAD_REQUEST";
    throw err;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const result = await createStudentUser(requester, row, scope);
      report.imported++;
      report.results.push({
        index: i,
        status: "imported",
        student_id_number: row.student_id_number ?? null,
        id: result.id,
      });
    } catch (err) {
      report.failed++;
      report.results.push({
        index: i,
        status: "failed",
        student_id_number: row?.student_id_number ?? null,
        name: row?.full_name ?? row?.display_name ?? row?.student_name ?? null,
        error: err.message,
      });
    }
  }
  return report;
}

module.exports = {
  listUsers,
  getUserById,
  getUserStats,
  createUser,
  updateUser,
  changeUserRole,
  changePassword,
  deactivateUser,
  reactivateUser,
  getCurrentUser,
  canManageTarget,
  canChangeRole,
  canDeactivateTarget,
  STAFF_ROLES,
  // Student users
  listStudentUsers,
  getStudentUserStats,
  getStudentUserById,
  getStudentUserByStudentId,
  searchStudentUsers,
  createStudentUser,
  updateStudentUser,
  deleteStudentUser,
  bulkImportStudentUsers,
};
