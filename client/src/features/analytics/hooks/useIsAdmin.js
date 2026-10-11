/**
 * features/analytics/hooks/useIsAdmin.js
 *
 * Admin flag for the analytics dashboard, resolved against the server
 * session. Replaces the raw `fetch("/api/auth/me")` that lived in the
 * former pages/Dashboard.jsx — HTTP now goes through the shared authApi
 * module. Returns true only when the session user's role is "admin".
 */

import { useState, useEffect } from "react";
import authApi from "../../../services/api/authApi";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then(data => {
        if (active && data?.success && data?.data?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return isAdmin;
}
