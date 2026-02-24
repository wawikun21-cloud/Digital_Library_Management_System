import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, User, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../DropdownMenu";

const PAGE_TITLES = {
  "/":         "Analytics Dashboard",
  "/books":    "Books",
  "/borrowed": "Borrowed",
};

export default function Topbar({ collapsed, onToggle, onMobileToggle }) {
  const location = useLocation();
  const title    = PAGE_TITLES[location.pathname] ?? "Dashboard";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between h-[58px] px-4 sm:px-6"
      style={{
        background:   "var(--bg-topbar)",
        borderBottom: "1px solid var(--border)",
        boxShadow:    "0 1px 4px rgba(19,47,69,0.07)",
        transition:   "background 0.3s, border-color 0.3s",
      }}
    >
      {/* ── Left: hamburger + page title ── */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Desktop hamburger */}
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.12)"; e.currentTarget.style.color = "#EEA23A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          {collapsed ? <Menu size={20} /> : <X size={20} />}
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={onMobileToggle}
          aria-label="Open menu"
          className="flex lg:hidden items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors duration-150"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(238,162,58,0.12)"; e.currentTarget.style.color = "#EEA23A"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <Menu size={20} />
        </button>

        <h1
          className="text-[15px] font-semibold truncate"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h1>
      </div>

      {/* ── Right: profile dropdown ── */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg select-none transition-colors duration-150 border-none bg-transparent cursor-pointer z-100"
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <img
            src="https://i.pravatar.cc/36?img=12"
            alt="Avatar"
            className="w-8 h-8 rounded-full object-cover shrink-0"
            style={{ border: "2px solid var(--accent-amber)" }}
          />
          <span
            className="hidden sm:block text-[13px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Admin
          </span>
          <ChevronDown
            size={14}
            style={{
              color: "var(--text-secondary)",
              transition: "transform 0.2s",
            }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>
            <User size={14} className="mr-2" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem style={{ color: "#c0392b" }}>
            <LogOut size={14} className="mr-2" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}