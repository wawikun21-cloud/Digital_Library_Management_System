import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import authApi from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";

// ── Lazy-loaded pages — each becomes its own JS chunk ────────────────────────
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

// ── Apply theme to <html> immediately on first paint ─────────────────────────
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
if (savedTheme) {
  document.documentElement.setAttribute(
    "data-theme",
    JSON.parse(savedTheme) ? "dark" : "light"
  );
}

// ── Spinner shown inside the content area while a lazy chunk loads ────────────
// This intentionally does NOT fill the whole screen so the sidebar/topbar
// remain visible and it never looks like a full page reload.
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: "60vh",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid var(--border-color, #e5e7eb)",
          borderTop: "3px solid var(--primary, #6366f1)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Full-screen loader ONLY for top-level public routes (Login / Landing) ────
function FullPageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-main, #fff)",
      }}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          border: "3px solid var(--border-color, #e5e7eb)",
          borderTop: "3px solid var(--primary, #6366f1)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Wraps every dashboard child route so Layout stays mounted ─────────────────
function Page({ children }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);

  useEffect(() => {
    if (user) {
      setStatus("ok");
      authApi.me().catch(() => {
        localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
        sessionStorage.removeItem("lexora_user");
        setStatus("unauth");
      });
      return;
    }
    authApi.me()
      .then(() => setStatus("ok"))
      .catch(() => {
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem(STORAGE_KEYS.LEXORA_USER);
        setStatus("unauth");
      });
  }, [user]);

  if (status === "checking") return null;
  if (status === "unauth")   return <Navigate to="/login" replace />;
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
  return <LandingPage />;
}

export default function App() {
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode(prev => !prev);

  return (
    <BrowserRouter>
      {/*
        Top-level Suspense: only kicks in for the public routes (Login, Landing).
        Dashboard child routes use their own <Page> wrapper below so that
        the Layout (sidebar + topbar) is NEVER unmounted during navigation.
      */}
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
            <Route index                   element={<Page><Dashboard /></Page>}       />
            <Route path="books"            element={<Page><Books /></Page>}           />
            <Route path="lexora-books"     element={<Page><LexoraBooks /></Page>}     />
            <Route path="borrowed"         element={<Page><Borrowed /></Page>}        />
            <Route path="attendance"       element={<Page><Attendance /></Page>}      />
            <Route path="students"         element={<Page><Students /></Page>}        />
            <Route path="faculty"          element={<Page><Faculty /></Page>}         />
            <Route path="attendance/kiosk" element={<Page><KioskAttendance /></Page>} />
            <Route path="deleted"          element={<Page><RecentlyDeleted /></Page>} />
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}