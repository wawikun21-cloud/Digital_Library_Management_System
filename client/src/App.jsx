// ─────────────────────────────────────────────────────────
//  App.jsx  —  Updated with full RBAC (admin / staff / librarian)
// ─────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import authApi from "./services/api/authApi";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { STORAGE_KEYS } from "./constants/index.js";
import { ROLES, ROLE_DEFAULT_ROUTES } from "./constants/roles.js";
import { useAuth } from "./hooks/useAuth.js";
import {
  ProtectedRoute,
  PermissionRoute,
  StudentRoute,
} from "./components/auth/ProtectedRoute.jsx";

// ── Lazy-loaded pages ─────────────────────────────────────
const Dashboard           = lazy(() => import("./pages/Dashboard"));
const Books               = lazy(() => import("./pages/Books"));
const Borrowed            = lazy(() => import("./pages/Borrowed"));
const Attendance          = lazy(() => import("./pages/Attendance"));
const Students            = lazy(() => import("./pages/Students"));
const Faculty             = lazy(() => import("./pages/Faculty"));
const RecentlyDeleted     = lazy(() => import("./features/trash/pages/RecentlyDeletedPage"));const ManageLexoraBooks   = lazy(() => import("./features/lexora-books/pages/ManageLexoraBooks"));
const LexoraBooksCatalog  = lazy(() => import("./features/lexora-books/pages/LexoraBooksCatalog"));
const LexoraBookDetails   = lazy(() => import("./features/lexora-books/pages/LexoraBookDetails"));
const LexoraBookReader    = lazy(() => import("./features/lexora-books/pages/LexoraBookReader"));
const LexoraBookmarks     = lazy(() => import("./features/lexora-books/pages/LexoraBookmarks"));
const Login               = lazy(() => import("./pages/Login"));
const LandingPage         = lazy(() => import("./landing/landingpage"));
const KioskAttendance     = lazy(() => import("./pages/KioskAttendance"));
const AuditLog            = lazy(() => import("./pages/AuditLog"));
const AttendanceDashboard = lazy(() => import("./pages/AttendanceDashboard"));
const BookDashboard       = lazy(() => import("./pages/BookDashboard"));
const Unauthorized        = lazy(() => import("./pages/Unauthorized"));
const StudentPortal       = lazy(() => import("./features/students/pages/StudentPortalPage"));
const Courses             = lazy(() => import("./features/courses/pages/CourseCatalog"));
const CourseLibrary       = lazy(() => import("./features/courses/pages/CourseLibrary"));
const CourseCreate        = lazy(() => import("./features/courses/pages/CourseCreatePage"));
const CourseDetails       = lazy(() => import("./features/courses/pages/CourseDetailsPage"));
const CourseLearnerView   = lazy(() => import("./features/courses/pages/CourseLearnerView"));
const CourseBuilder       = lazy(() => import("./features/courses/pages/CourseBuilderPage"));
const Users               = lazy(() => import("./features/users/pages/UsersPage"));
const Settings            = lazy(() => import("./features/settings/pages/SettingsPage"));
const Roles               = lazy(() => import("./features/roles/pages/RolesPage"));
const Tools               = lazy(() => import("./features/tools/pages/ToolsPage"));
const StudentTools        = lazy(() => import("./features/tools/pages/StudentToolsPage"));
const ToolDetails         = lazy(() => import("./features/tools/pages/ToolDetailsPage"));

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

function LexoraBooksShell() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Layout /> : <Outlet />;
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
          <Route element={<LexoraBooksShell />}>
            <Route path="lexora-books"           element={<Page><LexoraBooksCatalog /></Page>} />
            <Route path="lexora-books/bookmarks" element={<Page><LexoraBookmarks /></Page>} />
            <Route path="lexora-books/:bookId"   element={<Page><LexoraBookDetails /></Page>} />
          </Route>
          <Route path="lexora-books/:bookId/read" element={<Page><LexoraBookReader /></Page>} />

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
              element={<PermissionRoute permission="view_dashboard"><Page><Dashboard /></Page></PermissionRoute>}
            />

            {/* ── Catalog routes: admin + librarian ──────── */}
            <Route
              path="books"
              element={<PermissionRoute permission="manage_books"><Page><Books /></Page></PermissionRoute>}
            />
            <Route
              path="lexora-books"
              element={<PermissionRoute permission="manage_lexora_books"><Page><ManageLexoraBooks /></Page></PermissionRoute>}
            />
            <Route
              path="lexora-books/import"
              element={<PermissionRoute permission="manage_lexora_books"><Navigate to="/dashboard/lexora-books" replace /></PermissionRoute>}
            />
            <Route
              path="lexora-books/manage"
              element={<PermissionRoute permission="manage_lexora_books"><Page><ManageLexoraBooks /></Page></PermissionRoute>}
            />

            {/* ── Book Dashboard: admin only ──────────────── */}
            <Route
              path="books/dashboard"
              element={<PermissionRoute permission="view_dashboard"><Page><BookDashboard /></Page></PermissionRoute>}
            />

            {/* ── Admin-only pages ────────────────────────── */}
            <Route
              path="borrowed"
              element={<PermissionRoute permission="manage_transactions"><Page><Borrowed /></Page></PermissionRoute>}
            />
            <Route
              path="deleted"
              element={<PermissionRoute permission="manage_trash"><Page><RecentlyDeleted /></Page></PermissionRoute>}
            />
            <Route
              path="audit-log"
              element={<PermissionRoute permission="view_audit_logs"><Page><AuditLog /></Page></PermissionRoute>}
            />

            {/* ── Attendance dashboard: admin only ─────────── */}
            <Route
              path="attendance/dashboard"
              element={<PermissionRoute permission="view_dashboard"><Page><AttendanceDashboard /></Page></PermissionRoute>}
            />

            {/* ── Admin + Staff pages ──────────────────────── */}
            <Route
              path="attendance"
              element={<PermissionRoute permission="manage_attendance"><Page><Attendance /></Page></PermissionRoute>}
            />
            <Route
              path="attendance/kiosk"
              element={<PermissionRoute permission="use_kiosk"><Page><KioskAttendance /></Page></PermissionRoute>}
            />
            <Route
              path="students"
              element={<PermissionRoute permission="manage_students"><Page><Students /></Page></PermissionRoute>}
            />
            <Route
              path="faculty"
              element={<PermissionRoute permission="manage_faculty"><Page><Faculty /></Page></PermissionRoute>}
            />
            <Route
              path="courses"
              element={<PermissionRoute permission="manage_courses"><Page><Courses /></Page></PermissionRoute>}
            />
            <Route
              path="course-library"
              element={<PermissionRoute permission="view_course_library"><Page><CourseLibrary /></Page></PermissionRoute>}
            />
            <Route
              path="courses/create"
              element={<PermissionRoute permission="manage_courses"><Page><CourseCreate /></Page></PermissionRoute>}
            />
            <Route
              path="courses/:id"
              element={<PermissionRoute permission="view_course_library"><Page><CourseDetails /></Page></PermissionRoute>}
            />
            <Route
              path="courses/:id/learn"
              element={<PermissionRoute permission="view_course_library"><Page><CourseLearnerView /></Page></PermissionRoute>}
            />
            <Route
              path="courses/:id/learn/:lessonId"
              element={<PermissionRoute permission="view_course_library"><Page><CourseLearnerView /></Page></PermissionRoute>}
            />
            <Route
              path="courses/:id/builder"
              element={<PermissionRoute permission="manage_courses"><Page><CourseBuilder /></Page></PermissionRoute>}
            />

            {/* ── User Management: Super Admin + Admin ────── */}
            <Route
              path="users"
              element={<PermissionRoute permission="manage_users"><Page><Users /></Page></PermissionRoute>}
            />
            {/* ── Roles & Permissions: Super Admin only ────── */}
            <Route
              path="roles"
              element={<PermissionRoute permission="manage_permissions"><Page><Roles /></Page></PermissionRoute>}
            />
            {/* ── Settings (Student Portal management): Super Admin + Admin ── */}
            <Route
              path="settings"
              element={<PermissionRoute permission="manage_settings"><Page><Settings /></Page></PermissionRoute>}
            />
            <Route
              path="settings/student-portal"
              element={<PermissionRoute permission="manage_settings"><Page><Settings defaultTab="student-portal" /></Page></PermissionRoute>}
            />

            {/* ── Tools Management: Admin+ ────────────────── */}
            <Route
              path="tools"
              element={<PermissionRoute permission="manage_tools"><Page><Tools /></Page></PermissionRoute>}
            />

            {/* ── Tools catalog: students ─────────────────── */}
            <Route
              path="student-tools"
              element={<PermissionRoute permission="use_tools"><Page><StudentTools /></Page></PermissionRoute>}
            />
            <Route
              path="student-tools/:toolId"
              element={<PermissionRoute permission="use_tools"><Page><ToolDetails /></Page></PermissionRoute>}
            />
            {/* ── Student Portal: the student's landing route ──
                Kept role-gated on purpose: `view_dashboard` is granted only
                to admin roles, so a permission guard here would redirect
                students straight back to their own ROLE_DEFAULT_ROUTES
                target forever. The portal's content is gated per section
                inside the page (view_lexora_books / view_course_library). */}
            <Route
              path="student"
              element={<StudentRoute><Page><StudentPortal /></Page></StudentRoute>}
            />
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
