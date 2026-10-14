/**
 * features/faculty/hooks/useFaculty.js
 *
 * Faculty list + CRUD. Extracted from the component body of the former
 * pages/Faculty.jsx.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAllFaculty, createFaculty, updateFaculty, deleteFaculty,
} from "../api/facultyApi";

export function useFaculty({ showToast }) {
  const [faculty, setFaculty]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFaculty = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAllFaculty();
      if (data.success) setFaculty(data.data);
      else showToast("Failed to load faculty", "error");
    } catch {
      showToast("Could not connect to server", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchFaculty(); }, [fetchFaculty]);

  const createMember = useCallback(async (formData) => {
    try {
      const data = await createFaculty(formData);
      if (data.success) {
        showToast("Faculty added successfully");
        fetchFaculty();
        return true;
      }
      showToast(data.error || "Failed to add faculty", "error");
      return false;
    } catch { showToast("Failed to connect to server", "error"); return false; }
  }, [showToast, fetchFaculty]);

  const updateMember = useCallback(async (id, formData) => {
    try {
      const data = await updateFaculty(id, formData);
      if (data.success) {
        showToast("Faculty updated successfully");
        fetchFaculty();
        return true;
      }
      showToast(data.error || "Failed to update faculty", "error");
      return false;
    } catch { showToast("Failed to connect to server", "error"); return false; }
  }, [showToast, fetchFaculty]);

  const deleteMember = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this faculty member?")) return;
    try {
      const data = await deleteFaculty(id);
      if (data.success) {
        showToast("Faculty deleted successfully");
        fetchFaculty();
      } else {
        showToast(data.error || "Failed to delete faculty", "error");
      }
    } catch { showToast("Failed to connect to server", "error"); }
  }, [showToast, fetchFaculty]);

  return { faculty, isLoading, fetchFaculty, createMember, updateMember, deleteMember };
}
