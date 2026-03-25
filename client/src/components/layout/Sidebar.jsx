import { useState } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Trash2, Sun, Moon, X, ChevronDown, Globe } from "lucide-react";
import Logo from './Logo.jsx';

const SIDEBAR_WIDTHS = { COLLAPSED: 58, EXPANDED: 220 };
const BRAND_HEIGHT = 66;

const NAV = [
  { to: "/dashboard",              label: "Dashboard",       Icon: BarChart3     },
  { to: "/dashboard/books",        label: "Books",           Icon: BookOpen      },
  { to: "/dashboard/lexora-books", label: "Lexora Books",    Icon: Globe         },
  { to: "/dashboard/borrowed",     label: "Borrowed",        Icon: ClipboardList },
  { to: "/dashboard/deleted",      label: "Recently Deleted",Icon: Trash2        },
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
      {/* ── Desktop sidebar ── */}
      <aside
        className="sidebar-hover-expand fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col overflow-hidden transition-all duration-300"
        style={{ width: desktopWidth, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-sidebar)" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main navigation"
        role="navigation"
        aria-expanded={!effectiveCollapsed}
      >
        <Inner collapsed={effectiveCollapsed} sidebarWidth={desktopWidth} darkMode={darkMode} onToggleTheme={onToggleTheme} />
      </aside>

      {/* ── Mobile drawer ── */}
      <aside
        className={[
          "fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden lg:hidden",
          "transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        style={{ width: 240, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-sidebar)" }}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-on-sidebar)" }}
          aria-label="Close menu"
        >
          <X size={16} />
        </button>
        <Inner collapsed={false} sidebarWidth={240} darkMode={darkMode} onToggleTheme={onToggleTheme} />
      </aside>
    </>
  );
}

/* ── Shared inner content ────────────────────────── */
function Inner({ collapsed, sidebarWidth, darkMode, onToggleTheme }) {
  const variant = collapsed ? 'collapsed' : 'expanded';

  return (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div
        className="flex items-center shrink-0 overflow-hidden border-b border-[var(--border-sidebar)]"
        style={{ minHeight: BRAND_HEIGHT, width: sidebarWidth, padding: "10px 12px", transition: "width 300ms ease" }}
      >
        <Logo variant={variant} />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-4 overflow-y-auto overflow-x-hidden">
        {NAV.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2 p-2 shrink-0" style={{ borderTop: "1px solid var(--border-sidebar)" }}>
        <button
          onClick={onToggleTheme}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={["flex items-center gap-2.5 w-full rounded-lg transition-colors duration-150",
            collapsed ? "justify-center py-2 px-0" : "px-2.5 py-2"].join(" ")}
          style={{ background: "rgba(255,255,255,0.04)" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(238,162,58,0.1)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
        >
          <span className="t-track">
            <span className={`t-thumb ${darkMode ? "t-thumb-on" : ""}`} />
            <span className="t-icon t-sun"><Sun size={10} /></span>
            <span className="t-icon t-moon"><Moon size={10} /></span>
          </span>
          {!collapsed && (
            <span className="text-[12.5px] font-semibold whitespace-nowrap" style={{ color: "var(--text-on-sidebar)" }}>
              {darkMode ? "Dark Mode" : "Light Mode"}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Plain nav link ──────────────────────────────── */
function NavItem({ item, collapsed }) {
  const { to, label, Icon } = item;
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      title={collapsed ? label : undefined}
      className={({ isActive }) => [
        "flex items-center rounded-lg text-sm font-medium",
        "overflow-hidden whitespace-nowrap select-none transition-colors duration-150 px-3 py-2.5",
        isActive ? "text-white" : "hover:text-amber-400",
      ].join(" ")}
      style={({ isActive }) => ({
        color:      isActive ? "#fff" : "var(--text-on-sidebar)",
        background: isActive ? "rgba(238,162,58,0.18)" : "transparent",
      })}
    >
      {({ isActive }) => (
        <>
          <span className="shrink-0 flex items-center justify-center" style={{ width: 18, minWidth: 18 }}>
            <Icon size={18} style={{ color: isActive ? "#F3B940" : undefined }} />
          </span>
          {!collapsed && <span className="ml-3 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

/* ── Books row + collapsible submenu ─────────────── */
function BooksMenu({ item, collapsed, open, onToggle }) {
  const { to, label, Icon, children } = item;
  const location       = useLocation();
  const anyChildActive = children.some(c => location.pathname.startsWith(c.to));
  const isSelfActive   = location.pathname === to;
  const isHighlighted  = isSelfActive || anyChildActive;

  return (
    <div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{
          background: isHighlighted ? "rgba(238,162,58,0.18)" : "transparent",
          transition: "background 150ms",
        }}
      >
        <NavLink
          to={to}
          end
          title={collapsed ? label : undefined}
          onClick={() => { if (!collapsed && !open) onToggle(); }}
          className={[
            "flex items-center flex-1 text-sm font-medium",
            "overflow-hidden whitespace-nowrap select-none transition-colors duration-150",
            "px-3 py-2.5",
            isHighlighted ? "text-white" : "hover:text-amber-400",
          ].join(" ")}
          style={{
            color: isHighlighted ? "#fff" : "var(--text-on-sidebar)",
            background: "transparent",
          }}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: 18, minWidth: 18 }}>
            <Icon size={18} style={{ color: isHighlighted ? "#F3B940" : undefined }} />
          </span>
          {!collapsed && <span className="ml-3 truncate">{label}</span>}
        </NavLink>

        {!collapsed && (
          <button
            onClick={onToggle}
            aria-label="Toggle Records submenu"
            className="shrink-0 flex items-center justify-center rounded-md transition-colors duration-150 hover:bg-white/10"
            style={{ width: 28, height: 28, marginRight: 4, color: "var(--text-on-sidebar)" }}
          >
            <ChevronDown
              size={13}
              style={{
                opacity: 0.7,
                transition: "transform 250ms ease",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={{ overflow: "hidden", maxHeight: open ? 120 : 0, transition: "max-height 280ms ease" }}>
          {children.map(({ to: cTo, label: cLabel, Icon: CIcon }) => (
            <NavLink
              key={cTo}
              to={cTo}
              className={({ isActive }) => [
                "flex items-center rounded-lg text-[12.5px] font-medium",
                "overflow-hidden whitespace-nowrap select-none transition-colors duration-150 py-2",
                isActive ? "text-white" : "hover:text-amber-400",
              ].join(" ")}
              style={({ isActive }) => ({
                paddingLeft: 44,
                paddingRight: 12,
                color:      isActive ? "#fff" : "var(--text-on-sidebar)",
                background: isActive ? "rgba(238,162,58,0.15)" : "transparent",
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="shrink-0 mr-2 flex items-center justify-center" style={{ width: 14, minWidth: 14 }}>
                    <CIcon size={13} style={{ color: isActive ? "#F3B940" : undefined, opacity: isActive ? 1 : 0.7 }} />
                  </span>
                  <span className="truncate">{cLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}