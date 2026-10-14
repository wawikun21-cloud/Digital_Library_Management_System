// @vitest-environment jsdom
/**
 * useAssignedBooks: the bulk search channel is TYPE-SCOPED.
 *
 * Regression: searchBulk used to query both endpoints and fill both
 * result arrays on every call, so typing in the e-book panel populated
 * the physical panel's rows too (searching "Forensic" under e-books
 * showed physical matches in the Physical panel). These cases pin the
 * isolation: each call queries only its own endpoint and only writes
 * its own results.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

// vi.mock is hoisted above these imports, so the hook sees the mocked
// api module (no dynamic import needed).
vi.mock("../api/organizationApi", () => ({
  fetchHierarchy: vi.fn(),
  fetchCategoryBooks: vi.fn(async () => ({ success: true, data: { books: [], lexoraBooks: [] } })),
  fetchBookCategories: vi.fn(async () => ({ success: true, data: { categoryIds: [] } })),
  fetchLexoraBookCategories: vi.fn(async () => ({ success: true, data: { categoryIds: [] } })),
  searchBooksForAssignment: vi.fn(async () => ({ success: true, data: [{ id: 1, title: "Physical Forensic" }] })),
  searchLexoraBooksForAssignment: vi.fn(async () => ({ success: true, data: [{ id: 2, title: "E-book Forensic" }] })),
  setBookCategories: vi.fn(),
  setLexoraBookCategories: vi.fn(),
  assignCategoryBooks: vi.fn(async () => ({ success: true, data: { matched: 0, assigned: 0, skipped: 0 } })),
}));

import * as api from "../api/organizationApi";
import { useAssignedBooks } from "./useAssignedBooks";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(<Probe />); });
  return {
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Probe exposes the hook's live state through a mutable ref object. */
let probeState = null;
function Probe() {
  probeState = useAssignedBooks(99);
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  probeState = null;
});

describe("useAssignedBooks bulk search", () => {
  it("searching e-books only queries and fills the e-book results", async () => {
    const view = mount();
    await act(async () => {
      await probeState.searchBulk("Forensic", {}, "lexora");
    });

    expect(api.searchLexoraBooksForAssignment).toHaveBeenCalledWith("Forensic", {});
    expect(api.searchBooksForAssignment).not.toHaveBeenCalled();
    expect(probeState.bulkLexoraResults).toEqual([{ id: 2, title: "E-book Forensic" }]);
    expect(probeState.bulkPhysicalResults).toEqual([]);
    view.unmount();
  });

  it("searching physical books only queries and fills the physical results", async () => {
    const view = mount();
    await act(async () => {
      await probeState.searchBulk("Forensic", {}, "physical");
    });

    expect(api.searchBooksForAssignment).toHaveBeenCalledWith("Forensic", {});
    expect(api.searchLexoraBooksForAssignment).not.toHaveBeenCalled();
    expect(probeState.bulkPhysicalResults).toEqual([{ id: 1, title: "Physical Forensic" }]);
    expect(probeState.bulkLexoraResults).toEqual([]);
    view.unmount();
  });

  it("clearing the search clears only that type", async () => {
    const view = mount();
    await act(async () => {
      await probeState.searchBulk("Forensic", {}, "physical");
      await probeState.searchBulk("Forensic", {}, "lexora");
    });
    await act(async () => {
      await probeState.searchBulk("", {}, "lexora");
    });

    expect(probeState.bulkLexoraResults).toEqual([]);
    expect(probeState.bulkPhysicalResults).toEqual([{ id: 1, title: "Physical Forensic" }]);
    view.unmount();
  });
});
