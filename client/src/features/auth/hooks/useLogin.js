/**
 * features/auth/hooks/useLogin.js
 *
 * Login form state, validation, submit and the post-login redirect.
 * Extracted from the component body of the former pages/Login.jsx.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import authApi from "../../../services/api/authApi";
import { ROLES, ROLE_DEFAULT_ROUTES } from "../../../constants/roles.js";
import { STORAGE_KEYS } from "../../../constants/index.js";

const EMPTY_FORM = { username: "", password: "", rememberMe: false };

export function useLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [error,        setError]        = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError("");
  };

  const toggleShowPassword = useCallback(() => setShowPassword((v) => !v), []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) { setError("Username is required"); return; }
    if (!formData.password)        { setError("Password is required");  return; }

    setIsLoading(true);
    setError("");

    try {
      const { user } = await authApi.login(formData.username.trim(), formData.password);
      // FIX: Always write to localStorage so useLocalStorage() can read the role.
      // useLocalStorage (used in App.jsx, Layout.jsx, Sidebar.jsx) only reads
      // from localStorage — if we only write to sessionStorage the role is
      // never visible to those hooks, causing Admin to appear as Staff and
      // Staff to be unable to reach their allowed pages.
      localStorage.setItem(STORAGE_KEYS.LEXORA_USER, JSON.stringify(user));
      sessionStorage.setItem(STORAGE_KEYS.LEXORA_USER, JSON.stringify(user));
      // "Remember Me" controls persistence across browser restarts.
      // Without it we clear localStorage on logout (handled in authApi/logout).
      // The flag is stored so the logout handler knows whether to clear it.
      if (!formData.rememberMe) {
        // Mark the entry as session-only so logout can clean it up correctly.
        sessionStorage.setItem("lexora_remember", "false");
      }
      // Role-based post-login redirect
      const role    = user?.role ?? ROLES.ADMIN;
      const landing = ROLE_DEFAULT_ROUTES[role] ?? "/dashboard";
      navigate(landing, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return { formData, showPassword, isLoading, error, handleChange, toggleShowPassword, handleSubmit };
}
