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

function renderSidebar(role, permissions, featureSet) {
  const userObj = { id: 1, role, permissions };
  if (featureSet) userObj.feature_set = featureSet;
  globalThis.localStorage.setItem(
    STORAGE_KEYS.LEXORA_USER,
    JSON.stringify(userObj)
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

  // ── Attendance items are now top-level sections, not group children ─
  it("shows kiosk but hides Attendance parent for a kiosk-only user", () => {
    const html = renderSidebar("staff", ["use_kiosk"]);
    // Students and Faculty are in "People" section, permission-gated separately
    expect(html).not.toContain('href="/dashboard/students"');
    expect(html).not.toContain('href="/dashboard/faculty"');
    // Kiosk Attendance is still visible (top-level, not a group child)
    expect(html).toContain('href="/dashboard/attendance/kiosk"');
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
    // Attendance page requires manage_attendance; kiosk-only user lacks it
    const html = renderSidebar("staff", ["use_kiosk"]);
    expect(html).not.toContain('href="/dashboard/attendance"');
    // Kiosk Attendance is a separate top-level item, visible by its own permission
    expect(html).toContain('href="/dashboard/attendance/kiosk"');
  });

  it("hides a group entirely when neither its route nor any child is reachable", () => {
    const html = renderSidebar("librarian", ["manage_books"]);
    expect(html).not.toContain('href="/dashboard/attendance/kiosk"');
    expect(html).not.toContain('href="/dashboard/users"');
  });

  // ── Feature-license gates ─────────────────────────────────────
  // A school licensed 'lexora' only should NOT see physical-library
  // nav items, and vice-versa.
  it("hides physical-library nav items but keeps shared sections for a lexora-only school", () => {
    const html = renderSidebar("admin", ALL, "lexora");
    // Books (physical) must be hidden
    expect(html).not.toContain('href="/dashboard/books"');
    // Borrowed (transactions) must be hidden
    expect(html).not.toContain('href="/dashboard/borrowed"');
    // Attendance page must NOT be a link (route is LicenseRoute-gated)
    expect(html).not.toContain('href="/dashboard/attendance"');
    // Students is a shared feature visible to all license types
    expect(html).toContain('href="/dashboard/students"');
    // Faculty is library-only and must be hidden for lexora-only school
    expect(html).not.toContain('href="/dashboard/faculty"');
    // Kiosk must be hidden (featureSet: library)
    expect(html).not.toContain('href="/dashboard/attendance/kiosk"');
    // Lexora items should still be visible
    expect(html).toContain('href="/lexora-books"');
  });

  it("hides lexora-only nav items for a library-only school", () => {
    const html = renderSidebar("admin", ALL, "library");
    // Physical-library items should be visible
    expect(html).toContain('href="/dashboard/books"');
    expect(html).toContain('href="/dashboard/borrowed"');
    // Attendance group should be visible (with parent link)
    expect(html).toContain('href="/dashboard/attendance"');
    // Students and Faculty should be visible (shared features)
    expect(html).toContain('href="/dashboard/students"');
    expect(html).toContain('href="/dashboard/faculty"');
    // Lexora items must be hidden
    expect(html).not.toContain('href="/lexora-books"');
    // Course Library (lexora-only) must be hidden
    expect(html).not.toContain('href="/dashboard/course-library"');
  });

  it("shows all items for a both-licensed school", () => {
    const html = renderSidebar("admin", ALL, "both");
    expect(html).toContain('href="/dashboard/books"');
    expect(html).toContain('href="/lexora-books"');
    expect(html).toContain('href="/dashboard/borrowed"');
    expect(html).toContain('href="/dashboard/attendance"');
    expect(html).toContain('href="/dashboard/students"');
    expect(html).toContain('href="/dashboard/faculty"');
    expect(html).toContain('href="/dashboard/attendance/kiosk"');
    expect(html).toContain('href="/dashboard/course-library"');
  });
});
