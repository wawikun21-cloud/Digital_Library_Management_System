/**
 * features/audit/hooks/useAuditLog.js
 *
 * Audit trail data hook: paginated fetching with AbortController, debounced
 * AJAX filtering, real-time toast/badge state via WebSocket. Extracted from
 * the component body of the former pages/AuditLog.jsx.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "../../../hooks/useWebsocket";
import { useLocalStorage } from "../../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../../constants/index.js";
import auditApi from "../api/auditApi";
import { EMPTY_FILTERS, PAGE_SIZE, TEXT_DEBOUNCE_MS } from "../constants/auditUi";

export function useAuditLog() {
  const [logs,       setLogs]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [toasts,     setToasts]     = useState([]);
  const [newBadge,   setNewBadge]   = useState(0);

  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [page,    setPage]    = useState(1);
  const toastCounter = useRef(0);
  const abortRef     = useRef(null);   // tracks in-flight AbortController
  const debounceRef  = useRef(null);   // tracks pending debounce timer

  // ── User role ────────────────────────────────────────────
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const isAdmin = (user?.role ?? "admin") === "admin";

  // ── Fetch logs (AJAX-aware) ───────────────────────────────
  // Cancels any in-flight request before starting a new one.
  const fetchLogs = useCallback(async (pg = 1, f = filters) => {
    // Cancel previous request if still pending
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller  = new AbortController();
    abortRef.current  = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.getLogs(
        { page: pg, limit: PAGE_SIZE, ...f },
        { signal: controller.signal }
      );
      setLogs(data.data || []);
      setPagination(data.pagination || { total: 0, page: 1, totalPages: 1 });
      setNewBadge(0);
    } catch (err) {
      // Ignore abort errors — they are intentional
      if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // ── Initial load ─────────────────────────────────────────
  const isFirstRender = useRef(true);
  useEffect(() => { fetchLogs(1, filters); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AJAX smart filtering ──────────────────────────────────
  // Runs on every filter change after the first render.
  // Dropdowns (entity_type, action) fire immediately (0 ms delay).
  // Text / date fields debounce by TEXT_DEBOUNCE_MS.
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    // Determine whether the last-changed field is a dropdown (instant) or text/date (debounce).
    // Simpler: run debounce for all; dropdowns just feel instant at 0 ms.
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1, filters);
    }, TEXT_DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket — real-time audit:new ──────────────────────
  useWebSocket({
    isAdmin,
    onAuditEvent: (event) => {
      const id = ++toastCounter.current;
      setToasts(prev => [...prev.slice(-3), { ...event, id }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
      setNewBadge(n => n + 1);
    },
  });

  // ── Actions ───────────────────────────────────────────────
  const handleFilterChange = useCallback((key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
    // fetchLogs will fire via the useEffect above
  }, []);

  const goToPage = useCallback((pg) => {
    setPage(pg);
    fetchLogs(pg, filters);
  }, [fetchLogs, filters]);

  const handleExport = useCallback(() => {
    auditApi.exportCsv(filters);
  }, [filters]);

  const handleRefresh = useCallback(() => {
    fetchLogs(page, filters);
  }, [fetchLogs, page, filters]);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  return {
    logs, pagination, loading, error,
    filters, handleFilterChange, clearFilters, activeFilterCount,
    page, goToPage, handleRefresh, handleExport,
    toasts, dismissToast, newBadge,
    selectedEntry, setSelectedEntry,
  };
}
