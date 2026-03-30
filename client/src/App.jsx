import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout         from "./components/layout/Layout";
import Dashboard      from "./pages/Dashboard";
import Books          from "./pages/Books";
import Borrowed       from "./pages/Borrowed";
import Attendance     from "./pages/Attendance";
import Students       from "./pages/Students";
import Faculty        from "./pages/Faculty";
import RecentlyDeleted from "./pages/RecentlyDeleted";
import LexoraBooks     from "./pages/LexoraBooks";
import Login           from "./pages/Login";
import LandingPage     from "./landing/landingpage";
import authApi         from "./services/api/authApi";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    authApi.me()
      .then(() => {
        setStatus("ok");
      })
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
      .then(() => {
        setStatus("authed");
      })
      .catch(() => {
        setStatus("unauth");
      });
  }, []);

  if (status === "checking") return null;
  if (status === "authed") return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
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
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index                  element={<Dashboard />}       />
          <Route path="books"           element={<Books />}           />
          <Route path="lexora-books"    element={<LexoraBooks />}     />
          <Route path="borrowed"        element={<Borrowed />}        />
          <Route path="attendance"      element={<Attendance />}      />
          <Route path="students"        element={<Students />}        />
          <Route path="faculty"         element={<Faculty />}         />
          <Route path="deleted"         element={<RecentlyDeleted />} />
        </Route>

        {/* Catch-all → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}