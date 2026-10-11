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
import { hasPermission } from "../../utils/permissionUtils";

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
//     Persists the fresh /me payload so the cached user always
//     carries resolved permissions after a page load.
//     Redirects to /login if not authenticated.
// ─────────────────────────────────────────────────────────
export function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  const [cachedUser, setCachedUser] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  useEffect(() => {
    let active = true;

    authApi.me()
      .then((data) => {
        if (!active) return;
        // Persist the server's resolved permission fields so nav items and
        // button gating are accurate immediately after a reload.
        if (data?.user) setCachedUser(data.user);
        setStatus("ok");
      })
      .catch(() => {
        if (!active) return;
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
        setStatus("unauth");
      });

    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
//  3. PermissionRoute
//     Checks a resolved permission (any action) instead of a role,
//     so a role whose grants were edited by a Super Admin still
//     follows the server's decision.
//
//  On denial the user lands on /unauthorized, which says why, instead
//  of bouncing silently to their role's default route — a dead redirect
//  with no explanation looked exactly like the bug it was hiding
//  (a restricted menu item that "does nothing").
//
//  Usage:
//    <PermissionRoute permission="manage_trash">
//      <RecentlyDeletedPage />
//    </PermissionRoute>
// ─────────────────────────────────────────────────────────
export function PermissionRoute({ permission, children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  if (!hasPermission(user, permission)) {
    return <Navigate to="/dashboard/unauthorized" replace />;
  }

  return children;
}

// ─────────────────────────────────────────────────────────
//  3. Convenience pre-configured guards
//     Use these instead of repeating allow arrays everywhere.
// ─────────────────────────────────────────────────────────

/** Only Super Admin can access this route. */
export function SuperAdminRoute({ children }) {
  return <RoleRoute allow={[ROLES.SUPER_ADMIN]}>{children}</RoleRoute>;
}

/** Super Admin + Admin can access this route. */
export function SuperAdminOrAdminRoute({ children }) {
  return <RoleRoute allow={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>{children}</RoleRoute>;
}

/** Only admin can access this route. */
export function AdminRoute({ children }) {
  return <RoleRoute allow={[ROLES.ADMIN, ROLES.SUPER_ADMIN]}>{children}</RoleRoute>;
}

/** Admin + Staff can access this route. */
export function AdminOrStaffRoute({ children }) {
  return <RoleRoute allow={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF]}>{children}</RoleRoute>;
}

/** Admin + Librarian can access this route (books catalog). */
export function CatalogRoute({ children }) {
  return <RoleRoute allow={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN]}>{children}</RoleRoute>;
}

/** Only students can access this route. */
export function StudentRoute({ children }) {
  return <RoleRoute allow={[ROLES.STUDENT]}>{children}</RoleRoute>;
}

/** Super Admin + Admin + Staff + Librarian — all authenticated non-student roles. */
export function AnyRoleRoute({ children }) {
  return (
    <RoleRoute allow={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF, ROLES.LIBRARIAN]}>
      {children}
    </RoleRoute>
  );
}

/** All roles including students. */
export function AllRolesRoute({ children }) {
  return (
    <RoleRoute allow={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.LIBRARIAN, ROLES.STAFF, ROLES.STUDENT]}>
      {children}
    </RoleRoute>
  );
}
