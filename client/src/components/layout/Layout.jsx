import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar  from "./Topbar";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../constants/index.js";
import MustChangePasswordPrompt from "../../features/auth/components/MustChangePasswordPrompt";

// Rail geometry — keep in sync with SIDEBAR_WIDTHS in Sidebar.jsx and the
// `.rail` offsets in styles/shell.css (16px frame gap on every side).
const RAIL_W_EXPANDED  = 252;
const RAIL_W_COLLAPSED = 72;
const FRAME_GAP        = 16;   // gap between the rail and the body card
const DESKTOP_QUERY    = "(min-width: 1024px)";

/** Tracks the lg breakpoint so the card margin follows the sidebar. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}

export default function Layout() {
  const [collapsed,  setCollapsed]  = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode]     = useLocalStorage(STORAGE_KEYS.THEME, false);
  const isDesktop = useIsDesktop();

  // ── Read user role from localStorage ─────────────────────────────────────
  const [user] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  const role = user?.role ?? "admin"; // fallback to "admin" for safety

  // First-login password prompt (students created with default
  // credentials). The hook clears the cached flag on success; this
  // local state hides the prompt without waiting for a refetch.
  const [passwordChanged, setPasswordChanged] = useState(false);
  const showPasswordPrompt = Boolean(user?.must_change_password) && !passwordChanged;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Leaving the mobile breakpoint closes the drawer.
  useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  // Body card sits to the right of the floating rail on desktop.
  // The rail overlays the card when it expands on hover, so the card only
  // reserves room for the collapsed (or pinned-open) width.
  // (The shell's own 16px padding already covers the frame ↔ rail gap.)
  const railW      = collapsed ? RAIL_W_COLLAPSED : RAIL_W_EXPANDED;
  const cardMargin = isDesktop ? railW + FRAME_GAP : 0;

  return (
    <div className="app-shell">
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Floating rail sidebar — receives role to filter nav items ── */}
      <Sidebar
        collapsed={collapsed}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(d => !d)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        userRole={role}
      />

      {/* ── Body: one big rounded card ── */}
      <div className="app-card" style={{ marginLeft: cardMargin }}>
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onMobileToggle={() => setMobileOpen(o => !o)}
        />
        <main className="app-card-main">
          <Outlet />
        </main>
      </div>

      {showPasswordPrompt && (
        <MustChangePasswordPrompt
          user={user}
          onDismiss={() => setPasswordChanged(true)}
        />
      )}
    </div>
  );
}
