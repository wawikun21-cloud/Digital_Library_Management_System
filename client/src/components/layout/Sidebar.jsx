// ─────────────────────────────────────────────────────────
//  components/layout/Sidebar.jsx
//
//  Sidebar navigation with:
//   - Permission-based item visibility (each item declares `permission`)
//   - Expandable group menus (Dashboard, Attendance, Settings)
//   - Section grouping (labels + dividers) → scannable, not tight
//
//  items without `permission` → visible to everyone
//  items with `permission`   → visible only when the resolved
//                              permissions include it
//
//  The catalog and the visibility rules live in ./navItems.js so the
//  BottomNav answers the same question the same way.
// ─────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Sun, Moon, X, ChevronDown } from "lucide-react";
import Logo from "./Logo.jsx";
import { STORAGE_KEYS } from "../../constants/index.js";
import { ROLES } from "../../constants/roles.js";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import {
  NAV_ITEMS,
  buildVisibleItems,
  groupBySection,
  isChildActive,
  isGroupLinkVisible,
} from "./navItems.js";

const SIDEBAR_WIDTHS = { COLLAPSED: 58, EXPANDED: 220 };
const BRAND_HEIGHT   = 66;

// ─────────────────────────────────────────────────────────
//  Sidebar — desktop + mobile asides
// ─────────────────────────────────────────────────────────
export default function Sidebar({
  collapsed, darkMode, onToggleTheme, mobileOpen, onMobileClose, userRole,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const effectiveCollapsed = collapsed && !isHovered;
  const desktopWidth = effectiveCollapsed ? SIDEBAR_WIDTHS.COLLAPSED : SIDEBAR_WIDTHS.EXPANDED;
  const [cachedUser] = useLocalStorage(STORAGE_KEYS.LEXORA_USER, null);
  // Fall back to the prop's role so the nav still renders before /me resolves.
  // Memoized: a fresh object every render would rebuild the visible-item list
  // (and re-run the group-open effect) on every keystroke anywhere in the app.
  const user = useMemo(
    () => cachedUser ?? (userRole ? { role: userRole } : null),
    [cachedUser, userRole]
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-screen z-50 hidden lg:flex flex-col overflow-hidden transition-all duration-300"
        style={{ width: desktopWidth, background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-sidebar)" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main navigation"
        role="navigation"
        aria-expanded={!effectiveCollapsed}
      >
        <Inner
          collapsed={effectiveCollapsed}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          user={user}
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
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          user={user}
        />
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────
//  Inner — sidebar contents
// ─────────────────────────────────────────────────────────
function Inner({ collapsed, darkMode, onToggleTheme, user }) {
  const location = useLocation();

  // Derived from the freshly read cached user; the badge is decorative so it
  // is safe to default to admin when the cache is still empty.
  const role = user?.role ?? ROLES.ADMIN;

  // Visible nav items for the current user's resolved permissions. Groups
  // arrive with their unreachable children already removed, and a group the
  // user cannot reach at all (no route permission, no visible child) is gone.
  const visibleItems = useMemo(() => buildVisibleItems(NAV_ITEMS, user), [user]);
  const sections = useMemo(() => groupBySection(visibleItems), [visibleItems]);

  // Groups keyed by label, open state auto-tracked on route change. Only
  // visible children count, so a hidden active route cannot open an empty group.
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    visibleItems.forEach((item) => {
      if (item.isGroup && item.children && isChildActive(item.children, location.pathname)) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    visibleItems.forEach((item) => {
      if (item.isGroup && item.children && isChildActive(item.children, location.pathname)) {
        setOpenGroups((g) => (g[item.label] ? g : { ...g, [item.label]: true }));
      }
    });
  }, [location.pathname, visibleItems]);

  const toggleGroup = (label) => setOpenGroups((g) => ({ ...g, [label]: !g[label] }));

  return (
    <div className="flex flex-col h-full">
      {/* ── Brand ────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 overflow-hidden border-b border-[var(--border-sidebar)]"
        style={{ minHeight: BRAND_HEIGHT, padding: "10px 12px" }}
      >
        <Logo variant={collapsed ? "collapsed" : "expanded"} />
      </div>

      {/* ── Nav items ────────────────────────────────── */}
      <nav
        className="sidebar-nav flex-1 flex flex-col gap-1 py-2 overflow-y-auto overflow-x-hidden"
      >
        {sections.map((sec) => (
          <NavSection
            key={sec.id}
            section={sec}
            collapsed={collapsed}
            user={user}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
          />
        ))}
      </nav>

      {/* ── Role badge (expanded only) ──────────────── */}
      {!collapsed && (
        <div
          style={{
            padding: "6px 12px 2px",
            opacity: 0.55,
            fontSize: "10px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-on-sidebar)",
          }}
        >
          {role === ROLES.LIBRARIAN ? "📚 Librarian" : role === ROLES.STAFF ? "🧑‍💼 Staff" : role === ROLES.SUPER_ADMIN ? "⚡ Super Admin" : role === ROLES.STUDENT ? "🎓 Student" : "⚙️ Admin"}
        </div>
      )}

      {/* ── Theme toggle ─────────────────────────────── */}
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
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(238,162,58,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
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
//  NavSection — a labelled, divided group of nav items
// ─────────────────────────────────────────────────────────
function NavSection({ section, collapsed, user, openGroups, onToggleGroup }) {
  const { label, items } = section;

  return (
    <div className="mb-1.5">
      {/* ── Divider + label (expanded only) ──────────── */}
      {!collapsed && (
        <>
          <span
            className="block px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-on-sidebar)", opacity: 0.5 }}
          >
            {label}
          </span>
        </>
      )}

      <div className="flex flex-col gap-1 px-2">
        {items.map((item) =>
          item.isGroup ? (
            <GroupMenu
              key={item.label}
              item={item}
              collapsed={collapsed}
              open={openGroups[item.label] ?? false}
              canLink={isGroupLinkVisible(item, user)}
              onToggle={() => onToggleGroup(item.label)}
            />
          ) : (
            <NavItem key={item.to} item={item} collapsed={collapsed} />
          )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  NavItem — single flat link
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
        "overflow-hidden whitespace-nowrap select-none transition-colors duration-150 px-3 py-2",
        isActive ? "text-white" : "hover:text-amber-400",
      ].join(" ")}
      style={({ isActive }) => ({
        color: isActive ? "#fff" : "var(--text-on-sidebar)",
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
//  GroupMenu — expandable group with a toggle chevron
//
//  `canLink` false renders the header without the parent link
//  (the group's own route is guarded and unreachable), so the group
//  acts as a labelled container for its reachable children instead of
//  a link that PermissionRoute would bounce back to the dashboard.
// ─────────────────────────────────────────────────────────
function GroupMenu({ item, collapsed, open, canLink, onToggle }) {
  const { label, to, Icon, children } = item;
  const location = useLocation();
  const anyChildActive = children.some(
    (c) => location.pathname === c.to || location.pathname.startsWith(c.to + "/")
  );
  const isSelfActive = canLink && location.pathname === to;
  const isHighlighted = isSelfActive || anyChildActive;

  const header = (
    <>
      <span className="shrink-0 flex items-center justify-center" style={{ width: 18, minWidth: 18 }}>
        <Icon size={18} style={{ color: isHighlighted ? "#f0d807" : undefined }} />
      </span>
      {!collapsed && <span className="ml-3 truncate" style={{ fontSize: 11.5 }}>{label}</span>}
    </>
  );

  return (
    <div>
      <div
        className="flex items-center rounded-lg overflow-hidden"
        style={{ background: isHighlighted ? "rgba(238,162,58,0.18)" : "transparent" }}
      >
        {canLink ? (
          <NavLink
            to={to}
            end
            title={collapsed ? label : undefined}
            className="flex items-center flex-1 overflow-hidden whitespace-nowrap select-none transition-colors duration-150 px-3 py-2 text-sm font-medium"
            style={({ isActive }) => ({
              color: isActive || anyChildActive ? "#fff" : "var(--text-on-sidebar)",
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
        ) : (
          <div
            title={collapsed ? label : undefined}
            className="flex items-center flex-1 overflow-hidden whitespace-nowrap select-none px-3 py-2 text-sm font-medium"
            style={{ color: isHighlighted ? "#fff" : "var(--text-on-sidebar)" }}
          >
            {header}
          </div>
        )}

        {!collapsed && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
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
        <div
          style={{
            overflow: "hidden",
            maxHeight: open ? `${children.length * 36}px` : "0px",
            transition: "max-height 280ms ease",
            padding: "2px 4px 3px",
          }}
        >
          {children.map(({ to: cTo, label: cLabel, Icon: CIcon, end: cEnd }) => (
            <NavLink
              key={cTo}
              to={cTo}
              end={cEnd ?? false}
              title={cLabel}
              className={({ isActive }) => [
                "flex items-center rounded-lg font-medium select-none transition-colors duration-150",
                isActive ? "text-white" : "hover:text-amber-400",
              ].join(" ")}
              style={({ isActive }) => ({
                paddingLeft: 30,
                paddingRight: 8,
                paddingTop: 7,
                paddingBottom: 7,
                color: isActive ? "#fff" : "var(--text-on-sidebar)",
                background: isActive ? "rgba(238,162,58,0.12)" : "transparent",
              })}
            >
              {({ isActive }) => (
                <>
                  <span className="shrink-0 flex items-center justify-center" style={{ width: 12, minWidth: 12, marginRight: 8 }}>
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
