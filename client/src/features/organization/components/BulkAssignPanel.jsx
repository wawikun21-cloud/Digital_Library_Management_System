// ─────────────────────────────────────────────────────────
//  features/organization/components/BulkAssignPanel.jsx
//
//  Fast book → category assignment (the alternative to toggling
//  books one by one):
//
//   1. filter the catalog (same filters the book lists expose)
//   2. the counts refresh automatically — "N match · M already
//      assigned" — and the matching rows appear below
//   3. Assign applies the whole selection in one idempotent write
//
//  Unchecking visible rows excludes them; everything else matching
//  the filters is included, so no filters + no exclusions =
//  "assign everything in my school".
//
//  Filter keys mirror the server contract: physical → collection +
//  status, lexora → status + visibility + source_type.
// ─────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react";
import { Loader2, Check, ListChecks } from "lucide-react";
import { useDebounce } from "../../../hooks/useDebounce";

const PHYSICAL_STATUSES = ["", "Available", "OutOfStock", "Damaged", "Lost"];
const LEXORA_STATUSES = ["", "draft", "published", "archived"];
const LEXORA_VISIBILITY = ["", "public", "private"];
const LEXORA_SOURCE_TYPES = ["", "pdf", "images"];

const EMPTY_FILTERS = { search: "", collection: "", status: "", visibility: "", source_type: "" };

/** Drop empty filter values — the server treats absent as "any". */
function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
}

function Counts({ preview, busy }) {
  if (busy) {
    return (
      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <Loader2 size={11} className="animate-spin" /> Counting…
      </span>
    );
  }
  if (!preview) return null;
  const already = preview.already_assigned ?? 0;
  return (
    <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
      <strong className="tabular-nums">{preview.matched}</strong> match
      {preview.matched === 1 ? "" : "es"}
      {already > 0 && (
        <>
          {" · "}
          <strong className="tabular-nums">{already}</strong> already assigned
        </>
      )}
    </span>
  );
}

export default function BulkAssignPanel({
  type = "physical",
  bulkAssign,
  search,
  results,
  searching,
}) {
  const isLexora = type === "lexora";
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [excluded, setExcluded] = useState(() => new Set());
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Settled filters drive both the exclusion rows and the preview.
  const debouncedFilters = useDebounce(filters, 400);
  const filterKey = useMemo(() => JSON.stringify(cleanFilters(debouncedFilters)), [debouncedFilters]);

  useEffect(() => {
    let active = true;
    const cleaned = JSON.parse(filterKey);
    // Type-scoped: the e-book panel never queries (or shows) physical
    // books and vice versa — the shared channel used to fill both.
    search(debouncedFilters.search || "", cleaned, type);
    setPreviewing(true);
    bulkAssign({ type, mode: "filter", filters: cleaned, dry_run: true })
      .then((res) => {
        if (!active) return;
        if (res?.success) {
          setPreview(res.data);
          setError("");
        } else {
          setError(res?.error || "Failed to count matches");
        }
      })
      .catch(() => { if (active) setError("Failed to count matches"); })
      .finally(() => { if (active) setPreviewing(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  const updateFilters = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  const toggleExcluded = (id) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rows = isLexora ? results?.lexora || [] : results?.physical || [];

  const eligible = preview ? Math.max(0, (preview.matched - (preview.already_assigned ?? 0)) - excluded.size) : 0;

  const handleAssign = async () => {
    setApplying(true);
    setResult(null);
    try {
      const res = await bulkAssign({
        type,
        mode: "filter",
        filters: cleanFilters(filters),
        exclude_ids: [...excluded],
        dry_run: false,
      });
      if (res?.success) {
        setResult(res.data);
        setError("");
      } else {
        setError(res?.error || "Failed to assign books");
      }
    } catch {
      setError("Failed to assign books");
    } finally {
      setApplying(false);
    }
  };

  return (
    <section
      className="rounded-lg p-3"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
    >
      <h3
        className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        <ListChecks size={12} /> Bulk assign {isLexora ? "e-books" : "books"}
      </h3>

      {/* ── Filters (mirror the catalog's) ── */}
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[140px] flex-1">
          <span className="sr-only">Search</span>
          <input
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Title, author, ISBN…"
            className="rp-field w-full px-2.5 py-1.5 text-[12px]"
          />
        </label>

        {!isLexora && (
          <label>
            <span className="sr-only">Collection</span>
            <input
              value={filters.collection}
              onChange={(e) => updateFilters({ collection: e.target.value })}
              placeholder="Collection"
              className="rp-field w-[110px] px-2.5 py-1.5 text-[12px]"
            />
          </label>
        )}

        <label>
          <span className="sr-only">Status</span>
          <select
            value={filters.status}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="rp-field w-[110px] px-2.5 py-1.5 text-[12px]"
          >
            {(isLexora ? LEXORA_STATUSES : PHYSICAL_STATUSES).map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All status"}
              </option>
            ))}
          </select>
        </label>

        {isLexora && (
          <>
            <label>
              <span className="sr-only">Visibility</span>
              <select
                value={filters.visibility}
                onChange={(e) => updateFilters({ visibility: e.target.value })}
                className="rp-field w-[110px] px-2.5 py-1.5 text-[12px]"
              >
                {LEXORA_VISIBILITY.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value || "All visibility"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Format</span>
              <select
                value={filters.source_type}
                onChange={(e) => updateFilters({ source_type: e.target.value })}
                className="rp-field w-[110px] px-2.5 py-1.5 text-[12px]"
              >
                {LEXORA_SOURCE_TYPES.map((value) => (
                  <option key={value || "all"} value={value}>
                    {value || "All formats"}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {/* ── Counts + outcome ── */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Counts preview={preview} busy={previewing} />
        {result && (
          <span className="text-[11px] font-semibold" style={{ color: "#2d7a47" }}>
            Assigned {result.assigned}
            {result.skipped > 0 && ` (${result.skipped} already assigned or excluded)`}
          </span>
        )}
        {error && (
          <span className="text-[11px] font-semibold" role="alert" style={{ color: "var(--accent-danger)" }}>
            {error}
          </span>
        )}
      </div>

      {/* ── Exclusions: the visible matches, all included by default ── */}
      {(rows.length > 0 || searching) && (
        <div className="mt-2">
          <p className="mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {searching
              ? "Loading matches…"
              : `Uncheck to exclude from the assignment (showing the first ${rows.length}):`}
          </p>
          {rows.length > 0 && (
            <ul className="max-h-[132px] space-y-0.5 overflow-y-auto">
              {rows.map((book) => (
                <li key={`${type}-${book.id}`} className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={!excluded.has(book.id)}
                    onChange={() => toggleExcluded(book.id)}
                    aria-label={`Include ${book.title}`}
                  />
                  <span className="truncate" style={{ color: "var(--text-primary)" }}>
                    {book.title}
                  </span>
                  {book.collection && (
                    <span className="shrink-0 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {book.collection}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Commit ── */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {eligible > 0
            ? `Assign ${eligible} ${isLexora ? "e-book" : "book"}${eligible === 1 ? "" : "s"} to this category.`
            : "Nothing new to assign with these filters."}
        </p>
        <button
          type="button"
          onClick={handleAssign}
          disabled={eligible <= 0 || applying}
          className="rp-btn rp-btn--sm rp-btn--primary"
        >
          {applying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Assign
        </button>
      </div>
    </section>
  );
}
