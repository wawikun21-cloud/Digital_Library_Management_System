import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import OrganizationTree from "./OrganizationTree";

// AssignedBooksPanel fetches its assigned books in an effect. Effects
// don't run under renderToString, but mock the module so this test
// never depends on a network layer.
vi.mock("../api/organizationApi", () => ({
  fetchHierarchy: vi.fn(),
  fetchCategoryBooks: vi.fn(async () => ({ success: true, data: { books: [], lexoraBooks: [] } })),
  fetchBookCategories: vi.fn(async () => ({ success: true, data: { categoryIds: [] } })),
  fetchLexoraBookCategories: vi.fn(async () => ({ success: true, data: { categoryIds: [] } })),
  searchBooksForAssignment: vi.fn(async () => ({ success: true, data: [] })),
  searchLexoraBooksForAssignment: vi.fn(async () => ({ success: true, data: [] })),
  setBookCategories: vi.fn(),
  setLexoraBookCategories: vi.fn(),
}));

const HIERARCHY = [
  {
    id: 1,
    code: "DEFAULT_SCHOOL",
    name: "Main Campus",
    status: "active",
    departments: [
      {
        id: 10,
        name: "College of Information Technology",
        code: "CIT",
        is_active: 1,
        categories: [
          { id: 100, name: "Reference", book_count: 2, lexora_book_count: 1 },
        ],
      },
    ],
  },
];

const NO_ACTIONS = {
  canCreate: true,
  creatingFor: null,
  saving: false,
  inlineError: "",
  startCreate: () => {},
  cancelCreate: () => {},
  submitCreate: async () => {},
  openModal: () => {},
  closeModal: () => {},
};

function render(expandedIds, actions = NO_ACTIONS) {
  // MemoryRouter: the rows' "Manage" links are react-router <Link>s.
  return renderToString(
    <MemoryRouter>
      <OrganizationTree
        schools={HIERARCHY}
        loading={false}
        query=""
        expandedIds={new Set(expandedIds)}
        onToggle={() => {}}
        actions={actions}
      />
    </MemoryRouter>
  );
}

describe("OrganizationTree", () => {
  // Regression: `creatingFor?.kind === childKind` was `undefined ===
  // undefined` on category nodes (no childKind) and then dereferenced
  // null.parentId — expanding a category crashed the page.
  it("renders an expanded category with its assigned-books panel", () => {
    const html = render([1, 10, 100]);
    expect(html).toContain("Reference");
    expect(html).toContain("Assigned Books");
  });

  it("renders a collapsed category row without crashing", () => {
    const html = render([1, 10]);
    expect(html).toContain("Reference");
  });

  it("renders the whole tree with no create row open", () => {
    const html = render([]);
    expect(html).toContain("Main Campus");
    expect(html).not.toContain("Department name");
  });

  it("shows the inline create row only under the creating parent", () => {
    const html = render([1], { ...NO_ACTIONS, creatingFor: { kind: "department", parentId: 1 } });
    expect(html).toContain("Department name");
    expect(html).not.toContain("Category name");
  });
});
