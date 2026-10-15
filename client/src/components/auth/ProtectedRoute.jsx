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
import { hasPermission, hasPermissionAction } from "../../utils/permissionUtils";

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
                if (data?.user) {
                    // Write to localStorage synchronously so child routes
                    // (LicenseRoute, PermissionRoute) read the fresh /me
                    // payload during their initial render. useLocalStorage's
                    // useEffect only persists AFTER commit, so without this
                    // direct write child routes would see the stale
                    // login-time value for one frame — enough for
                    // LicenseRoute to redirect on a feature_set mismatch.
                    localStorage.setItem(
                        STORAGE_KEYS.LEXORA_USER,
                        JSON.stringify(data.user)
                    );
                    setCachedUser(data.user);
                }
                setStatus("ok");
            })
            .catch(() => { /* unchanged */ });
        return () => { active = false; };
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
//  3. PermissionRoute
//     Checks a resolved permission (any action) instead of a role,
//     so a role whose grants were edited by a Super Admin still
//     follows the server's decision.
//
//     Optionally pass an `action` to require a specific sub-action
//     (e.g. "create" for management pages, "view" for read-only).
//     Without `action`, any granted action passes (backward compatible).
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
//
//    <PermissionRoute permission="manage_organization" action="create">
//      <DepartmentsPage />
//    </PermissionRoute>
//
//  When `action` is set, a user who holds the permission but only with
//  a narrower action subset (e.g. staff has manage_organization:view)
//  is redirected to /unauthorized instead of reaching the management UI.
export function PermissionRoute({ permission, action, children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  // No cached user at all → not authenticated (or the cache was just
  // wiped, e.g. after a logout whose server call failed). Send them to
  // login instead of blaming permissions — hasPermission(null) is false,
  // which would otherwise dead-end on /dashboard/unauthorized while the
  // session is still alive server-side. ProtectedRoute normally
  // refreshes the cache from /auth/me before children render, so this
  // only fires when the session/cache really is gone.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user, permission)) {
    return <Navigate to="/dashboard/unauthorized" replace />;
  }

  if (action && !hasPermissionAction(user, permission, action)) {
    return <Navigate to="/dashboard/unauthorized" replace />;
  }

  return children;
}

// ─────────────────────────────────────────────────────────
//  2b. LicenseRoute
//     Checks the logged-in user's school license (feature_set)
//     against the surface this route belongs to ('library' or
//     'lexora'). super_admin and legacy/anonymous callers carry
//     feature_set 'both', so this guard is a no-op for them —
//     only scoped schools are redirected.
//
//     On denial the user lands on /dashboard/unauthorized with a
//     license message, so the failure is explainable rather than
//     a silent redirect.
//
//  Usage:
//    <LicenseRoute featureSet="library">
//      <Books />
//    </LicenseRoute>
// ─────────────────────────────────────────────────────────
export function LicenseRoute({ featureSet, children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  // Missing user → ProtectedRoute upstream handles the redirect to /login.
  // Missing feature_set → legacy/anonymous → 'both' (no restriction).
  if (!user || !featureSet) return children;

  const license = user.feature_set || "both";
  const denied =
    (featureSet === "library" && license === "lexora") ||
    (featureSet === "lexora" && license === "library");

  if (denied) {
    return <Navigate to="/dashboard/unauthorized?reason=license" replace />;
  }

  return children;
}

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
