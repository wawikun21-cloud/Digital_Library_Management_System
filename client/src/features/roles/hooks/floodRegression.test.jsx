// @vitest-environment jsdom
/**
 * Executable regression test for the API flood.
 *
 * The load effect used to depend on the caller's inline `onFeedback` arrow.
 * Every render produced a new function identity, so the effect re-ran, each
 * fetch resolved a fresh array → setState → re-render → refetch, forever.
 *
 * This mounts the real hook under jsdom, stubs the HTTP layer, and counts
 * how many times the loaders are called. Before the fix this number grows
 * without bound; after the fix it is exactly one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import * as api from "../api/rolesApi";

// React 18 requires this flag to treat the test as an act() environment.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  globalThis.localStorage = {
    store: new Map(),
    getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
    setItem(k, v) { this.store.set(k, String(v)); },
    removeItem(k) { this.store.delete(k); },
  };
});

afterEach(() => {
  vi.restoreAllMocks();
});

const ok = (payload) => async () => ({
  ok: true, status: 200, json: async () => ({ success: true, data: payload }),
});

describe("useRolesManager — load effect must not loop", () => {
  it("fetches roles and permissions exactly once per mount", async () => {
    const getRoles = vi.spyOn(api, "getRoles").mockImplementation(
      ok([{ name: "staff", display_name: "Staff", permission_count: 1, user_count: 1 }])
    );
    const getPermissions = vi.spyOn(api, "getPermissions").mockImplementation(
      ok([{ name: "manage_books", display_name: "Manage Books", category: "books", actions: ["view"] }])
    );

    const { useRolesManager } = await import("../hooks/useRolesManager");

    // An unstable inline arrow, exactly what RolesPage and the drawer pass.
    function Probe() {
      useRolesManager({ onFeedback: () => {} });
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => { root.render(React.createElement(Probe)); });

    // Let a loop spin: each iteration is a fetch + a state update.
    for (let i = 0; i < 25; i++) {
      await act(async () => { await Promise.resolve(); });
    }

    expect(getRoles).toHaveBeenCalledTimes(1);
    expect(getPermissions).toHaveBeenCalledTimes(1);

    await act(async () => { root.unmount(); });
    container.remove();
  });

  it("does not refetch when the caller's callback identity changes", async () => {
    const getRoles = vi.spyOn(api, "getRoles").mockImplementation(ok([]));
    vi.spyOn(api, "getPermissions").mockImplementation(ok([]));
    const { useRolesManager } = await import("../hooks/useRolesManager");

    let rerender;
    function Probe({ onFeedback }) {
      useRolesManager({ onFeedback });
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      rerender = (cb) => root.render(React.createElement(Probe, { onFeedback: cb }));
      rerender(() => {});
    });

    // Force several re-renders with a fresh callback each time.
    for (let i = 0; i < 6; i++) {
      await act(async () => { rerender(() => {}); });
    }

    expect(getRoles).toHaveBeenCalledTimes(1);

    await act(async () => { root.unmount(); });
    container.remove();
  });

  it("still calls the caller's latest callback on error", async () => {
    vi.spyOn(api, "getRoles").mockImplementation(async () => ({ ok: false, status: 500, message: "boom" }));
    vi.spyOn(api, "getPermissions").mockImplementation(ok([]));
    const { useRolesManager } = await import("../hooks/useRolesManager");

    const seen = [];
    function Probe() {
      useRolesManager({ onFeedback: (type, msg) => seen.push([type, msg]) });
      return null;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => { root.render(React.createElement(Probe)); });
    for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); });

    // The ref keeps the latest closure callable even though it is not a dep.
    expect(seen).toContainEqual(["error", "boom"]);

    await act(async () => { root.unmount(); });
    container.remove();
  });
});
