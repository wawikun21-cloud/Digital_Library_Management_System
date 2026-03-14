import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, ClipboardList, Trash2 } from "lucide-react";

const NAV = [
  { to: "/",         label: "Home",     Icon: BarChart3     },
  { to: "/books",    label: "Books",    Icon: BookOpen      },
  { to: "/borrowed", label: "Borrowed", Icon: ClipboardList },
  { to: "/deleted",  label: "Deleted",  Icon: Trash2        },
];

export default function BottomNav() {
  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 h-16 z-50 flex items-center justify-around px-2 border-t"
      style={{ 
        background: "var(--bg-sidebar)", 
        borderColor: "var(--border-sidebar)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.1)"
      }}
    >
      {NAV.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
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
