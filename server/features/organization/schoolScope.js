// ─────────────────────────────────────────────────────────
//  features/organization/schoolScope.js
//
//  Resolves the caller's school scope on every request.
//
//  The scope is read FRESH from the database on each request that
//  mounts this middleware — never from the session. If an admin
//  reassigns a user's school, the change takes effect on that
//  user's very next request instead of at next login.
//
//  Scope shape (attached as req.schoolScope):
//    {
//      role,          // authoritative role from the users row
//      schoolId,      // null for super_admin and legacy (unassigned) users
//      departmentId,  // null = all departments within the school
//      scoped,        // true when school-level restrictions apply
//      featureSet,   // this school's module license:
//                     // 'both' (default) | 'library' | 'lexora'
//                     // null for unscoped callers — treated as 'both'
//    }
// ─────────────────────────────────────────────────────────

const { pool } = require("../../config/db");

async function resolveSchoolScope(req, _res, next) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      // requireAuth rejects unauthenticated callers before this runs.
      req.schoolScope = null;
      return next();
    }

    if (sessionUser.role === "super_admin") {
      req.schoolScope = {
        role: "super_admin",
        schoolId: null,
        departmentId: null,
        scoped: false,
        featureSet: "both", // super_admin always sees every surface
      };
      return next();
    }

    const [rows] = await pool.query(
      `SELECT u.role, u.school_id, u.department_id, s.feature_set
         FROM users u
         LEFT JOIN schools s ON s.id = u.school_id
        WHERE u.id = ? LIMIT 1`,
      [sessionUser.id]
    );

    if (!rows.length) {
      req.schoolScope = null;
      return next();
    }

    const user = rows[0];
    req.schoolScope = {
      role: user.role,
      schoolId: user.school_id ?? null,
      departmentId: user.department_id ?? null,
      scoped: user.school_id != null,
      // NULL / legacy schools → 'both' (no restriction, preserves behavior).
      featureSet: user.feature_set || "both",
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

/** True when school-level restrictions apply to this request. */
function isScoped(scope) {
  return !!scope && scope.scoped === true;
}

module.exports = { resolveSchoolScope, isScoped };
