/**
 * Mount tests for the roles screens.
 *
 * These exercise every import and the pre-fetch branches. Effects do not run
 * under react-dom/server, so state a component would set inside an effect is
 * absent — the assertions below are chosen to match that deliberately.
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { computeRolePermState, computeUserPermState, initEntityStates, ENTITY_TYPE_CONFIG } from "../utils/rolesPermissionHelpers";
import PermissionsDrawer from "../components/PermissionsDrawer";
import RoleForm from "../components/RoleForm";
import RolesTable from "../components/RolesTable";
import UserPermissionsDrawer from "../components/UserPermissionsDrawer";

function textOf(html) {
  return html.replace(/<!-- -->/g, "");
}

beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
    setItem(k, v) { this.store.set(k, String(v)); },
    removeItem(k) { this.store.delete(k); },
  };
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ success: false }) });
});

const PERMISSIONS = [
  { name: "manage_books", display_name: "Manage Books", category: "books", actions: ["view", "create", "edit", "delete", "import"] },
  { name: "manage_trash", display_name: "Manage Recently Deleted", category: "trash", actions: ["view", "restore", "delete"] },
];

const ROLE_STATES = computeRolePermState(PERMISSIONS, { manage_books: new Set(["view", "create"]) });
const USER_STATES = computeUserPermState([PERMISSIONS[0]], []);

const baseProps = {
  saving: false,
  roles: [],
  onCancel: () => {},
  onSave: () => {},
  onRoleChange: () => {},
  onRoleActionToggle: () => {},
  onUserActionToggle: () => {},
  onResetRoleDefaults: () => {},
  onResetUserDefaults: () => {},
  onManageAccessRestrictions: () => {},
  onScopeToggle: () => {},
  onRecordToggle: () => {},
  onEntitySearch: () => {},
  onOpenUserEditor: () => {},
  onBackToEditUser: () => {},
};

describe("PermissionsDrawer — editRole", () => {
  it("renders the action grid and the role's users", () => {
    const html = textOf(renderToString(React.createElement(PermissionsDrawer, {
      ...baseProps,
      drawerMode: "editRole",
      drawerLoading: false,
      editRole: { name: "staff", display_name: "Staff", permissions: [] },
      rolePermStates: ROLE_STATES,
      editRoleUsers: [{ id: 1, full_name: "Ana Reyes", email: "ana@example.com" }],
      entityStates: {},
      visibleEntityTypes: [],
    })));

    expect(html).toContain("Edit: Staff");
    expect(html).toContain("Users with this role");
    expect(html).toContain("Manage Books");
    expect(html).toContain("restore");          // an action toggle label
    expect(html).toContain("Ana Reyes");
    expect(html).toContain("Reset changes");     // the role editor's own reset
  });
});

describe("PermissionsDrawer — editUser", () => {
  it("renders the role picker, quick links and action grid", () => {
    const html = textOf(renderToString(React.createElement(PermissionsDrawer, {
      ...baseProps,
      drawerMode: "editUser",
      drawerLoading: false,
      editUser: { id: 9, full_name: "Ana Reyes", role: "staff" },
      editUserNewRoleName: "staff",
      editUserOriginalRole: "staff",
      editUserRolePerms: [PERMISSIONS[0]],
      userPermStates: USER_STATES,
      roles: [{ name: "staff", display_name: "Staff", is_active: true }],
      entityStates: {},
      visibleEntityTypes: [],
    })));

    expect(html).toContain("Edit User: Ana Reyes");
    // One bulk action, named for what it does. "Grant all" was removed: a
    // user's permissions are bounded by their role, so granting every action
    // is indistinguishable from having no override. See resetUserDefaults.
    expect(html).toContain("Reset to role defaults");
    expect(html).not.toContain("Grant all");
    expect(html).toContain("Manage Access Restrictions");
    expect(html).toContain("Manage Books");
  });

  it("warns when the selected role differs from the original", () => {
    const html = textOf(renderToString(React.createElement(PermissionsDrawer, {
      ...baseProps,
      drawerMode: "editUser",
      drawerLoading: false,
      editUser: { id: 9, full_name: "Ana Reyes", role: "staff" },
      editUserNewRoleName: "librarian",
      editUserOriginalRole: "staff",
      editUserRolePerms: [PERMISSIONS[0]],
      userPermStates: USER_STATES,
      roles: [],
      entityStates: {},
      visibleEntityTypes: [],
    })));
    expect(html).toContain("Role will change on save");
  });
});

describe("PermissionsDrawer — accessRestrictions", () => {
  it("renders the scope control for each governable type", () => {
    const entityStates = initEntityStates([]);
    const html = textOf(renderToString(React.createElement(PermissionsDrawer, {
      ...baseProps,
      drawerMode: "accessRestrictions",
      drawerLoading: false,
      editUser: { id: 9, full_name: "Ana Reyes", role: "staff" },
      userPermStates: USER_STATES,
      entityStates,
      visibleEntityTypes: ["books"],
    })));

    expect(html).toContain("Access Restrictions for Ana Reyes");
    expect(html).toContain("Books");
    expect(html).toContain("has access to all books");
    expect(html).toContain("Done");
    // Courses is not in visibleEntityTypes, so its panel must not show.
    expect(html).not.toContain("has access to all courses");
  });
});

describe("RoleForm", () => {
  it("shows the name field only when creating", () => {
    const created = textOf(renderToString(React.createElement(RoleForm, {
      formData: {}, setFormData: () => {}, onSave: () => {}, saving: false,
      onCancel: () => {}, submitLabel: "Create Role", showName: true,
    })));
    expect(created).toContain("Role name");

    const edited = textOf(renderToString(React.createElement(RoleForm, {
      formData: {}, setFormData: () => {}, onSave: () => {}, saving: false,
      onCancel: () => {}, submitLabel: "Save Changes", showName: false,
    })));
    expect(edited).not.toContain("Role name");
  });
});

describe("RolesTable", () => {
  const roles = [
    { name: "staff", display_name: "Staff", user_count: 2, permission_count: 5 },
    { name: "librarian", display_name: "Librarian", user_count: 1, permission_count: 6 },
  ];

  it("renders a row per role with counts and actions", () => {
    const html = textOf(renderToString(React.createElement(RolesTable, {
      roles, search: "", onSearch: () => {}, onRoleClick: () => {},
      onEditClick: () => {}, onDeleteClick: () => {},
    })));
    expect(html).toContain("Staff");
    expect(html).toContain("Librarian");
    // The count now sits inline in the toolbar row, as on the sibling pages.
    expect(html).toContain("2 roles");
  });

  it("renders an empty message when nothing matches", () => {
    const html = textOf(renderToString(React.createElement(RolesTable, {
      roles: [], search: "zz", onSearch: () => {}, onRoleClick: () => {},
      onEditClick: () => {}, onDeleteClick: () => {},
    })));
    expect(html).toContain('No roles match “zz”');
    expect(html).toContain("Check the spelling or try a shorter search.");
  });
});

describe("UserPermissionsDrawer", () => {
  it("renders nothing without a target user", () => {
    const html = renderToString(
      React.createElement(UserPermissionsDrawer, { userId: null, onClose: () => {} })
    );
    expect(html).toBe("");
  });
});

describe("ENTITY_TYPE_CONFIG", () => {
  it("maps every DLMS entity type to a real permission", () => {
    Object.entries(ENTITY_TYPE_CONFIG).forEach(([type, cfg]) => {
      expect(typeof cfg.permission).toBe("string");
      expect(cfg.permission.startsWith("manage_")).toBe(true);
      expect(cfg.actions.length).toBeGreaterThan(0);
    });
  });
});
