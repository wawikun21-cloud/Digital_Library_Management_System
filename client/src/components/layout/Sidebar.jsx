import { ShieldCheck } from "lucide-react";
import { useState } from 'react';
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Trash2, Sun, Moon, X, ChevronDown, Library, Users, User, Globe, UserCheck } from "lucide-react";
import Logo from './Logo.jsx';
import { STORAGE_KEYS } from "../../constants/index.js";

const SIDEBAR_WIDTHS = { COLLAPSED: 58, EXPANDED: 220 };
const BRAND_HEIGHT = 66;

// roles: ["admin"]  → admin only
// no roles key      → visible to everyone (admin + staff)
const NAV_ITEMS = [
  { to: "/dashboard",              label: "Dashboard",        Icon: BarChart3,     roles: ["admin"] },
  { to: "/dashboard/books",        label: "Books",            Icon: BookOpen,      roles: ["admin"] },
  { to: "/dashboard/lexora-books", label: "Lexora Books",     Icon: Globe,         roles: ["admin"] },
  { to: "/dashboard/borrowed",     label: "Borrowed",         Icon: ClipboardList, roles: ["admin"] },
  {
    label: "Attendance",
    to: "/dashboard/attendance",
    Icon: Users,
    isGroup: true,
    // no roles = visible to admin + staff
    children: [
      { to: "/dashboard/students",         label: "Students",         Icon: User      },
      { to: "/dashboard/faculty",          label: "Faculty",          Icon: UserCheck },
      { to: "/dashboard/attendance/kiosk", label: "Kiosk Attendance", Icon: UserCheck },
    ],
  },
  { to: "/dashboard/deleted",    label: "Recently Deleted", Icon: Trash2,      roles: ["admin"] },
  { to: "/dashboard/audit-log", label: "Audit Trail",      Icon: ShieldCheck, roles: ["admin"] },
];

/* ─────────────────────────────────────────────────── */
export default function Sidebar({
  collapsed, darkMode, onToggleTheme, mobileOpen, onMobileClose,
  userRole,  // renamed from "role" — avoids collision with the HTML `role` attribute on <aside>
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
        <Inner collapsed={effectiveCollapsed} sidebarWidth={desktopWidth} darkMode={darkMode} onToggleTheme={onToggleTheme} userRole={userRole} />
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
        <Inner collapsed={false} sidebarWidth={240} darkMode={darkMode} onToggleTheme={onToggleTheme} userRole={userRole} />
      </aside>
    </>
  );
}

/* ── Shared inner content ────────────────────────── */

/**
 * Reads the user role directly from localStorage (synchronous, no hook delay).
 * Returns the role string (e.g. "admin" | "staff") or null if not found.
 * Never falls back to "admin" — unknown role = least-privileged view.
 */
function getRoleFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role ?? null;
  } catch {
    return null;
  }
}

function Inner({ collapsed, sidebarWidth, darkMode, onToggleTheme, userRole }) {
  const location = useLocation();
  const variant  = collapsed ? 'collapsed' : 'expanded';

  // getRoleFromStorage is synchronous — no React hook timing gap.
  // userRole prop is the secondary fallback (passed down from Layout).
  // If both are missing, role stays null → staff-safe: hides all restricted items.
  const role = getRoleFromStorage(STORAGE_KEYS.LEXORA_USER) ?? userRole ?? null;

  // Filter nav items the current role may see:
  //   • no `roles` key  → visible to everyone
  //   • has `roles` key → role must be listed; null role never matches
  const visibleItems = NAV_ITEMS.filter(item =>
    !item.roles || (role !== null && item.roles.includes(role))
  );

  // Auto-open Attendance group if a child is active
  const attendanceGroup       = NAV_ITEMS.find(i => i.isGroup);
  const attendanceChildActive = attendanceGroup?.children.some(c => location.pathname.startsWith(c.to));
  const [attendanceOpen, setAttendanceOpen] = useState(attendanceChildActive || false);

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
        {visibleItems.map((item) =>
          item.isGroup ? (
            <StudentsMenu
              key={item.label}
              item={item}
              collapsed={collapsed}
              open={attendanceOpen}
              onToggle={() => setAttendanceOpen(o => !o)}
            />
          ) : (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          )
        )}
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
            <Icon size={18} style={{ color: isActive ? "#f0d807" : undefined }} />
          </span>
          {!collapsed && <span className="ml-3 truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}

/* ── Attendance group: header = NavLink, chevron = toggle ── */
function StudentsMenu({ item, collapsed, open, onToggle }) {
  const { label, to, Icon, children } = item;
  const location       = useLocation();
  const anyChildActive = children.some(c => location.pathname.startsWith(c.to));
  const isSelfActive   = location.pathname === to;
  const isHighlighted  = isSelfActive || anyChildActive;

  return (
    <div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: isHighlighted ? "rgba(238,162,58,0.18)" : "transparent" }}
      >
        {/* ── Clickable label → navigates to /dashboard/attendance ── */}
        <NavLink
          to={to}
          end
          title={collapsed ? label : undefined}
          className="flex items-center flex-1 px-3 py-2.5 text-sm font-medium overflow-hidden whitespace-nowrap select-none transition-colors duration-150"
          style={({ isActive }) => ({
            color:      isActive || anyChildActive ? "#fff" : "var(--text-on-sidebar)",
            background: "transparent",
          })}
        >
          {({ isActive }) => (
            <>
              <span className="shrink-0 flex items-center justify-center" style={{ width: 18, minWidth: 18 }}>
                <Icon size={18} style={{ color: isActive || anyChildActive ? "#f0d807" : undefined }} />
              </span>
              {!collapsed && <span className="ml-3 truncate">{label}</span>}
            </>
          )}
        </NavLink>

        {/* ── Chevron → only toggles submenu, does NOT navigate ── */}
        {!collapsed && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            aria-label="Toggle submenu"
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

      {/* ── Submenu ── */}
      {!collapsed && (
        <div style={{ overflow: "hidden", maxHeight: open ? `${children.length * 44}px` : "0px", transition: "max-height 280ms ease" }}>
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
                paddingLeft:  44,
                paddingRight: 12,
                color:      isActive ? "#fff" : "var(--text-on-sidebar)",
                background: isActive ? "rgba(238,162,58,0.15)" : "transparent",
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="shrink-0 mr-2 flex items-center justify-center" style={{ width: 14, minWidth: 14 }}>
                    <CIcon size={13} style={{ color: isActive ? "#f7e013" : undefined, opacity: isActive ? 1 : 0.7 }} />
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