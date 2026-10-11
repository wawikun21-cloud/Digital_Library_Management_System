/**
 * Mount tests for the users tables' permission gating.
 *
 * UsersPage passes each row action as `undefined` when the user lacks the
 * matching manage_users action. Rendering the handler unconditionally is
 * what made a restricted user's click throw `onEdit is not a function`
 * (and, before the auth payload was normalized, made every action look
 * permitted). These pin the RolesTable pattern: no handler → no button.
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import UserTable from "./UserTable";
import UserCard from "./UserCard";

const USERS = [
  { id: 1, username: "jdoe", full_name: "John Doe", email: "john@example.com", role: "admin", is_active: 1, created_at: "2026-01-01" },
  { id: 2, username: "areyes", full_name: "Ana Reyes", email: "ana@example.com", role: "staff", is_active: 0, created_at: "2026-01-02" },
];

const noop = () => {};

function textOf(html) {
  return html.replace(/<!-- -->/g, "");
}

beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
    setItem(k, v) { this.store.set(String(k), String(v)); },
    removeItem(k) { this.store.delete(k); },
  };
});

describe("UserTable action gating", () => {
  it("renders no action buttons when every handler is undefined (restricted user)", () => {
    const html = textOf(renderToString(React.createElement(UserTable, {
      users: USERS,
      loading: false,
      currentUserId: 99,
    })));
    expect(html).toContain("John Doe");
    expect(html).not.toContain('title="Edit user"');
    expect(html).not.toContain('title="Manage permissions"');
    expect(html).not.toContain('title="Change role"');
    expect(html).not.toContain('title="Deactivate user"');
    expect(html).not.toContain('title="Reactivate user"');
  });

  it("renders the actions whose handlers are provided", () => {
    const html = textOf(renderToString(React.createElement(UserTable, {
      users: USERS,
      loading: false,
      onEdit: noop,
      onPermissions: noop,
      onRoleChange: noop,
      onDeactivate: noop,
      onReactivate: noop,
      currentUserId: 99,
    })));
    expect(html).toContain('title="Edit user"');
    expect(html).toContain('title="Manage permissions"');
    expect(html).toContain('title="Change role"');
    expect(html).toContain('title="Deactivate user"');
    expect(html).toContain('title="Reactivate user"');
  });
});

describe("UserCard action gating", () => {
  it("renders no action buttons when every handler is undefined", () => {
    const html = textOf(renderToString(React.createElement(UserCard, {
      user: USERS[0],
      currentUserId: 99,
    })));
    expect(html).not.toContain(">Edit<");
    expect(html).not.toContain(">Permissions<");
    expect(html).not.toContain(">Deactivate<");
  });

  it("renders the actions whose handlers are provided", () => {
    const html = textOf(renderToString(React.createElement(UserCard, {
      user: USERS[0],
      onEdit: noop,
      onPermissions: noop,
      onDeactivate: noop,
      currentUserId: 99,
    })));
    expect(html).toContain(">Edit<");
    expect(html).toContain(">Permissions<");
    expect(html).toContain(">Deactivate<");
  });
});
