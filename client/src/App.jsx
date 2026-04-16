import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import authApi from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Dashboard       = lazy(() => import("./pages/Dashboard"));
const Books           = lazy(() => import("./pages/Books"));
const Borrowed        = lazy(() => import("./pages/Borrowed"));
const Attendance      = lazy(() => import("./pages/Attendance"));
const Students        = lazy(() => import("./pages/Students"));
const Faculty         = lazy(() => import("./pages/Faculty"));
const RecentlyDeleted = lazy(() => import("./pages/RecentlyDeleted"));
const LexoraBooks     = lazy(() => import("./pages/LexoraBooks"));
const Login           = lazy(() => import("./pages/Login"));
const LandingPage     = lazy(() => import("./landing/landingpage"));
const KioskAttendance = lazy(() => import("./pages/KioskAttendance"));

// ── Pages each role may access ────────────────────────────────────────────────
export const STAFF_ALLOWED_PATHS = [
  "/dashboard/attendance",
  "/dashboard/students",
  "/dashboard/faculty",
  "/dashboard/attendance/kiosk",
];

// ── Apply saved theme immediately on first paint ──────────────────────────────
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
if (savedTheme) {
  document.documentElement.setAttribute(
    "data-theme",
    JSON.parse(savedTheme) ? "dark" : "light"
  );
}

// ── Loaders ───────────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"100%", minHeight:"60vh", background:"transparent" }}>
      <div style={{ width:"32px", height:"32px",
                    border:"3px solid var(--border-color,#e5e7eb)",
                    borderTop:"3px solid var(--primary,#6366f1)",
                    borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FullPageLoader() {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
                  height:"100vh", background:"var(--bg-main,#fff)" }}>
      <div style={{ width:"32px", height:"32px",
                    border:"3px solid var(--border-color,#e5e7eb)",
                    borderTop:"3px solid var(--primary,#6366f1)",
                    borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Page({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── ProtectedRoute — verifies session and exposes user role ───────────────────
function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  useEffect(() => {
    // FIX: single authApi.me() call regardless of cached user.
    // We still verify the session is alive on the server every time.
    authApi.me()
      .then(() => setStatus("ok"))
      .catch(() => {
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
        setStatus("unauth");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "checking") return <FullPageLoader />;
  if (status === "unauth")   return <Navigate to="/login" replace />;
  return children;
}

/**
 * AdminOnlyRoute
 * - Reads role from localStorage.
 * - Staff → redirect to /dashboard/attendance.
 * - Admin → render children.
 * FIX: never returns null/nothing; always resolves to a redirect or children.
 */
function AdminOnlyRoute({ children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  // If the user object is missing entirely, ProtectedRoute already handled it.
  // Treat missing role as "admin" to avoid blocking legitimate admins whose
  // session was created before the role field was added.
  const role = user?.role ?? "admin";

  if (role === "staff") {
    return <Navigate to="/dashboard/attendance" replace />;
  }

  return children;
}

/**
 * StaffBlockedRoute
 * Wraps routes that staff must NOT access.
 * Redirects staff to /dashboard/attendance; lets admin through.
 */
function StaffBlockedRoute({ children }) {
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const role = user?.role ?? "admin";

  if (role === "staff") {
    return <Navigate to="/dashboard/attendance" replace />;
  }

  return children;
}

function LandingRouteGuard() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    authApi.me()
      .then(() => setStatus("authed"))
      .catch(() => setStatus("unauth"));
  }, []);

  if (status === "checking") return null;
  if (status === "authed")   return <Navigate to="/dashboard" replace />;
  return (
    <Suspense fallback={<FullPageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode(prev => !prev);

  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"      element={<LandingRouteGuard />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes — Layout stays mounted; only outlet swaps */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} onToggleTheme={handleToggleTheme} />
              </ProtectedRoute>
            }
          >
            {/*
              Dashboard index:
              - Admin → Dashboard page
              - Staff → redirect to /dashboard/attendance
              AdminOnlyRoute now always resolves (no null return).
            */}
            <Route
              index
              element={
                <AdminOnlyRoute>
                  <Page><Dashboard /></Page>
                </AdminOnlyRoute>
              }
            />

            {/* ── Admin-only pages — StaffBlockedRoute prevents direct URL access ── */}
            <Route path="books"
              element={<StaffBlockedRoute><Page><Books /></Page></StaffBlockedRoute>}
            />
            <Route path="lexora-books"
              element={<StaffBlockedRoute><Page><LexoraBooks /></Page></StaffBlockedRoute>}
            />
            <Route path="borrowed"
              element={<StaffBlockedRoute><Page><Borrowed /></Page></StaffBlockedRoute>}
            />
            <Route path="deleted"
              element={<StaffBlockedRoute><Page><RecentlyDeleted /></Page></StaffBlockedRoute>}
            />

            {/* ── Shared pages (admin + staff) ── */}
            <Route path="attendance"       element={<Page><Attendance /></Page>} />
            <Route path="students"         element={<Page><Students /></Page>} />
            <Route path="faculty"          element={<Page><Faculty /></Page>} />
            <Route path="attendance/kiosk" element={<Page><KioskAttendance /></Page>} />
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}