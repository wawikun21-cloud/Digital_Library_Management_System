// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useDepartments.js
//
//  Department list + CRUD for ONE school. Super Admin pages pass
//  the selected school; scoped pages pass the caller's own school
//  (the server re-validates either way — never trusts the id).
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import {
  fetchDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../api/organizationApi";

export function useDepartments(schoolId) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDepartments = useCallback(async () => {
    if (!schoolId) {
      setDepartments([]);
      return { success: true, data: [] };
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDepartments(schoolId);
      if (!result.success) throw new Error(result.error || "Failed to load departments");
      setDepartments(result.data || []);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const addDepartment = useCallback(async (payload) => createDepartment(payload), []);
  const editDepartment = useCallback(async (id, payload) => updateDepartment(id, payload), []);
  const removeDepartment = useCallback(async (id) => deleteDepartment(id), []);

  return {
    departments,
    loading,
    error,
    loadDepartments,
    addDepartment,
    editDepartment,
    removeDepartment,
  };
}
