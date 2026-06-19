/**
 * useAudits Hook
 * Custom hook for audit log management
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { getAudits, purgeAudits } from "../services/api/auditApi";
import useWebsocket from "./useWebsocket";

export function useAudits() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});  // FIX: was used but never declared

  // Filters
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // NEW: Client search support
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // WebSocket realtime
  const ws = useWebsocket();
  useEffect(() => {
    if (ws) {
      const handleAuditNew = (newAudit) => {
        refresh(); // FIXED: Sync pagination instead of prepend
      };
      ws.on('audit:new', handleAuditNew);
      return () => ws.off('audit:new', handleAuditNew);
    }
  }, [ws]);

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
      };
      if (userFilter) params.user = userFilter;
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entityType = entityFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (searchQuery) params.search = searchQuery; // NEW: Pass search to backend

      const result = await getAudits(params);

      if (result.success) {
        setAudits(result.data || []);
        setPagination(result.pagination || {});
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, userFilter, actionFilter, entityFilter, dateFrom, dateTo, searchQuery]); // NEW: Auto-refetch on search

  // Initial fetch + refetch on filter change
  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const purgeOld = useCallback(async (days) => {
    const result = await purgeAudits(days);
    if (result.success) {
      await fetchAudits();
      return true;
    }
    return false;
  }, [fetchAudits]);

  // Derived filters
  const actions = useMemo(() => [...new Set(audits.map(a => a.action))].sort(), [audits]);
  const entities = useMemo(() => [...new Set(audits.map(a => a.entity_type).filter(Boolean))].sort(), [audits]);
  const users = useMemo(() => [...new Set(audits.map(a => a.username))].sort(), [audits]);

  const filteredAudits = useMemo(() => {
    return audits; // Server-side filtering already (incl. search)
  }, [audits]);

  return {
    audits: filteredAudits,
    loading,
    error,
    pagination,

    // Filters
    userFilter,
    setUserFilter,
    actionFilter,
    setActionFilter,
    entityFilter,
    setEntityFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    searchQuery,
    setSearchQuery, // NEW: Expose to Audits.jsx

    // Derived
    actions,
    entities,
    users,

    // Actions
    refresh: fetchAudits,
    purgeOld,
  };
}

export default useAudits;