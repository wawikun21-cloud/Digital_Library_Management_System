import { useState } from 'react';
import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Trash2, Sun, Moon, X } from "lucide-react";
import Logo from './Logo.jsx';

const SIDEBAR_WIDTHS = { COLLAPSED: 58, EXPANDED: 220 };
const BRAND_HEIGHT = 66;

const NAV = [
  { to: "/",         label: "Dashboard", Icon: BarChart3     },
  { to: "/books",    label: "Books",     Icon: BookOpen      },
  { to: "/borrowed", label: "Borrowed",  Icon: ClipboardList },
  { to: "/deleted",  label: "Recently Deleted", Icon: Trash2  },
];

/* ─────────────────────────────────────────────────── */
export default function Sidebar({
  collapsed, darkMode, onToggleTheme, mobileOpen, onMobileClose,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const effectiveCollapsed = collapsed && !isHovered;
  const desktopWidth = effectiveCollapsed ? SIDEBAR_WIDTHS.COLLAPSED : SIDEBAR_WIDTHS.EXPANDED;

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside
        className="sidebar-hover-expand fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: desktopWidth,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main navigation"
        role="navigation"
        aria-expanded={!effectiveCollapsed}
      >
        <Inner collapsed={effectiveCollapsed} darkMode={darkMode} onToggleTheme={onToggleTheme} />
      </aside>

      {/* ── Mobile drawer (slides in < lg) ── */}
      <aside
        className={[
          "fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden lg:hidden",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{
          width: 240,
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-on-sidebar)" }}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>

        {/* Always expanded in mobile drawer */}
        <Inner collapsed={false} darkMode={darkMode} onToggleTheme={onToggleTheme} />
      </aside>
    </>
  );
}

/* ── Shared sidebar content ─────────────────────── */
function Inner({ collapsed, darkMode, onToggleTheme }) {
  const variant = collapsed ? 'collapsed' : 'expanded';

  return (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div
        className="flex items-center shrink-0 overflow-hidden border-b border-[var(--border-sidebar)] transition-padding"
        style={{
          minHeight: BRAND_HEIGHT,
          padding: collapsed ? "10px 0" : "10px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <Logo variant={variant} />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-4 overflow-y-auto overflow-x-hidden">
        {!collapsed && (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 mb-3 whitespace-nowrap select-none"
            style={{ color: "var(--text-muted)" }}
          >
            Main Menu
          </p>
        )}

        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed ? label : undefined}
            className={({ isActive }) => [
              "flex items-center gap-3 rounded-lg text-sm font-medium",
              "overflow-hidden whitespace-nowrap select-none",
              "transition-colors duration-150",
              collapsed ? "justify-center py-2.5 px-0" : "px-3 py-2.5",
              isActive
                ? "text-white"
                : "hover:text-amber-400",
            ].join(" ")}
            style={({ isActive }) => ({
              color:      isActive ? "#fff" : "var(--text-on-sidebar)",
              background: isActive ? "rgba(238,162,58,0.18)" : "transparent",
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className="shrink-0"
                  style={{ color: isActive ? "#F3B940" : undefined }}
                />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer — theme toggle + version */}
      <div
        className="flex flex-col gap-2 p-2 shrink-0"
        style={{ borderTop: "1px solid var(--border-sidebar)" }}
      >
        {/* Toggle button */}
        <button
          onClick={onToggleTheme}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={[
            "flex items-center gap-2.5 w-full rounded-lg transition-colors duration-150",
            collapsed ? "justify-center py-2 px-0" : "px-2.5 py-2",
          ].join(" ")}
          style={{ background: "rgba(255,255,255,0.04)" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(238,162,58,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
        >
          {/* Toggle pill */}
          <span className="t-track">
            <span className={`t-thumb ${darkMode ? "t-thumb-on" : ""}`} />
            <span className="t-icon t-sun"><Sun  size={10} /></span>
            <span className="t-icon t-moon"><Moon size={10} /></span>
          </span>

          {!collapsed && (
            <span
              className="text-[12.5px] font-semibold whitespace-nowrap"
              style={{ color: "var(--text-on-sidebar)" }}
            >
              {darkMode ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </button>

        {!collapsed && (
          <span
            className="text-[11px] px-1 whitespace-nowrap select-none"
            style={{ color: "var(--text-muted)" }}
          >
            v1.0.0
          </span>
        )}
      </div>
    </div>
  );
}