import { describe, it, expect } from "vitest";
import { hasPermission, hasPermissionAction, canAccessEntity } from "./permissionUtils";

function user(overrides = {}) {
  return { id: 1, role: "librarian", ...overrides };
}

describe("hasPermission", () => {
  it("grants everything to super_admin", () => {
    expect(hasPermission({ role: "super_admin" }, "manage_permissions")).toBe(true);
  });

  it("returns false without a user", () => {
    expect(hasPermission(null, "manage_books")).toBe(false);
  });

  it("uses the resolved permission list", () => {
    const u = user({ permissions: ["manage_books", "manage_lexora_books"] });
    expect(hasPermission(u, "manage_books")).toBe(true);
    expect(hasPermission(u, "manage_users")).toBe(false);
  });

  it("falls back conservatively when permissions are absent (stale localStorage)", () => {
    expect(hasPermission(user({ role: "admin" }), "manage_books")).toBe(true);
    expect(hasPermission(user({ role: "librarian" }), "manage_books")).toBe(false);
    expect(hasPermission(user({ role: "staff" }), "manage_attendance")).toBe(false);
  });
});

describe("hasPermissionAction", () => {
  it("grants any action to super_admin", () => {
    expect(hasPermissionAction({ role: "super_admin" }, "manage_books", "import")).toBe(true);
  });

  it("narrows by action when details are present", () => {
    const u = user({
      permissions: ["manage_books"],
      permissionDetails: { manage_books: { granted: true, actions: ["view", "edit"] } },
    });
    expect(hasPermissionAction(u, "manage_books", "view")).toBe(true);
    expect(hasPermissionAction(u, "manage_books", "delete")).toBe(false);
  });

  it("treats a present permission without details as fully granted (legacy fallback)", () => {
    const u = user({ permissions: ["manage_books"] });
    expect(hasPermissionAction(u, "manage_books", "delete")).toBe(true);
  });

  it("returns false for a permission the user lacks", () => {
    expect(hasPermissionAction(user({ permissions: [] }), "manage_books", "view")).toBe(false);
  });
});

describe("canAccessEntity", () => {
  it("allows everything without entity overrides", () => {
    expect(canAccessEntity(user(), "books", 5)).toBe(true);
  });

  it("implements allowlist-per-type 'selected' scope", () => {
    const u = user({ entityOverrides: { books: { scope: "selected", entity_ids: [4, 9] } } });
    expect(canAccessEntity(u, "books", 4)).toBe(true);
    expect(canAccessEntity(u, "books", 5)).toBe(false);
    expect(canAccessEntity(u, "courses", 5)).toBe(true);
  });

  it("implements 'denied' scope", () => {
    const u = user({ entityOverrides: { books: { scope: "denied", entity_ids: [5] } } });
    expect(canAccessEntity(u, "books", 5)).toBe(false);
    expect(canAccessEntity(u, "books", 6)).toBe(true);
  });

  it("grants everything to super_admin", () => {
    const u = { role: "super_admin", entityOverrides: { books: { scope: "selected", entity_ids: [1] } } };
    expect(canAccessEntity(u, "books", 99)).toBe(true);
  });
});
