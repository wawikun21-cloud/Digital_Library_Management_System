import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ChevronLeft, ChevronRight, Search, Filter,
  ChevronsLeft, ChevronsRight, ChevronDown,
  Crown, Users, AlertTriangle, BookOpen,
  TrendingUp, TrendingDown, Calendar,
} from "lucide-react";
import StatsCard from "../components/StatsCard";

// ══════════════════════════════════════════════════════════════════════════════
// DATA — keyed by semester + month so filters work live
// ══════════════════════════════════════════════════════════════════════════════

const SEMESTERS = ["1st Sem", "2nd Sem"];

// Months per semester (school year 2025-2026)
const SEM_MONTHS = {
  "1st Sem": ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"],
  "2nd Sem": ["Feb", "Mar", "Apr", "May", "Jun", "Jul"],
};

// ── Most Borrowed Books — per [sem][month]
const BORROWED_DATA = {
  "1st Sem": {
    "All":  [
      { title: "Clean Code",               short: "Clean Code",     borrows: 87 },
      { title: "The Pragmatic Programmer", short: "Pragmatic Prog", borrows: 74 },
      { title: "Design Patterns",          short: "Design Pat.",    borrows: 61 },
      { title: "Refactoring",              short: "Refactoring",    borrows: 55 },
      { title: "You Don't Know JS",        short: "YDKJS",          borrows: 48 },
      { title: "Eloquent JavaScript",      short: "Eloquent JS",    borrows: 39 },
      { title: "The Mythical Man-Month",   short: "Man-Month",      borrows: 33 },
    ],
    "Aug":  [{ title: "Clean Code", short: "Clean Code", borrows: 18 }, { title: "Refactoring", short: "Refactoring", borrows: 14 }, { title: "Design Patterns", short: "Design Pat.", borrows: 12 }, { title: "YDKJS", short: "YDKJS", borrows: 9 }, { title: "Eloquent JS", short: "Eloquent JS", borrows: 7 }],
    "Sep":  [{ title: "Clean Code", short: "Clean Code", borrows: 21 }, { title: "Pragmatic",   short: "Pragmatic",   borrows: 17 }, { title: "Design Patterns", short: "Design Pat.", borrows: 13 }, { title: "YDKJS", short: "YDKJS", borrows: 10 }, { title: "Eloquent JS", short: "Eloquent JS", borrows: 8 }],
    "Oct":  [{ title: "Pragmatic",   short: "Pragmatic",   borrows: 19 }, { title: "Clean Code", short: "Clean Code", borrows: 16 }, { title: "Refactoring", short: "Refactoring", borrows: 12 }, { title: "Man-Month", short: "Man-Month", borrows: 8 }, { title: "Design Pat.", short: "Design Pat.", borrows: 6 }],
    "Nov":  [{ title: "Design Patterns", short: "Design Pat.", borrows: 22 }, { title: "Clean Code", short: "Clean Code", borrows: 18 }, { title: "Pragmatic", short: "Pragmatic", borrows: 14 }, { title: "Eloquent JS", short: "Eloquent JS", borrows: 11 }, { title: "YDKJS", short: "YDKJS", borrows: 9 }],
    "Dec":  [{ title: "Refactoring", short: "Refactoring", borrows: 15 }, { title: "Man-Month", short: "Man-Month", borrows: 10 }, { title: "Clean Code", short: "Clean Code", borrows: 8 }, { title: "YDKJS", short: "YDKJS", borrows: 6 }, { title: "Design Pat.", short: "Design Pat.", borrows: 4 }],
    "Jan":  [{ title: "Clean Code", short: "Clean Code", borrows: 24 }, { title: "Pragmatic", short: "Pragmatic", borrows: 20 }, { title: "Eloquent JS", short: "Eloquent JS", borrows: 13 }, { title: "Design Pat.", short: "Design Pat.", borrows: 10 }, { title: "Refactoring", short: "Refactoring", borrows: 9 }],
  },
  "2nd Sem": {
    "All":  [
      { title: "Atomic Habits",       short: "Atomic Habits", borrows: 92 },
      { title: "Sapiens",             short: "Sapiens",       borrows: 78 },
      { title: "Rich Dad Poor Dad",   short: "Rich Dad",      borrows: 65 },
      { title: "The Alchemist",       short: "Alchemist",     borrows: 58 },
      { title: "Deep Work",           short: "Deep Work",     borrows: 47 },
      { title: "Zero to One",         short: "Zero to One",   borrows: 41 },
      { title: "Thinking, Fast/Slow", short: "Fast & Slow",   borrows: 36 },
    ],
    "Feb":  [{ title: "Atomic Habits", short: "Atomic Habits", borrows: 28 }, { title: "Sapiens", short: "Sapiens", borrows: 22 }, { title: "Rich Dad", short: "Rich Dad", borrows: 18 }, { title: "Alchemist", short: "Alchemist", borrows: 14 }, { title: "Deep Work", short: "Deep Work", borrows: 11 }],
    "Mar":  [{ title: "Atomic Habits", short: "Atomic Habits", borrows: 32 }, { title: "Sapiens", short: "Sapiens", borrows: 27 }, { title: "Zero to One", short: "Zero to One", borrows: 19 }, { title: "Rich Dad", short: "Rich Dad", borrows: 15 }, { title: "Fast & Slow", short: "Fast & Slow", borrows: 12 }],
    "Apr":  [{ title: "Sapiens", short: "Sapiens", borrows: 25 }, { title: "Alchemist", short: "Alchemist", borrows: 20 }, { title: "Deep Work", short: "Deep Work", borrows: 16 }, { title: "Zero to One", short: "Zero to One", borrows: 12 }, { title: "Atomic Habits", short: "Atomic Habits", borrows: 10 }],
    "May":  [{ title: "Rich Dad", short: "Rich Dad", borrows: 20 }, { title: "Alchemist", short: "Alchemist", borrows: 17 }, { title: "Fast & Slow", short: "Fast & Slow", borrows: 13 }, { title: "Sapiens", short: "Sapiens", borrows: 10 }, { title: "Deep Work", short: "Deep Work", borrows: 8 }],
    "Jun":  [{ title: "Zero to One", short: "Zero to One", borrows: 16 }, { title: "Atomic Habits", short: "Atomic Habits", borrows: 13 }, { title: "Fast & Slow", short: "Fast & Slow", borrows: 10 }, { title: "Sapiens", short: "Sapiens", borrows: 8 }, { title: "Rich Dad", short: "Rich Dad", borrows: 6 }],
    "Jul":  [{ title: "Atomic Habits", short: "Atomic Habits", borrows: 19 }, { title: "Deep Work", short: "Deep Work", borrows: 12 }, { title: "Rich Dad", short: "Rich Dad", borrows: 9 }, { title: "Alchemist", short: "Alchemist", borrows: 7 }, { title: "Zero to One", short: "Zero to One", borrows: 5 }],
  },
};

// ── Attendance Count — per [sem][month]
const ATTENDANCE_DATA = {
  "1st Sem": {
    "All": [
      { month: "Aug", visits: 1820 }, { month: "Sep", visits: 2140 },
      { month: "Oct", visits: 1960 }, { month: "Nov", visits: 2380 },
      { month: "Dec", visits: 1340 }, { month: "Jan", visits: 2560 },
    ],
    "Aug": [{ day: "W1", visits: 410 }, { day: "W2", visits: 470 }, { day: "W3", visits: 490 }, { day: "W4", visits: 450 }],
    "Sep": [{ day: "W1", visits: 510 }, { day: "W2", visits: 530 }, { day: "W3", visits: 560 }, { day: "W4", visits: 540 }],
    "Oct": [{ day: "W1", visits: 480 }, { day: "W2", visits: 500 }, { day: "W3", visits: 490 }, { day: "W4", visits: 490 }],
    "Nov": [{ day: "W1", visits: 570 }, { day: "W2", visits: 610 }, { day: "W3", visits: 600 }, { day: "W4", visits: 600 }],
    "Dec": [{ day: "W1", visits: 380 }, { day: "W2", visits: 350 }, { day: "W3", visits: 320 }, { day: "W4", visits: 290 }],
    "Jan": [{ day: "W1", visits: 620 }, { day: "W2", visits: 650 }, { day: "W3", visits: 640 }, { day: "W4", visits: 650 }],
  },
  "2nd Sem": {
    "All": [
      { month: "Feb", visits: 2310 }, { month: "Mar", visits: 2640 },
      { month: "Apr", visits: 2190 }, { month: "May", visits: 1870 },
      { month: "Jun", visits: 1540 }, { month: "Jul", visits: 1220 },
    ],
    "Feb": [{ day: "W1", visits: 550 }, { day: "W2", visits: 580 }, { day: "W3", visits: 600 }, { day: "W4", visits: 580 }],
    "Mar": [{ day: "W1", visits: 630 }, { day: "W2", visits: 680 }, { day: "W3", visits: 670 }, { day: "W4", visits: 660 }],
    "Apr": [{ day: "W1", visits: 540 }, { day: "W2", visits: 560 }, { day: "W3", visits: 550 }, { day: "W4", visits: 540 }],
    "May": [{ day: "W1", visits: 480 }, { day: "W2", visits: 470 }, { day: "W3", visits: 470 }, { day: "W4", visits: 450 }],
    "Jun": [{ day: "W1", visits: 400 }, { day: "W2", visits: 390 }, { day: "W3", visits: 380 }, { day: "W4", visits: 370 }],
    "Jul": [{ day: "W1", visits: 320 }, { day: "W2", visits: 310 }, { day: "W3", visits: 300 }, { day: "W4", visits: 290 }],
  },
};

// ── Fines Collected — per [sem][month]
const FINES_DATA = {
  "1st Sem": {
    "All": [
      { month: "Aug", collected: 720,  uncollected: 380  },
      { month: "Sep", collected: 860,  uncollected: 290  },
      { month: "Oct", collected: 940,  uncollected: 310  },
      { month: "Nov", collected: 1080, uncollected: 420  },
      { month: "Dec", collected: 510,  uncollected: 190  },
      { month: "Jan", collected: 1240, uncollected: 360  },
    ],
    "Aug": [{ week: "W1", collected: 170, uncollected: 90 }, { week: "W2", collected: 185, uncollected: 95 }, { week: "W3", collected: 195, uncollected: 105 }, { week: "W4", collected: 170, uncollected: 90 }],
    "Sep": [{ week: "W1", collected: 200, uncollected: 70 }, { week: "W2", collected: 215, uncollected: 75 }, { week: "W3", collected: 225, uncollected: 75 }, { week: "W4", collected: 220, uncollected: 70 }],
    "Oct": [{ week: "W1", collected: 220, uncollected: 80 }, { week: "W2", collected: 240, uncollected: 75 }, { week: "W3", collected: 245, uncollected: 80 }, { week: "W4", collected: 235, uncollected: 75 }],
    "Nov": [{ week: "W1", collected: 255, uncollected: 100 }, { week: "W2", collected: 275, uncollected: 110 }, { week: "W3", collected: 280, uncollected: 105 }, { week: "W4", collected: 270, uncollected: 105 }],
    "Dec": [{ week: "W1", collected: 145, uncollected: 55 }, { week: "W2", collected: 130, uncollected: 50 }, { week: "W3", collected: 125, uncollected: 45 }, { week: "W4", collected: 110, uncollected: 40 }],
    "Jan": [{ week: "W1", collected: 295, uncollected: 90 }, { week: "W2", collected: 315, uncollected: 95 }, { week: "W3", collected: 320, uncollected: 90 }, { week: "W4", collected: 310, uncollected: 85 }],
  },
  "2nd Sem": {
    "All": [
      { month: "Feb", collected: 1350, uncollected: 450 },
      { month: "Mar", collected: 1520, uncollected: 510 },
      { month: "Apr", collected: 1180, uncollected: 390 },
      { month: "May", collected: 970,  uncollected: 310 },
      { month: "Jun", collected: 780,  uncollected: 260 },
      { month: "Jul", collected: 590,  uncollected: 200 },
    ],
    "Feb": [{ week: "W1", collected: 320, uncollected: 110 }, { week: "W2", collected: 340, uncollected: 115 }, { week: "W3", collected: 345, uncollected: 115 }, { week: "W4", collected: 345, uncollected: 110 }],
    "Mar": [{ week: "W1", collected: 370, uncollected: 125 }, { week: "W2", collected: 385, uncollected: 130 }, { week: "W3", collected: 390, uncollected: 130 }, { week: "W4", collected: 375, uncollected: 125 }],
    "Apr": [{ week: "W1", collected: 290, uncollected: 95 }, { week: "W2", collected: 300, uncollected: 100 }, { week: "W3", collected: 300, uncollected: 100 }, { week: "W4", collected: 290, uncollected: 95 }],
    "May": [{ week: "W1", collected: 245, uncollected: 80 }, { week: "W2", collected: 248, uncollected: 78 }, { week: "W3", collected: 242, uncollected: 77 }, { week: "W4", collected: 235, uncollected: 75 }],
    "Jun": [{ week: "W1", collected: 200, uncollected: 68 }, { week: "W2", collected: 198, uncollected: 66 }, { week: "W3", collected: 195, uncollected: 64 }, { week: "W4", collected: 187, uncollected: 62 }],
    "Jul": [{ week: "W1", collected: 152, uncollected: 52 }, { week: "W2", collected: 148, uncollected: 50 }, { week: "W3", collected: 148, uncollected: 50 }, { week: "W4", collected: 142, uncollected: 48 }],
  },
};

// ── Overdue Books — per [sem][month]
const OVERDUE_DATA = {
  "1st Sem": {
    "All": [
      { month: "Aug", critical: 2, warning: 4, minor: 6  },
      { month: "Sep", critical: 3, warning: 5, minor: 7  },
      { month: "Oct", critical: 4, warning: 6, minor: 8  },
      { month: "Nov", critical: 5, warning: 7, minor: 9  },
      { month: "Dec", critical: 2, warning: 3, minor: 5  },
      { month: "Jan", critical: 6, warning: 8, minor: 10 },
    ],
    "Aug": [{ week: "W1", critical: 0, warning: 1, minor: 2 }, { week: "W2", critical: 1, warning: 1, minor: 2 }, { week: "W3", critical: 1, warning: 2, minor: 2 }, { week: "W4", critical: 0, warning: 0, minor: 0 }],
    "Sep": [{ week: "W1", critical: 1, warning: 1, minor: 2 }, { week: "W2", critical: 1, warning: 2, minor: 2 }, { week: "W3", critical: 1, warning: 1, minor: 2 }, { week: "W4", critical: 0, warning: 1, minor: 1 }],
    "Oct": [{ week: "W1", critical: 1, warning: 2, minor: 2 }, { week: "W2", critical: 1, warning: 2, minor: 2 }, { week: "W3", critical: 2, warning: 1, minor: 2 }, { week: "W4", critical: 0, warning: 1, minor: 2 }],
    "Nov": [{ week: "W1", critical: 1, warning: 2, minor: 2 }, { week: "W2", critical: 2, warning: 2, minor: 2 }, { week: "W3", critical: 1, warning: 2, minor: 3 }, { week: "W4", critical: 1, warning: 1, minor: 2 }],
    "Dec": [{ week: "W1", critical: 1, warning: 1, minor: 2 }, { week: "W2", critical: 0, warning: 1, minor: 1 }, { week: "W3", critical: 1, warning: 1, minor: 1 }, { week: "W4", critical: 0, warning: 0, minor: 1 }],
    "Jan": [{ week: "W1", critical: 2, warning: 2, minor: 2 }, { week: "W2", critical: 2, warning: 2, minor: 3 }, { week: "W3", critical: 1, warning: 2, minor: 3 }, { week: "W4", critical: 1, warning: 2, minor: 2 }],
  },
  "2nd Sem": {
    "All": [
      { month: "Feb", critical: 3, warning: 5, minor: 8  },
      { month: "Mar", critical: 5, warning: 7, minor: 12 },
      { month: "Apr", critical: 4, warning: 6, minor: 9  },
      { month: "May", critical: 3, warning: 4, minor: 7  },
      { month: "Jun", critical: 2, warning: 3, minor: 5  },
      { month: "Jul", critical: 1, warning: 2, minor: 4  },
    ],
    "Feb": [{ week: "W1", critical: 1, warning: 1, minor: 2 }, { week: "W2", critical: 1, warning: 2, minor: 2 }, { week: "W3", critical: 1, warning: 1, minor: 2 }, { week: "W4", critical: 0, warning: 1, minor: 2 }],
    "Mar": [{ week: "W1", critical: 1, warning: 2, minor: 3 }, { week: "W2", critical: 2, warning: 2, minor: 3 }, { week: "W3", critical: 1, warning: 2, minor: 3 }, { week: "W4", critical: 1, warning: 1, minor: 3 }],
    "Apr": [{ week: "W1", critical: 1, warning: 2, minor: 2 }, { week: "W2", critical: 1, warning: 2, minor: 2 }, { week: "W3", critical: 1, warning: 1, minor: 3 }, { week: "W4", critical: 1, warning: 1, minor: 2 }],
    "May": [{ week: "W1", critical: 1, warning: 1, minor: 2 }, { week: "W2", critical: 1, warning: 1, minor: 2 }, { week: "W3", critical: 1, warning: 1, minor: 2 }, { week: "W4", critical: 0, warning: 1, minor: 1 }],
    "Jun": [{ week: "W1", critical: 1, warning: 1, minor: 1 }, { week: "W2", critical: 0, warning: 1, minor: 1 }, { week: "W3", critical: 1, warning: 1, minor: 2 }, { week: "W4", critical: 0, warning: 0, minor: 1 }],
    "Jul": [{ week: "W1", critical: 0, warning: 1, minor: 1 }, { week: "W2", critical: 1, warning: 1, minor: 1 }, { week: "W3", critical: 0, warning: 0, minor: 1 }, { week: "W4", critical: 0, warning: 0, minor: 1 }],
  },
};

const STATS = [
  { label: "Total Books",  value: "1,284", change: "+12 this month", accent: "#132F45", percentage: 85 },
  { label: "Available",    value: "920",   change: "+5 today",       accent: "#32667F", percentage: 72 },
  { label: "Out of Stock", value: "364",   change: "+8 this week",   accent: "#dc2626", percentage: 28 },
  { label: "Returned",     value: "920",   change: "+8 this week",   accent: "#32667F", percentage: 72 },
];

const AUDIT_LOGS = [
  { id: "TXN-0041", timestamp: "Mar 05, 2026 09:14 AM", admin: "Admin Jane", category: "Book",   description: 'Added new book "The Staff Engineer\'s Path"',             target: "The Staff Engineer's Path", ip: "192.168.1.10",  status: "Success" },
  { id: "TXN-0040", timestamp: "Mar 05, 2026 08:52 AM", admin: "Admin John", category: "Member", description: "Deactivated member account — repeated overdue violations", target: "David L.",                  ip: "192.168.1.12",  status: "Success" },
  { id: "TXN-0039", timestamp: "Mar 04, 2026 04:30 PM", admin: "Admin Jane", category: "Borrow", description: "Manually issued book to member at front desk",             target: "Clean Code → Alice M.",     ip: "192.168.1.10",  status: "Success" },
  { id: "TXN-0038", timestamp: "Mar 04, 2026 02:15 PM", admin: "Admin John", category: "Borrow", description: "Fine waived upon member appeal",                           target: "Bob K. — ₱45.00",           ip: "192.168.1.12",  status: "Success" },
  { id: "TXN-0037", timestamp: "Mar 04, 2026 11:08 AM", admin: "Admin Jane", category: "Book",   description: "Edited book details — updated copies from 3 to 5",         target: "Design Patterns",           ip: "192.168.1.10",  status: "Success" },
  { id: "TXN-0036", timestamp: "Mar 03, 2026 05:47 PM", admin: "Admin John", category: "System", description: "Exported monthly borrowing report as PDF",                  target: "February 2026 Report",      ip: "192.168.1.12",  status: "Success" },
  { id: "TXN-0035", timestamp: "Mar 03, 2026 03:22 PM", admin: "Admin Jane", category: "Member", description: "Reset password for member account",                        target: "Carol T.",                  ip: "192.168.1.10",  status: "Success" },
  { id: "TXN-0034", timestamp: "Mar 03, 2026 01:05 PM", admin: "Admin John", category: "Book",   description: "Marked book as lost — reported by borrower",               target: "Refactoring",               ip: "192.168.1.12",  status: "Success" },
  { id: "TXN-0033", timestamp: "Mar 03, 2026 09:30 AM", admin: "Admin Jane", category: "System", description: "Failed login attempt — incorrect password",                 target: "admin@library.com",         ip: "203.0.113.45",  status: "Failed"  },
  { id: "TXN-0032", timestamp: "Mar 02, 2026 04:00 PM", admin: "Admin John", category: "Member", description: "Added new member account",                                 target: "Emily R.",                  ip: "192.168.1.12",  status: "Success" },
];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

const BAR_COLORS = ["#EEA23A", "#32667F", "#132F45", "#EA8B33", "#32667F", "#EEA23A", "#132F45"];

function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-[12px]"
      style={{
        background: "rgba(255,255,255,0.98)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
        color: "var(--text-primary)",
      }}
    >
      {label && (
        <p className="font-bold mb-1.5 pb-1.5 text-[11px] uppercase tracking-wide"
          style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map(p => (
          <p key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: p.fill || p.color || p.stroke }} />
              <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            </span>
            <span className="font-bold">{prefix}{p.value}{suffix}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// Card shell — always h-full so grid rows stretch uniformly
function Card({ title, icon: Icon, iconColor, iconBg, badge, children, headerExtra }) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full transition-all duration-200 hover:shadow-md"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
              <Icon size={14} style={{ color: iconColor }} />
            </div>
          )}
          <h2 className="text-[12px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          )}
          {headerExtra}
        </div>
      </div>
      <div className="flex flex-col flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// Stat summary pill row inside a card
function StatRow({ items }) {
  return (
    <div className="grid px-4 py-3 gap-3 flex-shrink-0"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderBottom: "1px solid var(--border-light)",
        background: "var(--bg-subtle)",
      }}>
      {items.map((s, i) => (
        <div key={i} className="flex flex-col items-center justify-center py-1 rounded-xl"
          style={{ background: s.bg }}>
          <span className="text-[20px] font-bold leading-none tabular-nums" style={{ color: s.color }}>{s.value}</span>
          <span className="text-[9px] font-semibold mt-0.5 text-center" style={{ color: s.color }}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER BAR
// ══════════════════════════════════════════════════════════════════════════════

function FilterBar({ semester, month, onSemester, onMonth }) {
  const months = ["All", ...SEM_MONTHS[semester]];

  return (
    <div
      className="rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 mr-1">
        <Calendar size={13} style={{ color: "var(--text-muted)" }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
          Filter
        </span>
      </div>

      {/* Semester toggle pills */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        {SEMESTERS.map(s => (
          <button
            key={s}
            onClick={() => { onSemester(s); onMonth("All"); }}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
            style={{
              background: semester === s ? "var(--accent-amber)" : "transparent",
              color: semester === s ? "#fff" : "var(--text-secondary)",
              boxShadow: semester === s ? "0 2px 8px rgba(238,162,58,0.35)" : "none",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--border-light)" }} />

      {/* Month pills */}
      <div className="flex items-center gap-1 flex-wrap">
        {months.map(m => (
          <button
            key={m}
            onClick={() => onMonth(m)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-150"
            style={{
              background: month === m ? "#132F45" : "transparent",
              color: month === m ? "#fff" : "var(--text-secondary)",
              border: month === m ? "1px solid transparent" : "1px solid var(--border-light)",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Active summary tag */}
      <div className="ml-auto flex-shrink-0">
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(19,47,69,0.08)", color: "#132F45" }}>
          {semester} {month !== "All" ? `· ${month}` : "· All Months"}
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. MOST BORROWED BOOKS — Horizontal Bar Chart
// ══════════════════════════════════════════════════════════════════════════════

function MostBorrowedBooks({ semester, month }) {
  const data = useMemo(() => {
    const raw = BORROWED_DATA[semester]?.[month] ?? BORROWED_DATA[semester]["All"];
    return [...raw].sort((a, b) => b.borrows - a.borrows);
  }, [semester, month]);

  const total = data.reduce((s, d) => s + d.borrows, 0);
  const top   = data[0]?.borrows ?? 1;

  return (
    <Card
      title="Most Borrowed Books"
      icon={Crown}
      iconColor="#EEA23A"
      iconBg="rgba(238,162,58,0.12)"
      badge={{ label: `${total} total`, bg: "rgba(238,162,58,0.1)", color: "#b87a1a" }}
    >
      <div className="flex-1 min-h-0 px-4 py-3" style={{ minHeight: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            barCategoryGap="18%"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border-light)" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              domain={[0, Math.ceil(top * 1.15)]}
            />
            <YAxis
              type="category"
              dataKey="short"
              tick={{ fontSize: 10, fill: "var(--text-primary)", fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              width={82}
            />
            <Tooltip content={<ChartTooltip suffix=" borrows" />} cursor={{ fill: "var(--bg-hover)", opacity: 0.5 }} />
            <Bar dataKey="borrows" name="Borrows" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 10, fontWeight: 700, fill: "var(--text-secondary)" }}>
              {data.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. ATTENDANCE COUNT — Area Chart
// ══════════════════════════════════════════════════════════════════════════════

function AttendanceCount({ semester, month }) {
  const data = useMemo(() => {
    return ATTENDANCE_DATA[semester]?.[month] ?? ATTENDANCE_DATA[semester]["All"];
  }, [semester, month]);

  const xKey    = month === "All" ? "month" : "day";
  const total   = data.reduce((s, d) => s + d.visits, 0);
  const avg     = Math.round(total / data.length);
  const maxVal  = Math.max(...data.map(d => d.visits));
  const minVal  = Math.min(...data.map(d => d.visits));
  const isUp    = data[data.length - 1]?.visits >= data[data.length - 2]?.visits;

  return (
    <Card
      title="Attendance Count"
      icon={Users}
      iconColor="#32667F"
      iconBg="rgba(50,102,127,0.12)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(50,102,127,0.1)", color: "#32667F" }}
    >
      <StatRow items={[
        { value: total.toLocaleString(), label: "Total Visits",  color: "#132F45",  bg: "rgba(19,47,69,0.07)"    },
        { value: avg.toLocaleString(),   label: "Avg / Period",  color: "#32667F",  bg: "rgba(50,102,127,0.08)"  },
        { value: maxVal.toLocaleString(), label: "Peak",         color: "#22c55e",  bg: "rgba(34,197,94,0.08)"   },
      ]} />
      <div className="flex-1 min-h-0 px-2 py-3" style={{ minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#32667F" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#32667F" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip suffix=" visits" />} cursor={{ stroke: "var(--border)", strokeWidth: 1.5 }} />
            <Area
              type="monotone"
              dataKey="visits"
              name="Visits"
              stroke="#32667F"
              strokeWidth={2.5}
              fill="url(#attGrad)"
              dot={{ r: 3.5, fill: "#32667F", strokeWidth: 0 }}
              activeDot={{ r: 5.5, fill: "#32667F", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. TOTAL FINES COLLECTED — Stacked Bar Chart
// ══════════════════════════════════════════════════════════════════════════════

function TotalFinesCollected({ semester, month }) {
  const data = useMemo(() => {
    return FINES_DATA[semester]?.[month] ?? FINES_DATA[semester]["All"];
  }, [semester, month]);

  const xKey       = month === "All" ? "month" : "week";
  const totCollect = data.reduce((s, d) => s + d.collected, 0);
  const totUnpaid  = data.reduce((s, d) => s + d.uncollected, 0);
  const grandTotal = totCollect + totUnpaid;
  const rate       = Math.round((totCollect / grandTotal) * 100);

  return (
    <Card
      title="Total Fines Collected"
      icon={() => <span className="text-[13px] font-bold" style={{ color: "#132F45" }}>₱</span>}
      iconColor="#132F45"
      iconBg="rgba(19,47,69,0.1)"
      badge={{ label: month === "All" ? semester : month, bg: "rgba(19,47,69,0.08)", color: "#132F45" }}
    >
      <StatRow items={[
        { value: `₱${totCollect.toLocaleString()}`,  label: "Collected",   color: "#22c55e", bg: "rgba(34,197,94,0.08)"  },
        { value: `₱${totUnpaid.toLocaleString()}`,   label: "Uncollected", color: "#dc2626", bg: "rgba(220,38,38,0.08)"  },
        { value: `${rate}%`,                         label: "Rate",        color: "#32667F", bg: "rgba(50,102,127,0.08)" },
      ]} />
      <div className="flex-1 min-h-0 px-2 py-3" style={{ minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} width={38} />
            <Tooltip content={<ChartTooltip prefix="₱" />} cursor={{ fill: "var(--bg-hover)" }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)", paddingTop: 6 }} />
            <Bar dataKey="collected"   name="Collected"   fill="#32667F" radius={[0, 0, 0, 0]} stackId="fines" />
            <Bar dataKey="uncollected" name="Uncollected" fill="#EEA23A" radius={[3, 3, 0, 0]} stackId="fines" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. OVERDUE BOOKS — Stacked Bar + Pie breakdown
// ══════════════════════════════════════════════════════════════════════════════

function OverdueBooks({ semester, month }) {
  const data = useMemo(() => {
    return OVERDUE_DATA[semester]?.[month] ?? OVERDUE_DATA[semester]["All"];
  }, [semester, month]);

  const xKey    = month === "All" ? "month" : "week";
  const totCrit = data.reduce((s, d) => s + d.critical, 0);
  const totWarn = data.reduce((s, d) => s + d.warning,  0);
  const totMin  = data.reduce((s, d) => s + d.minor,    0);
  const grand   = totCrit + totWarn + totMin;

  const pieData = [
    { name: "Critical", value: totCrit, color: "#dc2626" },
    { name: "Warning",  value: totWarn, color: "#c05a0a" },
    { name: "Minor",    value: totMin,  color: "#EEA23A" },
  ];

  return (
    <Card
      title="Overdue Books"
      icon={AlertTriangle}
      iconColor="#dc2626"
      iconBg="rgba(220,38,38,0.1)"
      badge={{ label: `${grand} total`, bg: "rgba(220,38,38,0.08)", color: "#dc2626" }}
    >
      <StatRow items={[
        { value: totCrit, label: "Critical (10d+)", color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
        { value: totWarn, label: "Warning (5–9d)",  color: "#c05a0a", bg: "rgba(234,139,51,0.1)"   },
        { value: totMin,  label: "Minor (<5d)",     color: "#b87a1a", bg: "rgba(238,162,58,0.1)"   },
      ]} />
      {/* Bar chart top half */}
      <div className="px-2 pt-3" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%" margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border-light)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip content={<ChartTooltip suffix=" books" />} cursor={{ fill: "var(--bg-hover)" }} />
            <Bar dataKey="critical" name="Critical" fill="#dc2626" stackId="ov" radius={[0, 0, 0, 0]} />
            <Bar dataKey="warning"  name="Warning"  fill="#c05a0a" stackId="ov" radius={[0, 0, 0, 0]} />
            <Bar dataKey="minor"    name="Minor"    fill="#EEA23A" stackId="ov" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Pie donut bottom half */}
      <div className="flex-1 min-h-0 pb-2" style={{ minHeight: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius="38%"
              outerRadius="62%"
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip suffix=" books" />} />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 10, fontWeight: 700, color: "var(--text-primary)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

function PaginationControls({ currentPage, totalPages, itemsPerPage, totalItems, onPageChange, onItemsPerPageChange }) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem   = Math.min(currentPage * itemsPerPage, totalItems);

  const pageNumbers = [];
  const maxVisible  = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage   = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  const navBtn = "p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-[var(--border)]";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4"
      style={{ borderTop: "1px solid var(--border-light)" }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <label htmlFor="ipp" className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Show</label>
          <select id="ipp" value={itemsPerPage}
            onChange={e => onItemsPerPageChange(Number(e.target.value))}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border outline-none cursor-pointer transition-all hover:border-[var(--accent-amber)]"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
            {[5, 10, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>entries</span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          Showing <span className="font-bold" style={{ color: "var(--text-primary)" }}>{startItem}</span> to{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{endItem}</span> of{" "}
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{totalItems}</span>
        </span>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button onClick={() => onPageChange(1)} disabled={currentPage === 1} aria-label="First page" className={navBtn} style={{ color: "var(--text-secondary)" }}><ChevronsLeft size={16} /></button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Prev" className={navBtn} style={{ color: "var(--text-secondary)" }}><ChevronLeft size={16} /></button>

        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all border border-transparent hover:border-[var(--border)]" style={{ color: "var(--text-secondary)" }}>1</button>
            {startPage > 2 && <span className="text-[11px] px-1" style={{ color: "var(--text-muted)" }}>...</span>}
          </>
        )}

        {pageNumbers.map(num => (
          <button key={num} onClick={() => onPageChange(num)} aria-label={`Page ${num}`}
            aria-current={currentPage === num ? "page" : undefined}
            className="hidden sm:inline-flex min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all duration-200 items-center justify-center"
            style={{
              background: currentPage === num ? "var(--accent-amber)" : "transparent",
              color:      currentPage === num ? "#fff" : "var(--text-primary)",
              boxShadow:  currentPage === num ? "0 4px 12px rgba(238,162,58,0.3)" : "none",
            }}>
            {num}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-[11px] px-1" style={{ color: "var(--text-muted)" }}>...</span>}
            <button onClick={() => onPageChange(totalPages)} className="min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all border border-transparent hover:border-[var(--border)]" style={{ color: "var(--text-secondary)" }}>{totalPages}</button>
          </>
        )}

        <span className="sm:hidden text-[11px] font-bold px-2" style={{ color: "var(--text-primary)" }}>
          {currentPage} / {totalPages}
        </span>

        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next" className={navBtn} style={{ color: "var(--text-secondary)" }}><ChevronRight size={16} /></button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} aria-label="Last page" className={navBtn} style={{ color: "var(--text-secondary)" }}><ChevronsRight size={16} /></button>
      </nav>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN AUDIT TRAIL
// ══════════════════════════════════════════════════════════════════════════════

function AdminAuditTrail() {
  const [currentPage,    setCurrentPage]    = useState(1);
  const [itemsPerPage,   setItemsPerPage]   = useState(5);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...new Set(AUDIT_LOGS.map(l => l.category))];

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return AUDIT_LOGS.filter(log => {
      const matchesSearch = !searchQuery ||
        log.description.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.admin.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q);
      return matchesSearch && (categoryFilter === "All" || log.category === categoryFilter);
    });
  }, [searchQuery, categoryFilter]);

  const totalPages    = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex    = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  useMemo(() => { setCurrentPage(1); }, [searchQuery, categoryFilter, itemsPerPage]);

  const handleSearchChange       = e => { setSearchQuery(e.target.value);    setCurrentPage(1); };
  const handleCategoryChange     = e => { setCategoryFilter(e.target.value); setCurrentPage(1); };
  const handleItemsPerPageChange = n => { setItemsPerPage(n);                setCurrentPage(1); };

  const CAT_COLORS = {
    Book:   { bg: "rgba(19,47,69,0.1)",    color: "#132F45" },
    Member: { bg: "rgba(50,102,127,0.12)", color: "#32667F" },
    Borrow: { bg: "rgba(238,162,58,0.13)", color: "#b87a1a" },
    System: { bg: "rgba(234,139,51,0.12)", color: "#c05a0a" },
  };

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>

      {/* Header */}
      <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ borderBottom: "1px solid var(--border-light)" }}>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Admin Audit Trail</h2>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(50,102,127,0.12)", color: "#32667F" }}>
            {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>Last updated: Mar 05, 2026 09:14 AM</span>
      </div>

      {/* Search + Filter */}
      <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}>
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <label htmlFor="search-logs" className="sr-only">Search audit logs</label>
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input id="search-logs" type="text" placeholder="Search transactions, admins, or descriptions..."
            value={searchQuery} onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border outline-none transition-all duration-200"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.12)"; }}
            onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }} />
        </div>
        <div className="relative flex items-center gap-2.5 w-full sm:w-auto">
          <label htmlFor="cat-filter" className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
            <Filter size={14} />
          </label>
          <select id="cat-filter" value={categoryFilter} onChange={handleCategoryChange}
            className="w-full sm:w-auto px-4 py-2.5 text-[12px] font-semibold rounded-xl border outline-none appearance-none cursor-pointer transition-all"
            style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-primary)", paddingRight: "2.5rem" }}
            onFocus={e => { e.target.style.borderColor = "#EEA23A"; e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.12)"; }}
            onBlur={e  => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}>
            {categories.map(cat => <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>)}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[700px]" aria-label="Admin Audit Trail">
          <thead>
            <tr>
              {["Txn ID", "Timestamp", "Admin", "Category", "Description", "Target", "IP Address", "Status"].map(h => (
                <th key={h} scope="col"
                  className="text-left px-3 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                  No audit logs found matching your criteria.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((row) => {
                const cat       = CAT_COLORS[row.category] ?? CAT_COLORS.System;
                const isSuccess = row.status === "Success";
                const rowIndex  = filteredLogs.indexOf(row);
                return (
                  <tr key={row.id}
                    className="transition-all duration-150 hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: rowIndex < filteredLogs.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--text-muted)" }}>{row.id}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{row.timestamp}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: "rgba(50,102,127,0.15)", color: "#32667F" }}>
                          {row.admin.split(" ").map(w => w[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{row.admin}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: cat.bg, color: cat.color }}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: 240 }}>
                      <span className="text-[12px] line-clamp-1" style={{ color: "var(--text-primary)" }}>{row.description}</span>
                    </td>
                    <td className="px-4 py-3" style={{ minWidth: 140 }}>
                      <span className="text-[11px] line-clamp-1" style={{ color: "var(--text-secondary)" }}>{row.target}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{row.ip}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                          color:      isSuccess ? "#16a34a"               : "#dc2626",
                        }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: isSuccess ? "#16a34a" : "#dc2626" }} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredLogs.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredLogs.length}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export default function Dashboard() {
  const [semester, setSemester] = useState("2nd Sem");
  const [month,    setMonth]    = useState("All");

  return (
    <main className="flex flex-col gap-4 lg:gap-5" aria-label="Library Analytics Dashboard">
      <h1 className="sr-only">Analytics Dashboard Overview</h1>

      {/* ── Row 1: KPI Stats ─────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4" aria-label="Key Performance Indicators">
        {STATS.map(stat => (
          <StatsCard key={stat.label} label={stat.label} value={stat.value}
            change={stat.change} accent={stat.accent} percentage={stat.percentage} />
        ))}
      </section>

      {/* ── Filter Bar ───────────────────────────────────────────────────── */}
      <FilterBar
        semester={semester}
        month={month}
        onSemester={setSemester}
        onMonth={setMonth}
      />

      {/* ── Row 2: 4 chart cards in equal columns ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <MostBorrowedBooks semester={semester} month={month} />
        <AttendanceCount   semester={semester} month={month} />
        <TotalFinesCollected semester={semester} month={month} />
        <OverdueBooks      semester={semester} month={month} />
      </div>

      {/* ── Row 3: Audit Trail ───────────────────────────────────────────── */}
      <AdminAuditTrail />
    </main>
  );
}