/**
 * features/transactions/hooks/useTransactionFilters.js
 *
 * Query / status / borrower-type filters plus the derived list and summary
 * counts. Extracted from the former pages/Borrowed.jsx, following the same
 * concern split as the other features' filter hooks.
 */

import { useState, useMemo } from "react";
import useDebounce from "../../../hooks/useDebounce";
import { isOverdue } from "../utils/transactionDates";

const SEARCH_KEYS = ["book_title", "book_author", "borrower_name", "borrower_id_number", "book_accession"];

export function useTransactionFilters(txns) {
  const [query,        setQuery]        = useState("");
  const debouncedQuery                  = useDebounce(query, 300);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter,   setTypeFilter]   = useState("All");  // All | student | faculty

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    return txns.filter(t => {
      if (q && !SEARCH_KEYS.some(k => t[k]?.toString().toLowerCase().includes(q))) return false;
      if (statusFilter === "Overdue"  && !isOverdue(t.due_date, t.status)) return false;
      if (statusFilter === "Borrowed" && t.status !== "Borrowed") return false;
      if (statusFilter === "Returned" && t.status !== "Returned") return false;
      if (typeFilter !== "All" && (t.borrower_type || "student") !== typeFilter) return false;
      return true;
    });
  }, [txns, debouncedQuery, statusFilter, typeFilter]);

  // ── Stats summary ─────────────────────────────────────
  const summary = useMemo(() => ({
    total:    txns.length,
    borrowed: txns.filter(t => t.status === "Borrowed").length,
    returned: txns.filter(t => t.status === "Returned").length,
    overdue:  txns.filter(t => isOverdue(t.due_date, t.status)).length,
  }), [txns]);

  const hasActiveFilters = Boolean(query || statusFilter !== "All" || typeFilter !== "All");

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("All");
    setTypeFilter("All");
  };

  return {
    query, setQuery,
    statusFilter, setStatusFilter,
    typeFilter, setTypeFilter,
    filtered, summary,
    hasActiveFilters, clearFilters,
  };
}
