// @vitest-environment jsdom
/**
 * Regression tests for the roles drawer's server contracts.
 *
 * The role editor broke on three separate shape assumptions at once, and each
 * one failed silently rather than visibly:
 *
 *  1. `GET /api/roles/:name` answers with
 *     `{ role, grants, permissions, role_actions, entity_overrides }`, but the
 *     hook stored that envelope as the role itself. `name` and `display_name`
 *     live one level down under `role`, so the save URL became
 *     `/api/roles/permissions/undefined` (400 "Role not found") and the drawer
 *     title rendered blank.
 *
 *  2. The same envelope carries the *whole permission catalog* under
 *     `permissions` and the role's actual grants under `role_actions`. Reading
 *     `permissions` seeded every permission as granted, so opening a role and
 *     saving would have overwritten it with the full catalog.
 *
 *  3. `PUT /api/roles/permissions/:name` validates `grants[].permission_name`,
 *     but the client sent `grants[].name`.
 *
 * The user editor had the matching version of (2): it received the full
 * catalog as "the user's role permissions", so every permission looked granted
 * and a save could write overrides for permissions the role does not have.
 *
 * Note the two different response shapes being stubbed here: the rolesApi
 * functions unwrap internally, so they are stubbed with the post-unwrap shape,
 * while usersApi.fetchUsers returns the raw body.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useRolesManager } from "./useRolesManager";
import * as rolesApi from "../api/rolesApi";
import * as usersApi from "../../users/api/usersApi";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Every mount pushes its unmount here. Draining this in afterEach is what keeps
// the tests isolated: each one gets its own container, root and spies, and
// nothing — DOM node, React root, or spy — survives into the next.
// (Spies are restored by `restoreMocks: true` in vite.config.js.)
const teardowns = [];

beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
    setItem(k, v) { this.store.set(String(k), String(v)); },
    removeItem(k) { this.store.delete(k); },
  };
});

afterEach(async () => {
  while (teardowns.length) await teardowns.pop()();
  // Guards the isolation above rather than trusting it: a leaked container
  // would otherwise accumulate silently across the file.
  expect(document.body.childElementCount).toBe(0);
});

const CATALOG = [
  { name: "manage_books", display_name: "Manage Books", category: "books", actions: ["view", "create", "edit", "delete", "import"] },
  { name: "manage_trash", display_name: "Manage Recently Deleted", category: "trash", actions: ["view", "restore", "delete"] },
  { name: "view_dashboard", display_name: "View Dashboard", category: "dashboard", actions: ["view"] },
];

/** Mirrors roles.service.getRoleDetail's response shape exactly. */
function roleDetailData(roleName, granted) {
  // role_actions: null means "every defined action" (role_permissions.actions IS NULL).
  const role_actions = {};
  for (const name of granted) role_actions[name] = null;

  return {
    role: { name: roleName, display_name: roleName === "staff" ? "Staff" : roleName, description: null },
    grants: granted,
    permissions: CATALOG,
    role_actions,
    entity_overrides: {},
  };
}

/** Mirrors roles.service.getUserEditorContext's response shape. */
function userEditorData(roleName, granted, userId) {
  const data = roleDetailData(roleName, granted);
  return {
    user: { id: userId, username: "staff", role: roleName, full_name: null, is_active: 1 },
    role: data.role,
    role_grants: granted,
    role_actions: data.role_actions,
    permissions: data.permissions,
    overrides: {},
    entity_overrides: {},
  };
}

/** Stub a rolesApi function — these unwrap internally. */
const apiOk = (data) => async () => ({ ok: true, status: 200, data, message: null, raw: { success: true, data } });

/** Stub usersApi.fetchUsers — this returns the raw response body. */
const fetchOk = (data) => async () => ({ success: true, data });

/**
 * Mount the hook and drive it the way the page does.
 *
 * The hook is imported statically at the top of this file on purpose. An
 * `await import()` here would pull the whole module graph in *inside* the test
 * body, which vitest charges to that test's 5s timeout — it measured ~4s on the
 * first test. A static import moves that cost into the collect phase, where it
 * belongs, and the mount itself costs ~10-50ms.
 */
async function mountHook(onFeedback = () => {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  const ref = React.createRef();
  function Probe() {
    ref.current = useRolesManager({ onFeedback });
    return null;
  }
  // act() must be awaited directly — its return value is a React thenable, not
  // a Promise, so chaining .then() off it does not resolve as expected.
  await act(async () => { root.render(React.createElement(Probe)); });

  teardowns.push(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
  });
  return { ref, root, container };
}

/**
 * Silence the mount-time load effect. `getPermissions` must return the real
 * catalog: rolePermStates maps over it, so an empty array makes every grant
 * invisible no matter what the role detail says.
 */
function stubLoad() {
  vi.spyOn(rolesApi, "getRoles").mockImplementation(apiOk([]));
  vi.spyOn(rolesApi, "getPermissions").mockImplementation(apiOk(CATALOG));
}

describe("openRoleEditor — GET /api/roles/:name envelope", () => {
  it("flattens the envelope so the drawer has a role name to save against", async () => {
    stubLoad();
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(roleDetailData("staff", ["manage_books"])));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });

    // The bug: editRole was the raw envelope, so both of these were undefined.
    expect(ref.current.editRole?.name).toBe("staff");
    expect(ref.current.editRole?.display_name).toBe("Staff");
    expect(ref.current.editRole?.permissions).toHaveLength(3);
    expect(ref.current.editRole?.role_actions).toEqual({ manage_books: null });
  });

  it("seeds only the granted permissions, not the whole catalog", async () => {
    stubLoad();
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(roleDetailData("staff", ["manage_books"])));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });

    // The bug seeded all three permissions as fully granted. The hook keeps
    // its action map internal and exposes the derived grid instead.
    const granted = ref.current.rolePermStates.filter((p) => p.granted).map((p) => p.name);
    expect(granted).toEqual(["manage_books"]);

    // role_actions.manage_books is null → "every defined action".
    const books = ref.current.rolePermStates.find((p) => p.name === "manage_books");
    expect([...books.selectedActions].sort()).toEqual(["create", "delete", "edit", "import", "view"]);
    expect(books.useDefaults).toBe(true);
  });

  it("honours an explicit narrowed action set from the server", async () => {
    stubLoad();
    const data = roleDetailData("staff", ["manage_books"]);
    data.role_actions.manage_books = ["view", "create"];
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(data));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });

    const books = ref.current.rolePermStates.find((p) => p.name === "manage_books");
    expect([...books.selectedActions].sort()).toEqual(["create", "view"]);
    // Narrower than the defined set, so the "full permission" flag must clear.
    expect(books.useDefaults).toBe(false);
    // An absent entry must read as an explicit false, never undefined.
    const dashboard = ref.current.rolePermStates.find((p) => p.name === "view_dashboard");
    expect(dashboard).toBeDefined();
    expect(dashboard.granted).toBe(false);
    expect(dashboard.selectedActions).toEqual([]);
  });

  it("reports a clear error instead of opening a nameless editor", async () => {
    stubLoad();
    // A 404-shaped envelope: { success:false } → unwrap() gives data: null.
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(null));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));

    const seen = [];
    const { ref, root, container } = await mountHook((t, m) => seen.push([t, m]));
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });

    // No editor opens, and the message names the role rather than "undefined".
    expect(ref.current.editRole).toBeNull();
    expect(seen).toEqual([["error", 'Role "Staff" could not be loaded']]);
    expect(JSON.stringify(seen)).not.toContain("undefined");
  });
});

describe("handleSave → PUT /api/roles/permissions/:name", () => {
  async function setup(granted = ["manage_books"]) {
    stubLoad();
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(roleDetailData("staff", granted)));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));
    const put = vi.spyOn(rolesApi, "updateRolePermissions").mockImplementation(
      apiOk(roleDetailData("staff", granted))
    );
    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });
    return { ref, root, container, put };
  }

  // handleSave dispatches on drawerMode, which openRoleEditor sets to "editRole".
  const save = (ref) => act(async () => { await ref.current.handleSave(); });

  it("addresses the role by its real name, never 'undefined'", async () => {
    const { ref, root, container, put } = await setup();
    await save(ref);

    expect(put).toHaveBeenCalledTimes(1);
    const [roleName] = put.mock.calls[0];
    expect(roleName).toBe("staff");
    expect(roleName).not.toBe("undefined");
  });

  it("sends permission_name, the field the server validates", async () => {
    const { ref, root, container, put } = await setup();
    await save(ref);

    const grants = put.mock.calls[0][1];
    expect(grants.map((g) => g.permission_name)).toEqual(["manage_books"]);
    // The actions are the catalog order; compare order-insensitively.
    expect([...grants[0].actions].sort()).toEqual(["create", "delete", "edit", "import", "view"]);
    // The old payload used `name`, which failed every grant with
    // "permission_name is required".
    for (const grant of grants) {
      expect(grant).not.toHaveProperty("name");
      expect(typeof grant.permission_name).toBe("string");
      expect(grant.permission_name.length).toBeGreaterThan(0);
    }
  });

  it("never grants a permission the role does not already hold", async () => {
    const { ref, root, container, put } = await setup(["manage_books"]);
    await save(ref);

    // The catalog has three permissions; only the granted one may be written.
    expect(put.mock.calls[0][1].map((g) => g.permission_name)).toEqual(["manage_books"]);
  });

  it("refuses to save a role with no name instead of hitting a bad URL", async () => {
    stubLoad();
    // The role fails to load, so the drawer opens with no resolvable role.
    vi.spyOn(rolesApi, "getRole").mockImplementation(apiOk(null));
    vi.spyOn(usersApi, "fetchUsers").mockImplementation(fetchOk([]));
    const put = vi.spyOn(rolesApi, "updateRolePermissions").mockImplementation(apiOk(null));

    const seen = [];
    const { ref, root, container } = await mountHook((t, m) => seen.push([t, m]));
    await act(async () => { await ref.current.openRoleEditor({ name: "staff", display_name: "Staff" }); });

    // drawerMode is "editRole" but editRole is null → the draw is never issued.
    expect(ref.current.drawerMode).toBe("editRole");
    await act(async () => { ref.current.handleSave(); });

    expect(put).not.toHaveBeenCalled();
    expect(seen).toEqual([
      ["error", 'Role "Staff" could not be loaded'],
      ["error", "This role is missing its name, so it cannot be saved. Close and reopen it."],
    ]);
    // The reported bug: /api/roles/permissions/undefined.
    expect(JSON.stringify(seen)).not.toContain("undefined");
  });
});

describe("openUserEditor — role grants", () => {
  it("shows only the permissions the user's role grants", async () => {
    stubLoad();
    vi.spyOn(rolesApi, "getUserPermissions").mockImplementation(apiOk(userEditorData("staff", ["manage_books"], 7)));
    vi.spyOn(rolesApi, "getUserEntityOverrides").mockImplementation(apiOk({}));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openUserEditor({ id: 7, username: "staff", role: "staff" }); });

    // The bug passed the full catalog, so every permission looked granted.
    expect(ref.current.editUserRolePerms.map((p) => p.name)).toEqual(["manage_books"]);
  });

  it("drops granted names that have no entry in the catalog", async () => {
    stubLoad();
    const data = userEditorData("staff", ["manage_books"], 8);
    // A stale grant naming a permission removed from the catalog must not
    // crash the editor with an undefined entry.
    data.role_grants = ["manage_books", "retired_permission", "manage_trash"];
    vi.spyOn(rolesApi, "getUserPermissions").mockImplementation(apiOk(data));
    vi.spyOn(rolesApi, "getUserEntityOverrides").mockImplementation(apiOk({}));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openUserEditor({ id: 8, username: "staff", role: "staff" }); });

    expect(ref.current.editUserRolePerms.map((p) => p.name).sort()).toEqual(["manage_books", "manage_trash"]);
  });

  it("opens an empty editor when the role grants nothing", async () => {
    stubLoad();
    vi.spyOn(rolesApi, "getUserPermissions").mockImplementation(apiOk(userEditorData("staff", [], 9)));
    vi.spyOn(rolesApi, "getUserEntityOverrides").mockImplementation(apiOk({}));

    const { ref, root, container } = await mountHook();
    await act(async () => { await ref.current.openUserEditor({ id: 9, username: "staff", role: "staff" }); });

    expect(ref.current.editUserRolePerms).toEqual([]);
  });
});
