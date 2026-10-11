/**
 * features/transactions/components/TransactionToolbar.jsx
 *
 * Search + status/borrower-type filters + clear + borrow button. Extracted
 * from the former pages/Borrowed.jsx.
 */

import { Search, X, Plus } from "lucide-react";

export default function TransactionToolbar({
  query, onQuery, statusFilter, onStatusFilter, typeFilter, onTypeFilter,
  onClearFilters, hasActiveFilters, canBorrow, onBorrowClick,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 justify-between">
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">

        {/* Search */}
        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-sm"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
          <Search size={14} className="shrink-0" style={{ color: "var(--text-secondary)" }} />
          <input
            className="border-none outline-none text-[13px] bg-transparent w-full"
            style={{ color: "var(--text-primary)" }}
            placeholder="Search borrower, book, accession…"
            value={query}
            onChange={e => onQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => onQuery("")} style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => onStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none cursor-pointer"
          style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            color: statusFilter !== "All" ? "var(--accent-amber)" : "var(--text-secondary)",
          }}
        >
          <option value="All">All Status</option>
          <option value="Borrowed">Borrowed</option>
          <option value="Returned">Returned</option>
          <option value="Overdue">Overdue</option>
        </select>

        {/* Borrower type filter */}
        <select
          value={typeFilter}
          onChange={e => onTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none cursor-pointer"
          style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            color: typeFilter !== "All" ? "var(--accent-amber)" : "var(--text-secondary)",
          }}
        >
          <option value="All">All Borrowers</option>
          <option value="student">Students</option>
          <option value="faculty">Faculty</option>
        </select>

        {/* Clear filters */}
        {(statusFilter !== "All" || typeFilter !== "All" || query) && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[12px] font-medium"
            style={{ color: "var(--accent-amber)", border: "1px solid var(--border)" }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Borrow button */}
      {canBorrow && (
        <button
          onClick={onBorrowClick}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white flex-shrink-0"
          style={{ background: "var(--accent-amber)" }}
        >
          <Plus size={14} /> Borrow Book
        </button>
      )}
    </div>
  );
}
