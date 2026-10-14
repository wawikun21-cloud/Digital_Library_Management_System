/**
 * DashboardHeroCard — renders the KPI strip and only offers a call-to-action
 * the user can actually open (PermissionRoute would bounce anything else).
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import DashboardHeroCard from "./DashboardHeroCard";
import { STORAGE_KEYS } from "../../../../constants/index.js";

beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(key) { return this.store.has(key) ? this.store.get(key) : null; },
    setItem(key, value) { this.store.set(key, String(value)); },
    removeItem(key) { this.store.delete(key); },
  };
});

function render(user, props = {}) {
  if (user) globalThis.localStorage.setItem(STORAGE_KEYS.LEXORA_USER, JSON.stringify(user));
  return renderToString(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(DashboardHeroCard, {
        kpiStats: { nemcoTotal: 1200, lexoraTotal: 340, nemcoOutOfStock: 12, returned: 90 },
        loading: false,
        error: null,
        onRefresh: () => {},
        ...props,
      })
    )
  );
}

describe("DashboardHeroCard", () => {
  it("greets the user and renders all four KPIs", () => {
    const html = render({ id: 1, username: "maria", role: "librarian", permissions: ["manage_books"] });
    expect(html).toContain("Welcome back, Maria");
    expect(html).toContain("1,200");
    expect(html).toContain("SCHOOL BOOKS");
    expect(html).toContain("Returned");
  });

  it("offers the borrowed-books CTA when manage_transactions is held", () => {
    const html = render({ id: 1, role: "staff", permissions: ["manage_transactions", "manage_books"] });
    expect(html).toContain("Review borrowed books");
  });

  it("falls back to the catalog CTA, and to none, by permission", () => {
    expect(render({ id: 1, role: "librarian", permissions: ["manage_books"] })).toContain("Manage the catalog");
    const none = render({ id: 1, role: "staff", permissions: ["view_dashboard"] });
    expect(none).not.toContain("Review borrowed books");
    expect(none).not.toContain("Manage the catalog");
  });

  it("shows the stats error banner", () => {
    const html = render({ id: 1, role: "admin", permissions: [] }, { error: "boom" });
    expect(html).toContain("Stats unavailable:");
    expect(html).toContain("boom");
  });
});
