/**
 * features/auth/hooks/useChangePassword.js
 *
 * Self-service password change through the existing profile endpoint
 * (PATCH /api/auth/profile). On success the server clears
 * must_change_password and answers with the fresh user payload —
 * the cached user is refreshed here so the first-login prompt
 * disappears immediately.
 */

import { useState, useCallback } from "react";
import authApi from "../../../services/api/authApi";
import { STORAGE_KEYS } from "../../../constants/index.js";

export function useChangePassword({ onChanged } = {}) {
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const changePassword = useCallback(async ({ password, confirmPassword }) => {
    setError("");

    if (!password || password.length < 6) {
      setError("New password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    setSaving(true);
    try {
      const data = await authApi.updateProfile({ password, confirmPassword });
      // Refresh the cached user with the server's answer (flag cleared).
      if (data?.user) {
        const raw = JSON.stringify(data.user);
        localStorage.setItem(STORAGE_KEYS.LEXORA_USER, raw);
        sessionStorage.setItem(STORAGE_KEYS.LEXORA_USER, raw);
      }
      onChanged?.(data.user);
      return true;
    } catch (err) {
      setError(err.message || "Failed to change password");
      return false;
    } finally {
      setSaving(false);
    }
  }, [onChanged]);

  return { changePassword, saving, error, setError };
}
