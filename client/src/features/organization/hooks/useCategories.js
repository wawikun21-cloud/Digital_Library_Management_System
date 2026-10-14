// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useCategories.js
//
//  Category list + CRUD for one school (optionally narrowed to a
//  department). Also the picker source for department-scoped
//  category multi-selects used by the book and user forms.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/organizationApi";

export function useCategories({ departmentId = null, schoolId = null } = {}) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCategories = useCallback(async () => {
    if (!departmentId && !schoolId) {
      setCategories([]);
      return { success: true, data: [] };
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCategories({ departmentId, schoolId });
      if (!result.success) throw new Error(result.error || "Failed to load categories");
      setCategories(result.data || []);
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [departmentId, schoolId]);

  const addCategory = useCallback(async (payload) => createCategory(payload), []);
  const editCategory = useCallback(async (id, payload) => updateCategory(id, payload), []);
  const removeCategory = useCallback(async (id) => deleteCategory(id), []);

  return {
    categories,
    loading,
    error,
    loadCategories,
    addCategory,
    editCategory,
    removeCategory,
  };
}
