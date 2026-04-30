// ─────────────────────────────────────────────────────────
//  components/layout/Sidebar.jsx  —  Updated with Librarian RBAC
//
//  Each NAV_ITEMS entry now has a `roles` array.
//  Items without `roles` are visible to ALL authenticated users.
//  Items with `roles` are visible only to the listed roles.
//
//  Role filter is applied once in Inner → visibleItems.
// ─────────────────────────────────────────────────────────

import { ShieldCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3, BookOpen, ClipboardList, Trash2, Sun, Moon, X,
  ChevronDown, Library, Users, User, Globe, UserCheck, LayoutDashboard,
} from "lucide-react";
import Logo from "./Logo.jsx";
import { STORAGE_KEYS } from "../../constants/index.js";
import { ROLES } from "../../constants/roles.js";

const SIDEBAR_WIDTHS = { COLLAPSED: 58, EXPANDED: 220 };
const BRAND_HEIGHT   = 66;

// ─────────────────────────────────────────────────────────
//  NAV_ITEMS
//
//  roles: undefined  → visible to everyone
//  roles: [...]      → visible only to listed roles
// ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  // ── Dashboard Analytics (admin only) ──────────────────
  {
    label:   "Dashboard Analytics",
    to:      "/dashboard",
    Icon:    BarChart3,
    isGroup: true,
    roles:   [ROLES.ADMIN],
    children: [
      { to: "/dashboard/attendance/dashboard", label: "Attendance", Icon: LayoutDashboard },
      { to: "/dashboard/books/dashboard",      label: "Book",       Icon: BookOpen },
    ],
  },

  // ── Books catalog (admin + librarian) ─────────────────
  { to: "/dashboard/books",        label: "Books",        Icon: BookOpen, roles: [ROLES.ADMIN, ROLES.LIBRARIAN], end: true },
  { to: "/dashboard/lexora-books", label: "Lexora Books", Icon: Globe,    roles: [ROLES.ADMIN, ROLES.LIBRARIAN] },

  // ── Admin-only pages ──────────────────────────────────
  { to: "/dashboard/borrowed",  label: "Borrowed",         Icon: ClipboardList, roles: [ROLES.ADMIN] },

  // ── Attendance group (admin + staff) ──────────────────
  {
    label:   "Attendance",
    to:      "/dashboard/attendance",
    Icon:    Users,
    isGroup: true,
    roles:   [ROLES.ADMIN, ROLES.STAFF],
    children: [
      { to: "/dashboard/students",         label: "Students",         Icon: User      },
      { to: "/dashboard/faculty",          label: "Faculty",          Icon: UserCheck },
      { to: "/dashboard/attendance/kiosk", label: "Kiosk Attendance", Icon: UserCheck },
    ],
  },

  // ── Admin-only destructive / audit pages ──────────────
  { to: "/dashboard/deleted",   label: "Recently Deleted", Icon: Trash2,      roles: [ROLES.ADMIN] },
  { to: "/dashboard/audit-log", label: "Audit Trail",      Icon: ShieldCheck, roles: [ROLES.ADMIN] },
];

// ─────────────────────────────────────────────────────────
export default function Sidebar({
  collapsed, darkMode, onToggleTheme, mobileOpen, onMobileClose, userRole,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const effectiveCollapsed = collapsed && !isHovered;
  const desktopWidth = effectiveCollapsed ? SIDEBAR_WIDTHS.COLLAPSED : SIDEBAR_WIDTHS.EXPANDED;

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className="sidebar-hover-expand fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col overflow-hidden transition-all duration-300"
        style={{ width: desktopWidth, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-sidebar)" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main navigation"
        role="navigation"
        aria-expanded={!effectiveCollapsed}
      >
        <Inner
          collapsed={effectiveCollapsed}
          sidebarWidth={desktopWidth}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          userRole={userRole}
        />
      </aside>

      {/* ── Mobile sidebar ──────────────────────────────── */}
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
        <Inner
          collapsed={false}
          sidebarWidth={240}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          userRole={userRole}
        />
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
function getRoleFromStorage(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw)?.role ?? null;
  } catch { return null; }
}

function isItemVisibleForRole(item, role) {
  // No roles restriction → show to everyone
  if (!item.roles) return true;
  // Null/undefined role defaults to admin (backwards-compatible)
  if (role === null || role === undefined) return item.roles.includes(ROLES.ADMIN);
  return item.roles.includes(role);
}

function isChildActive(children, pathname) {
  return children.some(c => pathname === c.to || pathname.startsWith(c.to + "/"));
}

// ─────────────────────────────────────────────────────────
//  Inner — the actual sidebar contents
// ─────────────────────────────────────────────────────────
function Inner({ collapsed, sidebarWidth, darkMode, onToggleTheme, userRole }) {
  const location = useLocation();

  // Role resolution: storage takes precedence, fallback to prop, then admin
  const role = getRoleFromStorage(STORAGE_KEYS.LEXORA_USER) ?? userRole ?? ROLES.ADMIN;

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter(item => isItemVisibleForRole(item, role));

  // Pre-find groups for accordion state
  const dashboardGroup  = NAV_ITEMS.find(i => i.isGroup && i.label === "Dashboard Analytics");
  const attendanceGroup = NAV_ITEMS.find(i => i.isGroup && i.label === "Attendance");

  const [dashboardOpen,  setDashboardOpen]  = useState(
    () => dashboardGroup  ? isChildActive(dashboardGroup.children,  location.pathname) : false
  );
  const [attendanceOpen, setAttendanceOpen] = useState(
    () => attendanceGroup ? isChildActive(attendanceGroup.children, location.pathname) : false
  );

  useEffect(() => {
    if (dashboardGroup  && isChildActive(dashboardGroup.children,  location.pathname)) setDashboardOpen(true);
    if (attendanceGroup && isChildActive(attendanceGroup.children, location.pathname)) setAttendanceOpen(true);
  }, [location.pathname]);

  const getOpen   = (label) => label === "Dashboard Analytics" ? dashboardOpen  : attendanceOpen;
  const getToggle = (label) => label === "Dashboard Analytics"
    ? () => setDashboardOpen(o => !o)
    : () => setAttendanceOpen(o => !o);

  return (
    <div className="flex flex-col h-full">

      {/* ── Brand ─────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 overflow-hidden border-b border-[var(--border-sidebar)]"
        style={{ minHeight: BRAND_HEIGHT, width: sidebarWidth, padding: "10px 12px", transition: "width 300ms ease" }}
      >
        <Logo variant={collapsed ? "collapsed" : "expanded"} />
      </div>

      {/* ── Nav items ─────────────────────────────────── */}
      <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-4 overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item) =>
          item.isGroup ? (
            <StudentsMenu
              key={item.label}
              item={item}
              collapsed={collapsed}
              open={getOpen(item.label)}
              onToggle={getToggle(item.label)}
            />
          ) : (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          )
        )}
      </nav>

      {/* ── Role badge (shown when expanded) ─────────── */}
      {!collapsed && (
        <div
          style={{
            padding:    "6px 12px 2px",
            opacity:    0.55,
            fontSize:   "10px",
            fontWeight: "600",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-on-sidebar)",
          }}
        >
          {role === ROLES.LIBRARIAN ? "📚 Librarian" : role === ROLES.STAFF ? "🧑‍💼 Staff" : "⚙️ Admin"}
        </div>
      )}

      {/* ── Theme toggle ──────────────────────────────── */}
      <div
        className="flex flex-col gap-2 p-2 shrink-0"
        style={{ borderTop: "1px solid var(--border-sidebar)" }}
      >
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

// ─────────────────────────────────────────────────────────
//  NavItem  —  single flat link
// ─────────────────────────────────────────────────────────
function NavItem({ item, collapsed }) {
  const { to, label, Icon, end } = item;
  return (
    <NavLink
      to={to}
      end={end ?? to === "/dashboard"}
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

// ─────────────────────────────────────────────────────────
//  StudentsMenu  —  expandable group link
// ─────────────────────────────────────────────────────────
function StudentsMenu({ item, collapsed, open, onToggle }) {
  const { label, to, Icon, children } = item;
  const location       = useLocation();
  const anyChildActive = children.some(c =>
    location.pathname === c.to || location.pathname.startsWith(c.to + "/")
  );
  const isSelfActive  = location.pathname === to;
  const isHighlighted = isSelfActive || anyChildActive;

  return (
    <div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: isHighlighted ? "rgba(238,162,58,0.18)" : "transparent" }}
      >
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
              {!collapsed && <span className="ml-3 truncate" style={{ fontSize: 11.5 }}>{label}</span>}
            </>
          )}
        </NavLink>

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

      {!collapsed && (
        <div style={{
          overflow:   "hidden",
          maxHeight:  open ? `${children.length * 48}px` : "0px",
          transition: "max-height 280ms ease",
          padding:    "3px 4px 4px 4px",
        }}>
          {children.map(({ to: cTo, label: cLabel, Icon: CIcon, end: cEnd }) => (
            <NavLink
              key={cTo}
              to={cTo}
              end={cEnd ?? false}
              className={({ isActive }) => [
                "flex items-center rounded-lg font-medium select-none transition-colors duration-150",
                isActive ? "text-white" : "hover:text-amber-400",
              ].join(" ")}
              style={({ isActive }) => ({
                paddingLeft:   28,
                paddingRight:  8,
                paddingTop:    10,
                paddingBottom: 10,
                color:      isActive ? "#fff" : "var(--text-on-sidebar)",
                background: isActive ? "rgba(238,162,58,0.15)" : "transparent",
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 14, minWidth: 14, marginRight: 8 }}>
                    <CIcon size={13} style={{ color: isActive ? "#f7e013" : undefined, opacity: isActive ? 1 : 0.7 }} />
                  </span>
                  <span style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cLabel}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
