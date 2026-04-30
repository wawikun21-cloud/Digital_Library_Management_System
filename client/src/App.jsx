// ─────────────────────────────────────────────────────────
//  App.jsx  —  Updated with full RBAC (admin / staff / librarian)
// ─────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import authApi from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";
import { ROLES, ROLE_DEFAULT_ROUTES } from "./constants/roles.js";
import {
  ProtectedRoute,
  AdminRoute,
  AdminOrStaffRoute,
  CatalogRoute,
} from "./components/auth/ProtectedRoute.jsx";

// ── Lazy-loaded pages ─────────────────────────────────────
const Dashboard           = lazy(() => import("./pages/Dashboard"));
const Books               = lazy(() => import("./pages/Books"));
const Borrowed            = lazy(() => import("./pages/Borrowed"));
const Attendance          = lazy(() => import("./pages/Attendance"));
const Students            = lazy(() => import("./pages/Students"));
const Faculty             = lazy(() => import("./pages/Faculty"));
const RecentlyDeleted     = lazy(() => import("./pages/RecentlyDeleted"));
const LexoraBooks         = lazy(() => import("./pages/LexoraBooks"));
const Login               = lazy(() => import("./pages/Login"));
const LandingPage         = lazy(() => import("./landing/landingpage"));
const KioskAttendance     = lazy(() => import("./pages/KioskAttendance"));
const AuditLog            = lazy(() => import("./pages/AuditLog"));
const AttendanceDashboard = lazy(() => import("./pages/AttendanceDashboard"));
const BookDashboard       = lazy(() => import("./pages/BookDashboard"));
const Unauthorized        = lazy(() => import("./pages/Unauthorized"));

// ── Apply saved theme on first paint ─────────────────────
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
if (savedTheme) {
  document.documentElement.setAttribute(
    "data-theme",
    JSON.parse(savedTheme) ? "dark" : "light"
  );
}

// ── Loaders ───────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", minHeight: "60vh", background: "transparent"
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

function Page({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

// ── LandingRouteGuard ─────────────────────────────────────
//  Redirects authenticated users to their role-appropriate dashboard.
function LandingRouteGuard() {
  const [status, setStatus] = useState("checking");
  const [user]              = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  useEffect(() => {
    authApi.me()
      .then(() => setStatus("authed"))
      .catch(() => setStatus("unauth"));
  }, []);

  if (status === "checking") return null;

  if (status === "authed") {
    const role     = user?.role ?? ROLES.ADMIN;
    const fallback = ROLE_DEFAULT_ROUTES[role] ?? "/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return (
    <Suspense fallback={<FullPageLoader />}>
      <LandingPage />
    </Suspense>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode(prev => !prev);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>

          {/* ── Public ──────────────────────────────────── */}
          <Route path="/"      element={<LandingRouteGuard />} />
          <Route path="/login" element={<Login />} />

          {/* ── Protected shell ─────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} onToggleTheme={handleToggleTheme} />
              </ProtectedRoute>
            }
          >
            {/* ── Index: admin → Dashboard, librarian → /books, staff → /attendance */}
            <Route
              index
              element={<AdminRoute><Page><Dashboard /></Page></AdminRoute>}
            />

            {/* ── Catalog routes: admin + librarian ──────── */}
            <Route
              path="books"
              element={<CatalogRoute><Page><Books /></Page></CatalogRoute>}
            />
            <Route
              path="lexora-books"
              element={<CatalogRoute><Page><LexoraBooks /></Page></CatalogRoute>}
            />

            {/* ── Book Dashboard: admin only ──────────────── */}
            <Route
              path="books/dashboard"
              element={<AdminRoute><Page><BookDashboard /></Page></AdminRoute>}
            />

            {/* ── Admin-only pages ────────────────────────── */}
            <Route
              path="borrowed"
              element={<AdminRoute><Page><Borrowed /></Page></AdminRoute>}
            />
            <Route
              path="deleted"
              element={<AdminRoute><Page><RecentlyDeleted /></Page></AdminRoute>}
            />
            <Route
              path="audit-log"
              element={<AdminRoute><Page><AuditLog /></Page></AdminRoute>}
            />

            {/* ── Attendance dashboard: admin only ─────────── */}
            <Route
              path="attendance/dashboard"
              element={<AdminRoute><Page><AttendanceDashboard /></Page></AdminRoute>}
            />

            {/* ── Admin + Staff pages ──────────────────────── */}
            <Route
              path="attendance"
              element={<AdminOrStaffRoute><Page><Attendance /></Page></AdminOrStaffRoute>}
            />
            <Route
              path="attendance/kiosk"
              element={<AdminOrStaffRoute><Page><KioskAttendance /></Page></AdminOrStaffRoute>}
            />
            <Route
              path="students"
              element={<AdminOrStaffRoute><Page><Students /></Page></AdminOrStaffRoute>}
            />
            <Route
              path="faculty"
              element={<AdminOrStaffRoute><Page><Faculty /></Page></AdminOrStaffRoute>}
            />

            {/* ── Unauthorized fallback inside layout ──────── */}
            <Route
              path="unauthorized"
              element={<Page><Unauthorized /></Page>}
            />

          </Route>

          {/* ── Catch-all ────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
