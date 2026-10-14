import { useState } from "react";
import { Search, BookOpen, Globe, Plus, Minus, Loader2, Library, ListChecks } from "lucide-react";
import { useAssignedBooks } from "../hooks/useAssignedBooks";
import BulkAssignPanel from "./BulkAssignPanel";

function BookRow({ book, type, assigned, toggling, onToggle }) {
  const busy = toggling === `${type}-${book.id}`;
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {type === "lexora" ? (
          <Globe size={14} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
        ) : (
          <BookOpen size={14} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
        )}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
            {book.title}
          </p>
          {book.author && (
            <p className="truncate text-[11px]" style={{ color: "var(--text-muted)" }}>
              {book.author}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onToggle(book, type)}
        disabled={busy}
        className={assigned ? "rp-btn rp-btn--sm rp-btn--ghost" : "rp-btn rp-btn--sm rp-btn--secondary"}
        title={assigned ? "Remove from this category" : "Assign to this category"}
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : assigned ? (
          <Minus size={12} aria-hidden="true" />
        ) : (
          <Plus size={12} aria-hidden="true" />
        )}
        {assigned ? "Unassign" : "Assign"}
      </button>
    </li>
  );
}

/**
 * Books assigned to one category + the assignment controls:
 *   • bulk assign (filter-driven, one write for many books)
 *   • the search-driven per-book picker for precise toggles
 * Toggling reads the book's full category list first (the API
 * replaces it wholesale), so assigning here never wipes the book's
 * other departments' categories.
 */
export default function AssignedBooksPanel({ category }) {
  const {
    assigned, loading, error,
    physicalResults, lexoraResults, searching, togglingId,
    bulkPhysicalResults, bulkLexoraResults, bulkSearching, bulkAssigning,
    search, searchBulk, assignBook, unassignBook, bulkAssign,
  } = useAssignedBooks(category?.id ?? null);

  const [term, setTerm] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleToggle = async (book, type) => {
    const isAssigned = type === "lexora"
      ? assigned.lexoraBooks.some((b) => b.id === book.id)
      : assigned.books.some((b) => b.id === book.id);
    if (isAssigned) await unassignBook(book, type);
    else await assignBook(book, type);
  };

  if (!category) {
    return (
      <div className="rp-card flex h-full min-h-[240px] items-center justify-center p-6">
        <div className="text-center">
          <Library size={36} className="mx-auto mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Select a category to manage its assigned books.
          </p>
        </div>
      </div>
    );
  }

  const assignedPhysicalIds = new Set(assigned.books.map((b) => b.id));
  const assignedLexoraIds = new Set(assigned.lexoraBooks.map((b) => b.id));
  const hasResults = physicalResults.length > 0 || lexoraResults.length > 0;

  return (
    <div className="rp-card flex h-full flex-col">
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
        <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
          Assigned Books
        </h2>
        <p className="mt-0.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
          {category.name} · {category.department_name}
        </p>
      </div>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-light)" }}>
        {/* ── Bulk assign (collapsed by default; the per-book picker
             below stays for precise toggles) ── */}
        <button
          type="button"
          onClick={() => setBulkOpen((open) => !open)}
          className="rp-link-btn mb-2 inline-flex items-center gap-1.5 text-[12px] font-semibold"
          aria-expanded={bulkOpen}
        >
          <ListChecks size={13} aria-hidden="true" />
          {bulkOpen ? "Hide bulk assign" : "Bulk assign by filter"}
          {bulkAssigning && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
        </button>

        {bulkOpen && (
          <div className="mb-3 space-y-3">
            <BulkAssignPanel
              type="physical"
              bulkAssign={bulkAssign}
              search={searchBulk}
              results={{ physical: bulkPhysicalResults, lexora: bulkLexoraResults }}
              searching={bulkSearching}
            />
            <BulkAssignPanel
              type="lexora"
              bulkAssign={bulkAssign}
              search={searchBulk}
              results={{ physical: bulkPhysicalResults, lexora: bulkLexoraResults }}
              searching={bulkSearching}
            />
          </div>
        )}

        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              search(e.target.value);
            }}
            placeholder="…or search individual books to assign"
            className="rp-field pl-9 pr-3 py-2 text-sm w-full"
          />
        </div>
        {error && (
          <p className="mt-2 text-[12px]" role="alert" style={{ color: "var(--accent-danger)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {searching && (
          <p className="flex items-center gap-2 px-4 py-3 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Searching…
          </p>
        )}

        {term.trim() && !searching && hasResults && (
          <section className="py-2">
            <h3 className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Search results
            </h3>
            <ul className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {physicalResults.map((book) => (
                <BookRow
                  key={`p-${book.id}`}
                  book={book}
                  type="physical"
                  assigned={assignedPhysicalIds.has(book.id)}
                  toggling={togglingId}
                  onToggle={handleToggle}
                />
              ))}
              {lexoraResults.map((book) => (
                <BookRow
                  key={`l-${book.id}`}
                  book={book}
                  type="lexora"
                  assigned={assignedLexoraIds.has(book.id)}
                  toggling={togglingId}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          </section>
        )}

        <section className="py-2">
          <h3 className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Physical books ({assigned.books.length})
          </h3>
          {loading ? (
            <p className="px-4 py-2 text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : assigned.books.length === 0 ? (
            <p className="px-4 py-2 text-[12px]" style={{ color: "var(--text-muted)" }}>None assigned.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {assigned.books.map((book) => (
                <BookRow
                  key={`ap-${book.id}`}
                  book={book}
                  type="physical"
                  assigned
                  toggling={togglingId}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="py-2">
          <h3 className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Digital books ({assigned.lexoraBooks.length})
          </h3>
          {loading ? (
            <p className="px-4 py-2 text-[12px]" style={{ color: "var(--text-muted)" }}>Loading…</p>
          ) : assigned.lexoraBooks.length === 0 ? (
            <p className="px-4 py-2 text-[12px]" style={{ color: "var(--text-muted)" }}>None assigned.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border-light)" }}>
              {assigned.lexoraBooks.map((book) => (
                <BookRow
                  key={`al-${book.id}`}
                  book={book}
                  type="lexora"
                  assigned
                  toggling={togglingId}
                  onToggle={handleToggle}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
