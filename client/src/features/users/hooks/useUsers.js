import { useState, useCallback } from "react";
import {
  fetchUsers,
  fetchUserById,
  fetchUserStats,
  createUser,
  updateUser,
  changeUserRole,
  changeUserPassword,
  deactivateUser,
  reactivateUser,
} from "../api/usersApi";

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const loadUsers = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUsers(params);
      if (!result.success) {
        throw new Error(result.error || "Failed to load users");
      }
      setUsers(result.data || []);
      setPagination({
        page: result.pagination?.page || 1,
        limit: result.pagination?.limit || 20,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 1,
      });
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUser = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserById(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to load user");
      }
      return result.data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const result = await fetchUserStats();
    return result;
  }, []);

  const addUser = useCallback(async (userData) => {
    const result = await createUser(userData);
    if (result.success) {
      setUsers((prev) => [result.data, ...prev]);
    }
    return result;
  }, []);

  const editUser = useCallback(async (id, updates) => {
    const result = await updateUser(id, updates);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updates } : u))
      );
    }
    return result;
  }, []);

  const assignRole = useCallback(async (id, newRole, reason) => {
    const result = await changeUserRole(id, newRole, reason);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
      );
    }
    return result;
  }, []);

  const editPassword = useCallback(async (id, password, confirmPassword) => {
    const result = await changeUserPassword(id, password, confirmPassword);
    return result;
  }, []);

  const removeUser = useCallback(async (id) => {
    const result = await deactivateUser(id);
    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    }
    return result;
  }, []);

  const restoreUser = useCallback(async (id) => {
    const result = await reactivateUser(id);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: 1 } : u))
      );
    }
    return result;
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    loadUsers,
    loadUser,
    loadStats,
    addUser,
    editUser,
    assignRole,
    editPassword,
    removeUser,
    restoreUser,
    setUsers,
    setError,
  };
}
