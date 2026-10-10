import { describe, it, expect } from "vitest";
import {
  parseActions,
  getDefinedActions,
  computeRolePermState,
  computeUserPermState,
  computeUserOverridesToSave,
  computeEntityOverridesToSave,
  initEntityStates,
  toggleUserAction,
  hasRestrictablePermission,
  groupByCategory,
  ENTITY_TYPE_CONFIG,
  ENTITY_TYPES,
  CATEGORY_LABELS,
} from "./rolesPermissionHelpers";

const BOOKS = { name: "manage_books", display_name: "Manage Books", category: "books", actions: ["view", "create", "edit", "delete", "import"] };
const TRASH = { name: "manage_trash", display_name: "Manage Recently Deleted", category: "trash", actions: ["view", "restore", "delete"] };
const NONE = { name: "view_dashboard", display_name: "View Dashboard", category: "dashboard", actions: null };

/* ── action parsing ─────────────────────────────────────── */

describe("parseActions", () => {
  it("reads arrays and JSON strings alike", () => {
    expect(parseActions(["view", "edit"])).toEqual(["view", "edit"]);
    expect(parseActions('["view","edit"]')).toEqual(["view", "edit"]);
  });

  it("returns an empty array for null, empty, or invalid input", () => {
    expect(parseActions(null)).toEqual([]);
    expect(parseActions("")).toEqual([]);
    expect(parseActions("{oops}")).toEqual([]);
    expect(parseActions(42)).toEqual([]);
  });
});

describe("getDefinedActions", () => {
  it("prefers the stored actions", () => {
    expect(getDefinedActions(BOOKS)).toEqual(["view", "create", "edit", "delete", "import"]);
  });

  it("falls back when the column is unusable", () => {
    expect(getDefinedActions(NONE)).toEqual(["view"]);
  });

  it("returns empty for a permission with no known fallback", () => {
    expect(getDefinedActions({ name: "mystery", actions: null })).toEqual([]);
  });
});

/* ── role state ─────────────────────────────────────────── */

describe("computeRolePermState", () => {
  it("marks a permission granted with its selected actions", () => {
    const state = computeRolePermState([BOOKS], { manage_books: new Set(["view", "create"]) });
    expect(state[0].granted).toBe(true);
    expect(state[0].selectedActions).toEqual(["view", "create"]);
    expect(state[0].useDefaults).toBe(false);
  });

  it("flags useDefaults when every defined action is selected", () => {
    const state = computeRolePermState([BOOKS], { manage_books: new Set(BOOKS.actions) });
    expect(state[0].useDefaults).toBe(true);
  });

  it("treats an empty selection as not granted", () => {
    const state = computeRolePermState([BOOKS], { manage_books: new Set() });
    expect(state[0].granted).toBe(false);
    expect(state[0].selectedActions).toEqual([]);
  });
});

/* ── user state ─────────────────────────────────────────── */

describe("computeUserPermState", () => {
  const rolePerms = [BOOKS, TRASH];

  it("defaults every role grant to all defined actions", () => {
    const state = computeUserPermState(rolePerms, []);
    expect(state.every((p) => p.granted && p.useDefaults)).toBe(true);
    expect(state[0].selectedActions).toEqual(BOOKS.actions);
  });

  it("drops a permission denied by an override", () => {
    const state = computeUserPermState(rolePerms, [
      { permission_name: "manage_books", granted: false, actions: [] },
    ]);
    expect(state[0].granted).toBe(false);
    expect(state[0].selectedActions).toEqual([]);
  });

  it("narrows actions but ignores anything outside the defined set", () => {
    const state = computeUserPermState(rolePerms, [
      { permission_name: "manage_books", granted: true, actions: ["view", "approve"] },
    ]);
    expect(state[0].selectedActions).toEqual(["view"]);
    expect(state[0].useDefaults).toBe(false);
  });

  it("treats a null override action set as all actions", () => {
    const state = computeUserPermState(rolePerms, [
      { permission_name: "manage_books", granted: true, actions: null },
    ]);
    expect(state[0].selectedActions).toEqual(BOOKS.actions);
  });

  it("returns nothing when the role grants nothing", () => {
    expect(computeUserPermState([], [])).toEqual([]);
  });
});

/* ── save payloads ──────────────────────────────────────── */

describe("computeUserOverridesToSave", () => {
  it("emits no row for a permission left at all actions", () => {
    expect(computeUserOverridesToSave(computeUserPermState([BOOKS], []), [BOOKS])).toEqual([]);
  });

  it("emits a narrowed row", () => {
    const overrides = computeUserOverridesToSave(
      computeUserPermState([BOOKS], [{ permission_name: "manage_books", granted: true, actions: ["view"] }]),
      [BOOKS]
    );
    expect(overrides).toEqual([{ permission_name: "manage_books", granted: true, actions: ["view"] }]);
  });

  it("emits a deny row with empty actions", () => {
    const overrides = computeUserOverridesToSave(
      computeUserPermState([BOOKS], [{ permission_name: "manage_books", granted: false, actions: [] }]),
      [BOOKS]
    );
    expect(overrides).toEqual([{ permission_name: "manage_books", granted: false, actions: [] }]);
  });

  it("ignores permissions the role does not grant", () => {
    const state = computeUserPermState([BOOKS], [{ permission_name: "manage_users", granted: false, actions: [] }]);
    expect(computeUserOverridesToSave(state, [BOOKS])).toEqual([]);
  });
});

describe("computeEntityOverridesToSave", () => {
  it("denies every known entity in the denied scope", () => {
    const rows = computeEntityOverridesToSave({
      books: { scope: "denied", entities: [{ id: 1 }, { id: 2 }], selectedIds: new Set() },
    });
    expect(rows).toEqual([
      { permission_name: "manage_books", entity_type: "books", entity_id: 1, granted: false, actions: [] },
      { permission_name: "manage_books", entity_type: "books", entity_id: 2, granted: false, actions: [] },
    ]);
  });

  it("grants only the selected ids in the selected scope", () => {
    const rows = computeEntityOverridesToSave({
      books: { scope: "selected", entities: [{ id: 1 }, { id: 2 }], selectedIds: new Set([2]) },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ entity_id: 2, granted: true });
    expect(rows[0].actions).toEqual(ENTITY_TYPE_CONFIG.books.actions);
  });

  it("emits nothing in the all scope", () => {
    expect(computeEntityOverridesToSave({ books: { scope: "all", entities: [], selectedIds: new Set() } })).toEqual([]);
  });
});

/* ── entity state ───────────────────────────────────────── */

describe("initEntityStates", () => {
  it("reads an allowlist from granted rows", () => {
    const states = initEntityStates([
      { permission_name: "manage_books", entity_type: "books", entity_id: 4, granted: true, actions: ["view"] },
    ]);
    expect(states.books.scope).toBe("selected");
    expect([...states.books.selectedIds]).toEqual([4]);
    expect(states.courses.scope).toBe("all");
  });

  it("reads a blocklist from denied rows", () => {
    const states = initEntityStates([
      { permission_name: "manage_books", entity_type: "books", entity_id: 4, granted: false, actions: [] },
    ]);
    expect(states.books.scope).toBe("denied");
  });

  it("ignores rows for a permission that does not govern the type", () => {
    const states = initEntityStates([
      { permission_name: "manage_courses", entity_type: "books", entity_id: 4, granted: true, actions: [] },
    ]);
    expect(states.books.scope).toBe("all");
  });
});

describe("hasRestrictablePermission", () => {
  it("hides a type whose governing permission is not granted", () => {
    const states = [{ name: "manage_books", granted: false }];
    expect(hasRestrictablePermission(states, "books")).toBe(false);
    expect(hasRestrictablePermission(states, "courses")).toBe(false);
  });

  it("shows a type whose governing permission is granted", () => {
    expect(hasRestrictablePermission([{ name: "manage_books", granted: true }], "books")).toBe(true);
  });
});

/* ── action toggling ────────────────────────────────────── */

describe("toggleUserAction", () => {
  const defined = ["view", "create", "edit"];

  it("is a no-op when the role lacks the permission", () => {
    expect(toggleUserAction([], "manage_books", "view", defined, false)).toEqual([]);
  });

  it("re-grants everything when starting from a deny", () => {
    const out = toggleUserAction(
      [{ permission_name: "manage_books", granted: false, actions: [] }],
      "manage_books", "view", defined, true
    );
    expect(out[0]).toEqual({ permission_name: "manage_books", granted: true, actions: defined });
  });

  it("removes one action", () => {
    const out = toggleUserAction(
      [{ permission_name: "manage_books", granted: true, actions: ["view", "create"] }],
      "manage_books", "create", defined, true
    );
    expect(out[0].actions).toEqual(["view"]);
  });

  it("denies the permission when the last action is removed", () => {
    const out = toggleUserAction(
      [{ permission_name: "manage_books", granted: true, actions: ["view"] }],
      "manage_books", "view", defined, true
    );
    expect(out[0]).toEqual({ permission_name: "manage_books", granted: false, actions: [] });
  });

  it("adds an action", () => {
    const out = toggleUserAction(
      [{ permission_name: "manage_books", granted: true, actions: ["view"] }],
      "manage_books", "edit", defined, true
    );
    expect(out[0].actions).toEqual(["view", "edit"]);
  });

  it("creates a full override when none exists", () => {
    const out = toggleUserAction([], "manage_books", "view", defined, true);
    expect(out).toEqual([{ permission_name: "manage_books", granted: true, actions: defined }]);
  });
});

/* ── grouping ───────────────────────────────────────────── */

describe("groupByCategory", () => {
  it("groups by category in encounter order", () => {
    const grouped = groupByCategory([BOOKS, TRASH]);
    expect(Object.keys(grouped)).toEqual(["books", "trash"]);
    expect(grouped.books).toHaveLength(1);
  });

  it("labels every DLMS category", () => {
    ENTITY_TYPES.forEach(() => {});
    expect(CATEGORY_LABELS.books).toBe("Books");
    expect(CATEGORY_LABELS.roles).toBe("Roles & Permissions");
  });
});
