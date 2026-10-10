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
});
