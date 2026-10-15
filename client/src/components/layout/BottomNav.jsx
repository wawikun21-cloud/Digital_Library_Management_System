import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { isItemVisibleForUser } from "./navItems.js";

const NAV = [
  { to: "/dashboard",         label: "Dashboard",     Icon: BarChart3,     permission: "view_dashboard" },
  { to: "/dashboard/books",    label: "Books",    Icon: BookOpen,      permission: "manage_books", featureSet: "library" },
  { to: "/dashboard/borrowed", label: "Borrowed", Icon: ClipboardList, permission: "manage_transactions", featureSet: "library" },
  { to: "/dashboard/deleted",  label: "Deleted",  Icon: Trash2,        permission: "manage_trash" },
];

/**
 * Mobile bottom navigation.
 *
 * Each entry carries the permission its route is guarded by, and entries
 * the user cannot reach are not rendered — an unreachable entry is a link
 * that bounces straight back, which is worse than no link. A user with no
 * reachable entry (students) gets no bar at all.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const items = NAV.filter((item) => isItemVisibleForUser(item, user ?? null));

  if (items.length === 0) return null;

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 z-50 flex items-center justify-around px-2 border-t"
      style={{ 
        background: "var(--bg-sidebar)", 
        borderColor: "var(--border-sidebar)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
      }}
    >
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/dashboard"}
          className={({ isActive }) => [
            "flex flex-col items-center gap-1 transition-colors duration-200",
            isActive ? "text-white" : "text-slate-400"
          ].join(" ")}
        >
          {({ isActive }) => (
            <>
              <Icon 
                size={20} 
                style={{ color: isActive ? "#F3B940" : "inherit" }}
              />
              <span className="text-[10px] font-medium">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
