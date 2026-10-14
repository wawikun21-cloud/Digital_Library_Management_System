// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useSchools.js
//
//  School list + CRUD. School writes are super_admin-only on the
//  server; the hook carries whatever the API answers so the page
//  can surface the refusal. No business rules here.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import {
  fetchSchools,
  createSchool,
  updateSchool,
  deleteSchool,
} from "../api/organizationApi";

export function useSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSchools();
      if (!result.success) throw new Error(result.error || "Failed to load schools");
      setSchools(result.data || []);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const addSchool = useCallback(async (payload) => {
    const result = await createSchool(payload);
    return result;
  }, []);

  const editSchool = useCallback(async (id, payload) => {
    const result = await updateSchool(id, payload);
    return result;
  }, []);

  const removeSchool = useCallback(async (id) => {
    const result = await deleteSchool(id);
    return result;
  }, []);

  return {
    schools,
    loading,
    error,
    loadSchools,
    addSchool,
    editSchool,
    removeSchool,
  };
}
