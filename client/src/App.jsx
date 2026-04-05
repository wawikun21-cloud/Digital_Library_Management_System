import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout          from "./components/layout/Layout";
import Dashboard       from "./pages/Dashboard";
import Books           from "./pages/Books";
import Borrowed        from "./pages/Borrowed";
import Attendance      from "./pages/Attendance";
import Students        from "./pages/Students";
import Faculty         from "./pages/Faculty";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import LexoraBooks     from "./pages/LexoraBooks";
import Login           from "./pages/Login";
import LandingPage     from "./landing/landingpage";
import authApi         from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";

// ── Apply theme to <html> immediately on first paint ──────────────────────────
// This runs before React hydrates, preventing a flash of wrong theme.
const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
if (savedTheme) {
  document.documentElement.setAttribute(
    "data-theme",
    JSON.parse(savedTheme) ? "dark" : "light"
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
  // ── Persistent theme: reads from localStorage on mount, saves on change ──
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  // ── Keep <html data-theme="..."> in sync whenever darkMode changes ────────
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleToggleTheme = () => setDarkMode(prev => !prev);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}