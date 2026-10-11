/**
 * Renders the Sidebar for each seeded role.
 *
 * This exists because a bare (unimported) identifier compiles fine with
 * Vite and only throws a ReferenceError at render time — exactly the
 * `useLocalStorage is not defined` crash this module had. The build cannot
 * catch that class of bug, so this does.
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { STORAGE_KEYS } from "../../constants/index.js";

// jsdom isn't available, so stand up just enough of localStorage for
// useLocalStorage, which runs during render.
beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
  };
});

function renderSidebar(role, permissions) {
  globalThis.localStorage.setItem(
    STORAGE_KEYS.LEXORA_USER,
    JSON.stringify({ id: 1, role, permissions })
  );
  return renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(Sidebar, {
        collapsed: false,
        darkMode: false,
        onToggleTheme: () => {},
        mobileOpen: false,
        onMobileClose: () => {},
      })
    )
  );
}

const ALL = [
  "view_dashboard", "view_reports", "manage_books", "manage_lexora_books",
  "view_lexora_books", "manage_transactions", "manage_trash", "view_audit_logs",
  "manage_attendance", "manage_students", "manage_faculty", "use_kiosk", "manage_rfid",
  "manage_courses", "view_course_library", "manage_users", "manage_settings",
  "manage_tools", "use_tools", "manage_permissions",
];

describe("Sidebar", () => {
  it("mounts for super_admin (the role that previously crashed)", () => {
    const html = renderSidebar("super_admin", ALL);
    expect(html).toContain("Roles &amp; Permissions");
    expect(html).toContain("Books");
  });

  it("mounts for a role with no permissions", () => {
    const html = renderSidebar("student", ["view_lexora_books", "view_course_library", "use_tools"]);
    expect(html).toContain("Student Portal");
  });

  it("hides items the permissions exclude", () => {
    const html = renderSidebar("librarian", ["manage_books"]);
    expect(html).not.toContain("Audit Trail");
    expect(html).not.toContain("Recently Deleted");
    // The Dashboard Analytics group is view_dashboard-gated, parent and
    // children alike — none of it may render for a catalog-only user.
    expect(html).not.toContain("Dashboard Analytics");
    expect(html).not.toContain('href="/dashboard/attendance/dashboard"');
  });

  it("falls back to the role prop when no cached user exists", () => {
    globalThis.localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
    // A bare role prop must not throw — the old code defaulted to admin.
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(Sidebar, {
          collapsed: false,
          darkMode: false,
          onToggleTheme: () => {},
          mobileOpen: false,
          onMobileClose: () => {},
          userRole: "student",
        })
      )
    );
    expect(html).toContain("Student Portal");
  });

  // ── Group children are filtered by their own permission ──────────
  // The reported bug: an Admin whose manage_roles / manage_permissions
  // actions were revoked still saw "Roles & Permissions" under Settings,
  // clicked it, and PermissionRoute bounced them back to the dashboard.
  it("hides a group child whose permission the user lacks", () => {
    const html = renderSidebar("admin", ["manage_users"]);
    expect(html).not.toContain("Roles &amp; Permissions");
    expect(html).not.toContain('href="/dashboard/roles"');
    // The group itself stays: Users is reachable for this user.
    expect(html).toContain('href="/dashboard/users"');
  });

  it("hides unreachable Attendance children but keeps the reachable one", () => {
    const html = renderSidebar("staff", ["use_kiosk"]);
    expect(html).toContain('href="/dashboard/attendance/kiosk"');
    expect(html).not.toContain('href="/dashboard/students"');
    expect(html).not.toContain('href="/dashboard/faculty"');
  });

  // ── Group parent links follow their own route guard ──────────────
  it("drops a group's parent link when its own route is unreachable", () => {
    // manage_trash only: "Recently Deleted" is reachable, /dashboard/settings
    // is not, so the Settings group must not render a dead parent link.
    const html = renderSidebar("admin", ["manage_trash"]);
    expect(html).not.toContain('href="/dashboard/settings"');
    expect(html).toContain('href="/dashboard/deleted"');
  });

  it("drops the Attendance parent link for a kiosk-only user", () => {
    const html = renderSidebar("staff", ["use_kiosk"]);
    expect(html).not.toContain('href="/dashboard/attendance"');
    expect(html).toContain('href="/dashboard/attendance/kiosk"');
  });

  it("hides a group entirely when neither its route nor any child is reachable", () => {
    const html = renderSidebar("librarian", ["manage_books"]);
    expect(html).not.toContain('href="/dashboard/attendance/kiosk"');
    expect(html).not.toContain('href="/dashboard/users"');
  });
});
