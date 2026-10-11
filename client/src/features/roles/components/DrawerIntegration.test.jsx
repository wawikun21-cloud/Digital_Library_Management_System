// @vitest-environment jsdom
/**
 * Integration check for the assembled permission drawer.
 *
 * The defect reported as "the Drawer is not properly displayed" was two
 * stacked header bars plus two nested scroll regions: the shell rendered its
 * own <header> and an overflow wrapper, while PermissionsDrawer already
 * provided both. These assert the assembled panel shows one of each.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import Drawer from "../../../components/ui/Drawer";
import PermissionsDrawer from "./PermissionsDrawer";
import { computeRolePermState } from "../utils/rolesPermissionHelpers";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PERMISSIONS = [
  { name: "manage_books", display_name: "Manage Books", category: "books", actions: ["view", "create", "edit", "delete", "import"] },
  { name: "manage_trash", display_name: "Manage Recently Deleted", category: "trash", actions: ["view", "restore", "delete"] },
];

const PROPS = {
  drawerMode: "editRole",
  drawerLoading: false,
  saving: false,
  editRole: { name: "staff", display_name: "Staff", permissions: [] },
  rolePermStates: computeRolePermState(PERMISSIONS, { manage_books: new Set(["view", "create"]) }),
  editRoleUsers: [{ id: 1, full_name: "Ana Reyes", email: "ana@example.com" }],
  editUser: null,
  editUserNewRoleName: "",
  editUserOriginalRole: "",
  editUserRolePerms: [],
  userPermStates: [],
  entityStates: {},
  visibleEntityTypes: [],
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

describe("assembled permission drawer", () => {
  it("shows exactly one header and one scroll region in editRole mode", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          Drawer,
          { open: true, onClose: () => {}, width: 520, label: "Permissions" },
          React.createElement(PermissionsDrawer, PROPS)
        )
      );
    });

    const panel = container.querySelector(".drawer-panel");
    expect(panel).not.toBeNull();

    // One header — PermissionsDrawer's. The shell must not add a second.
    const headers = [...panel.querySelectorAll("header")];
    expect(headers).toHaveLength(1);
    expect(headers[0].textContent).toContain("Edit: Staff");
    expect(panel.querySelector("h2")).toBeNull();

    // One scrollable body — PermissionsDrawer's flex-1 region.
    const bodies = [...panel.querySelectorAll("*")].filter(
      (el) => typeof el.className === "string" && el.className.includes("overflow-y-auto")
    );
    expect(bodies).toHaveLength(1);

    // The shell must not pad or wrap the caller.
    expect(panel.children).toHaveLength(1);

    act(() => root.unmount());
    container.remove();
  });

  it("renders the user editor with its role picker and quick links", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          Drawer,
          { open: true, onClose: () => {}, width: 520 },
          React.createElement(PermissionsDrawer, {
            ...PROPS,
            drawerMode: "editUser",
            editUser: { id: 9, full_name: "Ana Reyes", role: "staff" },
            editUserRolePerms: [PERMISSIONS[0]],
            userPermStates: computeRolePermState(null, { manage_books: new Set(PERMISSIONS[0].actions) }),
          })
        )
      );
    });

    expect(container.textContent).toContain("Edit User: Ana Reyes");
    // The user editor offers one bulk action, named for what it does. It used
    // to show "Grant all" beside "Reset to role defaults", both wired to the
    // same handler — see resetUserDefaults in useRolesManager.
    expect(container.textContent).toContain("Reset to role defaults");
    expect(container.textContent).not.toContain("Grant all");
    expect(container.textContent).toContain("Manage Access Restrictions");
    expect(container.querySelector("#drawer-role-select")).not.toBeNull();

    act(() => root.unmount());
    container.remove();
  });

  it("offers a working reset in the role editor", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        React.createElement(
          Drawer,
          { open: true, onClose: () => {}, width: 520, label: "Permissions" },
          React.createElement(PermissionsDrawer, PROPS)
        )
      );
    });

    // The role editor's bulk link must act on the role, not on user overrides.
    expect(container.textContent).toContain("Reset changes");
    expect(container.textContent).not.toContain("Grant all");

    act(() => root.unmount());
    container.remove();
  });
});
