// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useHierarchy.js
//
//  Loads the full School → Department → Category tree in one
//  request (GET /api/organization/hierarchy — already scoped
//  server-side: super_admin gets every school, everyone else
//  gets their own). Thin glue: state + API call, no rules.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { fetchHierarchy } from "../api/organizationApi";

export function useHierarchy() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHierarchy();
      if (!result.success) throw new Error(result.error || "Failed to load the organization tree");
      setSchools(result.data || []);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { schools, loading, error, loadHierarchy };
}
