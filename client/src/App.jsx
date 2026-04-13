import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import authApi from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";

// ── Lazy-loaded pages — each becomes its own JS chunk ────────────────────────
// The xlsx library (≈500 KB) lives only in the Students / Faculty / Books
// import chunks, so it is never downloaded on the initial page load.
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

// ── Apply theme to <html> immediately on first paint ─────────────────────────
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
if (savedTheme) {
  document.documentElement.setAttribute(
    "data-theme",
    JSON.parse(savedTheme) ? "dark" : "light"
  );
}

// ── Minimal full-screen loader shown while lazy chunks download ──────────────
function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg-main, #fff)",
      }}
    />
  );
}

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    authApi.me()
      .then(() => setStatus("ok"))
      .catch(() => {
        sessionStorage.removeItem("lexora_user");
        localStorage.removeItem("lexora_user");
        setStatus("unauth");
      });
  }, []);

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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/"      element={<LandingRouteGuard />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout darkMode={darkMode} onToggleTheme={handleToggleTheme} />
              </ProtectedRoute>
            }
          >
            <Route index                 element={<Dashboard />}       />
            <Route path="books"          element={<Books />}           />
            <Route path="lexora-books"   element={<LexoraBooks />}     />
            <Route path="borrowed"       element={<Borrowed />}        />
            <Route path="attendance"     element={<Attendance />}      />
            <Route path="students"       element={<Students />}        />
            <Route path="faculty"        element={<Faculty />}         />
            <Route path="deleted"        element={<RecentlyDeleted />} />
          </Route>

          {/* Catch-all → landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}