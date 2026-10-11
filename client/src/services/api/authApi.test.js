/**
 * Auth API normalization tests.
 *
 * The server answers login / me / updateProfile with snake_case
 * `permission_details` and `entity_overrides`, while `permissionUtils`
 * reads camelCase `permissionDetails` / `entityOverrides`. Storing the raw
 * response is what made every `hasPermissionAction` gate fall through to
 * its "details missing = fully granted" branch, so restricted users kept
 * seeing action buttons the server then refused with a 403.
 *
 * These pin the contract so the mapping cannot silently regress.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import authApi, { normalizeAuthUser } from "./authApi";

function mockFetch(response) {
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => response }));
}

const SERVER_USER = {
  id: 7,
  username: "jdoe",
  role: "admin",
  permissions: ["manage_users", "manage_books"],
  permission_details: {
    manage_users: { granted: true, actions: ["view", "edit"] },
    manage_books: { granted: true, actions: ["view", "create", "edit", "delete", "import"] },
  },
  entity_overrides: { books: { scope: "selected", entity_ids: [4, 9] } },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeAuthUser", () => {
  it("maps the server's snake_case fields onto the camelCase helpers read", () => {
    const user = normalizeAuthUser(SERVER_USER);
    expect(user.permissionDetails).toEqual(SERVER_USER.permission_details);
    expect(user.entityOverrides).toEqual(SERVER_USER.entity_overrides);
    // Original fields stay for any consumer that still reads them.
    expect(user.permission_details).toEqual(SERVER_USER.permission_details);
    expect(user.entity_overrides).toEqual(SERVER_USER.entity_overrides);
  });

  it("leaves identity, role and permissions untouched", () => {
    const user = normalizeAuthUser(SERVER_USER);
    expect(user.id).toBe(7);
    expect(user.username).toBe("jdoe");
    expect(user.role).toBe("admin");
    expect(user.permissions).toEqual(SERVER_USER.permissions);
  });

  it("is idempotent for an already-normalized (camelCase) payload", () => {
    const once = normalizeAuthUser(SERVER_USER);
    const twice = normalizeAuthUser(once);
    expect(twice).toEqual(once);
  });

  it("passes through a user without permission fields", () => {
    const bare = { id: 1, username: "a", role: "student" };
    expect(normalizeAuthUser(bare)).toEqual(bare);
    expect(normalizeAuthUser(null)).toBe(null);
  });
});

describe("authApi responses", () => {
  it("normalizes the user returned by login", async () => {
    mockFetch({ success: true, user: SERVER_USER });
    const { user } = await authApi.login("jdoe", "secret");
    expect(user.permissionDetails).toBeDefined();
    expect(user.entityOverrides).toEqual({ books: { scope: "selected", entity_ids: [4, 9] } });
  });

  it("normalizes the user returned by me", async () => {
    mockFetch({ success: true, user: SERVER_USER });
    const { user } = await authApi.me();
    expect(user.permissionDetails).toEqual(SERVER_USER.permission_details);
    expect(user.entityOverrides).toBeDefined();
  });

  it("normalizes the user returned by updateProfile", async () => {
    mockFetch({ success: true, user: SERVER_USER, message: "Profile updated successfully" });
    const { user } = await authApi.updateProfile({ username: "jdoe" });
    expect(user.permissionDetails).toBeDefined();
    expect(user.entityOverrides).toBeDefined();
  });

  it("still throws on a failed login", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ success: false, error: "Invalid username or password" }) }));
    await expect(authApi.login("jdoe", "wrong")).rejects.toThrow("Invalid username or password");
  });
});
