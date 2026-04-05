import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar  from "./Topbar";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { STORAGE_KEYS } from "../../constants/index.js";

const W_EXPANDED  = 220;
const W_COLLAPSED = 58;

export default function Layout() {
  const [collapsed,  setCollapsed]  = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ FIX: replaced useState(false) with useLocalStorage so the chosen
  //    theme survives page refreshes, tab closes, and logouts.
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  /* Apply data-theme to <html> so CSS vars + Tailwind dark-mode both work */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  /* Close mobile drawer on resize to desktop */
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMobileOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const sidebarW = collapsed ? W_COLLAPSED : W_EXPANDED;

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--bg-page)", color: "var(--text-primary)" }}
    >
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={collapsed}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(d => !d)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* ── Main body ── */}
      <div
        className="flex flex-1 flex-col min-h-screen ml-transition"
        style={{
          marginLeft: "0px",
          background: "var(--bg-page)",
        }}
        ref={el => {
          if (!el) return;
          const apply = () => {
            if (window.innerWidth >= 1024) {
              el.style.marginLeft = sidebarW + "px";
            } else {
              el.style.marginLeft = "0px";
            }
          };
          apply();
          window.addEventListener("resize", apply);
          el._cleanup = () => window.removeEventListener("resize", apply);
        }}
      >
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          onMobileToggle={() => setMobileOpen(o => !o)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}