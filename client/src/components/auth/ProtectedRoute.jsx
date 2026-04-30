// ─────────────────────────────────────────────────────────
//  components/auth/ProtectedRoute.jsx
//
//  Drop-in replacements / new guards for App.jsx routing.
//  All logic is centralized here so App.jsx stays clean.
// ─────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import authApi from "../../services/api/authApi";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../constants/index.js";
import { ROLES, ROLE_DEFAULT_ROUTES } from "../../constants/roles.js";

// ── Tiny inline spinner (no external dep) ─────────────────
function FullPageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", background: "var(--bg-main,#fff)"
    }}>
      <div style={{
        width: "32px", height: "32px",
        border: "3px solid var(--border-color,#e5e7eb)",
        borderTop: "3px solid var(--primary,#6366f1)",
        borderRadius: "50%", animation: "spin 0.7s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  1. ProtectedRoute
//     Verifies an active session exists.
//     Redirects to /login if not authenticated.
// ─────────────────────────────────────────────────────────
export function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    authApi.me()
      .then(() => setStatus("ok"))
      .catch(() => {
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
        setStatus("unauth");
      });
  }, []);

  if (status === "checking") return <FullPageLoader />;
  if (status === "unauth")   return <Navigate to="/login" replace />;
  return children;
}

// ─────────────────────────────────────────────────────────
//  2. RoleRoute
//     Checks the logged-in user's role against an allowlist.
//     Redirects to that role's default route if forbidden.
//
//  Usage:
//    <RoleRoute allow={[ROLES.ADMIN]}>
//      <Dashboard />
//    </RoleRoute>
//
//    <RoleRoute allow={[ROLES.ADMIN, ROLES.LIBRARIAN]}>
//      <Books />
//    </RoleRoute>
// ─────────────────────────────────────────────────────────
export function RoleRoute({ allow, children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const role   = user?.role ?? ROLES.ADMIN;

  if (!allow.includes(role)) {
    const fallback = ROLE_DEFAULT_ROUTES[role] ?? "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}

// ─────────────────────────────────────────────────────────
//  3. Convenience pre-configured guards
//     Use these instead of repeating allow arrays everywhere.
// ─────────────────────────────────────────────────────────

/** Only admin can access this route. */
export function AdminRoute({ children }) {
  return <RoleRoute allow={[ROLES.ADMIN]}>{children}</RoleRoute>;
}

/** Admin + Staff can access this route. */
export function AdminOrStaffRoute({ children }) {
  return <RoleRoute allow={[ROLES.ADMIN, ROLES.STAFF]}>{children}</RoleRoute>;
}

/** Admin + Librarian can access this route (books catalog). */
export function CatalogRoute({ children }) {
  return <RoleRoute allow={[ROLES.ADMIN, ROLES.LIBRARIAN]}>{children}</RoleRoute>;
}

/** Admin + Staff + Librarian — all authenticated roles. */
export function AnyRoleRoute({ children }) {
  return (
    <RoleRoute allow={[ROLES.ADMIN, ROLES.STAFF, ROLES.LIBRARIAN]}>
      {children}
    </RoleRoute>
  );
}
