// ─────────────────────────────────────────────────────────
//  components/layout/Sidebar.jsx
//
//  Floating "rail" sidebar:
//   - Collapsed: a slim rounded pill of 44px icon tiles that floats
//     inside the page frame; hovering expands it to show labels.
//   - Permission-based item visibility (each item declares `permission`)
//   - Expandable group menus (Dashboard, Attendance, Settings)
//   - Sections are separated by hairlines when collapsed and by small
//     labels when expanded → scannable, not tight
//
//  items without `permission` → visible to everyone
//  items with `permission`   → visible only when the resolved
//                              permissions include it
//
//  The catalog and the visibility rules live in ./navItems.js so the
//  BottomNav answers the same question the same way. All visuals live
//  in styles/shell.css (`.rail*` classes).
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

// Keep in sync with RAIL_W_* in Layout.jsx.
const SIDEBAR_WIDTHS = { COLLAPSED: 72, EXPANDED: 252, DRAWER: 264 };

// ─────────────────────────────────────────────────────────
//  Sidebar — desktop rail + mobile drawer
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
      {/* ── Desktop rail ────────────────────────────────── */}
      <aside
        className={`rail hidden lg:flex${effectiveCollapsed ? " rail--collapsed" : ""}`}
        style={{ width: desktopWidth }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Main navigation"
        role="navigation"
      >
        <Inner
          collapsed={effectiveCollapsed}
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          user={user}
        />
      </aside>

      {/* ── Mobile drawer ───────────────────────────────── */}
      <aside
        className={[
          "rail rail--drawer lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-[120%]",
        ].join(" ")}
        style={{ width: SIDEBAR_WIDTHS.DRAWER }}
        data-open={mobileOpen ? "true" : "false"}
      >
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-3 z-10 p-1.5 rounded-xl transition-colors"
          style={{ color: "var(--rail-icon)" }}
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
//  Inner — rail contents
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

  const roleLabel =
    role === ROLES.LIBRARIAN   ? "📚 Librarian"   :
    role === ROLES.STAFF       ? "🧑‍💼 Staff"       :
    role === ROLES.SUPER_ADMIN ? "⚡ Super Admin" :
    role === ROLES.STUDENT     ? "🎓 Student"     : "⚙️ Admin";

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── Brand ────────────────────────────────────── */}
      <div className="rail-brand">
        <Logo variant={collapsed ? "collapsed" : "expanded"} />
      </div>

      {/* ── Nav items ────────────────────────────────── */}
      <nav className="sidebar-nav rail-nav">
        {sections.map((sec, i) => (
          <NavSection
            key={sec.id}
            section={sec}
            isFirst={i === 0}
            collapsed={collapsed}
            user={user}
            openGroups={openGroups}
            onToggleGroup={toggleGroup}
          />
        ))}
      </nav>

      {/* ── Footer: role + theme toggle ──────────────── */}
      <div className="rail-footer">
        {!collapsed && <div className="rail-role">{roleLabel}</div>}

        <button
          type="button"
          onClick={onToggleTheme}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="rail-item"
          style={{ cursor: "pointer", border: 0, background: "transparent", width: collapsed ? 44 : "100%" }}
        >
          {collapsed ? (
            <span className="rail-icon">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</span>
          ) : (
            <>
              <span className="t-track">
                <span className={`t-thumb ${darkMode ? "t-thumb-on" : ""}`} />
                <span className="t-icon t-sun"><Sun size={10} /></span>
                <span className="t-icon t-moon"><Moon size={10} /></span>
              </span>
              <span className="truncate">{darkMode ? "Dark Mode" : "Light Mode"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
//  NavSection — a labelled (expanded) or hairline-divided
//  (collapsed) group of nav items
// ─────────────────────────────────────────────────────────
function NavSection({ section, isFirst, collapsed, user, openGroups, onToggleGroup }) {
  const { label, items } = section;

  return (
    <div>
      {collapsed
        ? (!isFirst && <div className="rail-divider" aria-hidden="true" />)
        : <span className="rail-section-label">{label}</span>}

      <div className="flex flex-col gap-1">
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
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => `rail-item${isActive ? " is-active" : ""}`}
    >
      <span className="rail-icon"><Icon size={18} /></span>
      {!collapsed && <span className="truncate">{label}</span>}
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

  const headerContent = (
    <>
      <span className="rail-icon"><Icon size={18} /></span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  );

  return (
    <div>
      <div className={`rail-row${isHighlighted ? " is-active" : ""}`}>
        {canLink ? (
          <NavLink
            to={to}
            end
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            className={({ isActive }) => `rail-item${isActive || anyChildActive ? " is-active" : ""}`}
          >
            {headerContent}
          </NavLink>
        ) : (
          <div
            title={collapsed ? label : undefined}
            className={`rail-item${isHighlighted ? " is-active" : ""}`}
          >
            {headerContent}
          </div>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
            aria-label={`Toggle ${label} submenu`}
            aria-expanded={open}
            className="rail-chev"
          >
            <ChevronDown
              size={14}
              style={{
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
          className="rail-sub"
          style={{ maxHeight: open ? `${children.length * 40 + 8}px` : "0px" }}
        >
          <div className="flex flex-col gap-0.5 py-1">
            {children.map(({ to: cTo, label: cLabel, Icon: CIcon, end: cEnd }) => (
              <NavLink
                key={cTo}
                to={cTo}
                end={cEnd ?? false}
                title={cLabel}
                tabIndex={open ? 0 : -1}
                className={({ isActive }) => `rail-item${isActive ? " is-active" : ""}`}
              >
                <span className="rail-icon" style={{ width: 14 }}><CIcon size={14} /></span>
                <span className="truncate">{cLabel}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
