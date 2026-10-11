/**
 * Pure permission-state logic for the roles editor — ported for parity with
 * LMS-SOP's `rolesPermissionHelpers.js`.
 *
 * No React, no HTTP. Every function here is directly unit-testable, which is
 * why the state derivation lives outside the components.
 */

export const CATEGORY_LABELS = {
  dashboard: "Dashboard",
  reports: "Reports",
  books: "Books",
  lexora: "Lexora E-Books",
  transactions: "Transactions",
  trash: "Recently Deleted",
  audit: "Audit",
  attendance: "Attendance",
  students: "Students",
  faculty: "Faculty",
  rfid: "RFID",
  courses: "Courses",
  users: "Users",
  settings: "Settings",
  tools: "Tools",
  roles: "Roles & Permissions",
};

/** Fallback action sets for a permission whose `actions` column is unusable. */
export const FALLBACK_ACTIONS = {
  view_dashboard: ["view"],
  manage_books: ["view", "create", "edit", "delete", "import"],
  manage_lexora_books: ["view", "create", "edit", "delete", "publish", "archive", "import"],
  view_lexora_books: ["view", "read", "download"],
  manage_transactions: ["view", "create", "edit", "return", "extend", "delete", "pay_fine"],
  manage_trash: ["view", "restore", "delete"],
  view_audit_logs: ["view", "export"],
  manage_attendance: ["view", "create", "edit", "delete", "export"],
  manage_students: ["view", "create", "edit", "delete", "import"],
  manage_faculty: ["view", "create", "edit", "delete", "import"],
  use_kiosk: ["check_in", "check_out"],
  manage_rfid: ["view", "register", "delete"],
  manage_courses: ["view", "create", "edit", "delete", "publish", "archive", "enroll", "grade", "approve", "submit_review"],
  view_course_library: ["view", "enroll", "complete"],
  manage_users: ["view", "create", "edit", "delete", "manage_roles", "reactivate"],
  manage_settings: ["view", "create", "edit", "delete", "reorder"],
  manage_tools: ["view", "create", "edit", "delete"],
  use_tools: ["view", "download"],
  view_reports: ["view", "export"],
  manage_permissions: ["view", "edit"],
};

/** Parse an `actions` value (array, JSON string, or null) into string[]. */
export function parseActions(actionsJson) {
  if (!actionsJson) return [];
  let arr = actionsJson;
  if (typeof arr === "string") {
    try { arr = JSON.parse(arr); } catch { return []; }
  }
  return Array.isArray(arr) ? arr.filter((a) => typeof a === "string") : [];
}

/** The actions a permission defines, with the fallback for a bad column. */
export function getDefinedActions(permission) {
  const defined = parseActions(permission?.actions);
  if (defined.length > 0 || Array.isArray(permission?.actions)) return defined;
  return FALLBACK_ACTIONS[permission?.name] || [];
}

/**
 * Entity type → the permission that governs access to it.
 * Only types whose governing permission is granted appear in the
 * Access Restrictions panel.
 */
export const ENTITY_TYPE_CONFIG = {
  books:        { permission: "manage_books",         label: "Books",            actions: ["view", "create", "edit", "delete"] },
  lexora_books: { permission: "manage_lexora_books",  label: "Lexora E-Books",   actions: ["view", "create", "edit", "delete"] },
  courses:      { permission: "manage_courses",       label: "Courses",          actions: ["view", "create", "edit", "delete", "publish", "archive", "enroll", "grade"] },
  users:        { permission: "manage_users",         label: "Users",            actions: ["view", "create", "edit", "delete"] },
  tools:        { permission: "manage_tools",         label: "Tools",            actions: ["view", "create", "edit", "delete"] },
};

export const ENTITY_TYPES = Object.keys(ENTITY_TYPE_CONFIG);

/**
 * Role editor state: every permission with its defined actions and the
 * subset the role currently selects.
 */
export function computeRolePermState(allPermissions, rolePermActions) {
  return (allPermissions || []).map((perm) => {
    const defined = getDefinedActions(perm);
    const selected = rolePermActions?.[perm.name];
    // `selected` is undefined for a permission the role does not grant. The
    // short-circuit used to leak that through, so `granted` came out as
    // undefined rather than false — falsy either way, but not a boolean.
    const isGranted = !!(selected && selected.size > 0);
    return {
      name: perm.name,
      display_name: perm.display_name,
      category: perm.category || "other",
      granted: isGranted,
      definedActions: defined,
      selectedActions: isGranted ? Array.from(selected) : [],
      useDefaults: isGranted && selected.size === defined.length,    };
  });
}

/**
 * User editor state: the role's grants with the user's overrides applied.
 * An override can only narrow — `granted: false` removes the permission.
 */
export function computeUserPermState(rolePerms, userOverrides) {
  if (!rolePerms || rolePerms.length === 0) return [];
  const overrideMap = new Map((userOverrides || []).map((o) => [o.permission_name, o]));

  return rolePerms.map((perm) => {
    const defined = getDefinedActions(perm);
    const override = overrideMap.get(perm.name);

    if (override) {
      if (!override.granted) {
        return { ...perm, granted: false, definedActions: defined, selectedActions: [], useDefaults: false };
      }
      const userActions = override.actions === null || override.actions === undefined
        ? defined
        : parseActions(override.actions).filter((a) => defined.includes(a));
      return { ...perm, granted: true, definedActions: defined, selectedActions: userActions, useDefaults: false };
    }
    return { ...perm, granted: true, definedActions: defined, selectedActions: [...defined], useDefaults: true };
  });
}

/** Permission states grouped by category, categories sorted for display. */
export function groupByCategory(permStates) {
  return (permStates || []).reduce((acc, perm) => {
    const cat = perm.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {});
}

/** Is this entity type restrictable, i.e. is its governing permission granted? */
export function hasRestrictablePermission(permStates, entityType) {
  const config = ENTITY_TYPE_CONFIG[entityType];
  if (!config) return false;
  const perm = permStates.find((p) => p.name === config.permission);
  return perm ? perm.granted : false;
}

/**
 * Override rows to persist for a user. Only permissions the role grants are
 * considered; a permission left at "all defined actions" produces no row.
 */
export function computeUserOverridesToSave(permStates, rolePerms) {
  if (!rolePerms) return [];
  const rolePermNames = new Set(rolePerms.map((p) => p.name));
  const overrides = [];

  for (const state of permStates) {
    if (!rolePermNames.has(state.name)) continue;

    const defined = state.definedActions;
    const selected = state.selectedActions;

    if (!state.granted) {
      overrides.push({ permission_name: state.name, granted: false, actions: [] });
      continue;
    }

    const isAllActions = selected.length === defined.length && defined.every((a) => selected.includes(a));
    if (!isAllActions) {
      if (selected.length > 0) {
        overrides.push({ permission_name: state.name, granted: true, actions: selected });
      } else {
        overrides.push({ permission_name: state.name, granted: false, actions: [] });
      }
    }
  }

  return overrides;
}

/**
 * Entity override rows to persist. Scope 'denied' blocks every known entity;
 * 'selected' grants only the checked ids.
 */
export function computeEntityOverridesToSave(entityStates) {
  const overrides = [];

  for (const [entityType, state] of Object.entries(entityStates || {})) {
    const config = ENTITY_TYPE_CONFIG[entityType];
    if (!config) continue;

    if (state.scope === "denied") {
      for (const entity of state.entities || []) {
        overrides.push({
          permission_name: config.permission,
          entity_type: entityType,
          entity_id: entity.id,
          granted: false,
          actions: [],
        });
      }
      continue;
    }

    if (state.scope !== "selected") continue;

    state.selectedIds.forEach((id) => {
      overrides.push({
        permission_name: config.permission,
        entity_type: entityType,
        entity_id: id,
        granted: true,
        actions: config.actions,
      });
    });
  }

  return overrides;
}

/** Entity panel state from the user's existing override rows. */
export function initEntityStates(existingOverrides) {
  const states = {};

  for (const entityType of ENTITY_TYPES) {
    const config = ENTITY_TYPE_CONFIG[entityType];
    const grantedOverrides = (existingOverrides || []).filter(
      (o) => o.permission_name === config.permission && o.entity_type === entityType && o.granted
    );
    const deniedOverrides = (existingOverrides || []).filter(
      (o) => o.permission_name === config.permission && o.entity_type === entityType && !o.granted
    );
    const isAllDenied = deniedOverrides.length > 0 && grantedOverrides.length === 0;

    states[entityType] = {
      entities: [],
      search: "",
      scope: isAllDenied ? "denied" : grantedOverrides.length > 0 ? "selected" : "all",
      selectedIds: new Set(grantedOverrides.map((o) => o.entity_id)),
      loaded: false,
    };
  }

  return states;
}

/**
 * Toggle one action for a user. Mirrors LMS-SOP's cycle:
 * full → remove action → remove last action denies the permission.
 */
export function toggleUserAction(userOverrides, permName, action, definedActions, roleHasPermission) {
  if (!roleHasPermission) return userOverrides;

  const existing = (userOverrides || []).find((o) => o.permission_name === permName);

  if (existing) {
    if (!existing.granted || (existing.actions != null && existing.actions.length === 0)) {
      return userOverrides.map((o) =>
        o.permission_name === permName
          ? { permission_name: permName, granted: true, actions: [...definedActions] }
          : o
      );
    }
    const currentActions = parseActions(existing.actions).filter((a) => definedActions.includes(a));
    if (currentActions.includes(action)) {
      const next = currentActions.filter((a) => a !== action);
      if (next.length === 0) {
        return userOverrides.map((o) =>
          o.permission_name === permName
            ? { permission_name: permName, granted: false, actions: [] }
            : o
        );
      }
      return userOverrides.map((o) =>
        o.permission_name === permName ? { ...o, actions: next } : o
      );
    }
    return userOverrides.map((o) =>
      o.permission_name === permName ? { ...o, actions: [...currentActions, action] } : o
    );
  }

  return [...userOverrides, {
    permission_name: permName,
    granted: true,
    actions: [...definedActions],
  }];
}

/** Permissions whose `actions` column is missing/unusable, for the UI badge. */
export function isFallbackPermission(permission) {
  const parsed = parseActions(permission?.actions);
  return parsed.length === 0 && !Array.isArray(permission?.actions);
}
