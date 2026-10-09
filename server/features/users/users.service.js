const usersRepo = require("./users.repository");
const bcrypt = require("bcryptjs");
const ROLES = require("../../middleware/authMiddleware").ROLES;

const CREATABLE_ROLES = [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT];
const STAFF_ROLES = [ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF];

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

async function listUsers(requester, filters = {}) {
  return usersRepo.listUsers(filters);
}

async function getUserById(id) {
  return usersRepo.findById(id);
}

async function getUserStats() {
  return usersRepo.getStats();
}

async function createUser(requester, userData) {
  const { role, email, username } = userData;

  if (!CREATABLE_ROLES.includes(role)) {
    const err = new Error("Invalid role");
    err.code = "BAD_REQUEST";
    throw err;
  }

  if (!canManageTarget(role, requester.role)) {
    const err = new Error("Forbidden: cannot create this role");
    err.code = "FORBIDDEN";
    throw err;
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

  return usersRepo.create(userData);
}

async function updateUser(requester, id, updates) {
  const existing = await usersRepo.findById(id);
  if (!existing) {
    const err = new Error("User not found");
    err.code = "NOT_FOUND";
    throw err;
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
};
