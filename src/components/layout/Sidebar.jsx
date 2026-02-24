import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Sun, Moon, X } from "lucide-react";

const NAV = [
  { to: "/",         label: "Dashboard", Icon: BarChart3     },
  { to: "/books",    label: "Books",     Icon: BookOpen      },
  { to: "/borrowed", label: "Borrowed",  Icon: ClipboardList },
];

/* ─────────────────────────────────────────────────── */
export default function Sidebar({
  collapsed, darkMode, onToggleTheme, mobileOpen, onMobileClose,
}) {
  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside
        className="sidebar-w-transition fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col overflow-hidden"
        style={{
          width:        collapsed ? 58 : 220,
          background:   "var(--bg-sidebar)",
          borderRight:  "1px solid var(--border-sidebar)",
        }}
      >
        <Inner collapsed={collapsed} darkMode={darkMode} onToggleTheme={onToggleTheme} />
      </aside>

      {/* ── Mobile drawer (slides in < lg) ── */}
      <aside
        className={[
          "fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden lg:hidden",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{
          width:       240,
          background:  "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-sidebar)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg"
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
  return (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div
        className="flex items-center shrink-0 overflow-hidden"
        style={{
          minHeight:    66,
          padding:      collapsed ? "10px 0" : "10px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--border-sidebar)",
          transition:   "padding 0.25s",
        }}
      >
        {collapsed
          ? <img src="/icon.png"         alt="Lexora"      className="w-9 h-9 object-contain rounded-md shrink-0" />
          : <img src="/sidebar-logo.png" alt="Lexora logo" className="h-11 max-w-[176px] w-full object-contain object-left" />
        }
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