import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
} from "recharts";
import { 
  ChevronLeft, ChevronRight, Search, Filter, 
  ChevronsLeft, ChevronsRight, ChevronDown 
} from "lucide-react";
import StatsCard from "../components/StatsCard";

const STATS = [
  { label: "Total Books", value: "1,284", change: "+12 this month", accent: "#132F45", percentage: 85 },
  { label: "Borrowed",    value: "340",   change: "+5 today",        accent: "#EEA23A", percentage: 26 },
  { label: "Returned",    value: "920",   change: "+8 this week",    accent: "#32667F", percentage: 72 },
  { label: "Overdue",     value: "24",    change: "-3 from last week", accent: "#EA8B33", percentage: 2 },
];

const AUDIT_LOGS = [
  {
    id: "TXN-0041",
    timestamp: "Mar 05, 2026 09:14 AM",
    admin: "Admin Jane",
    category: "Book",
    description: 'Added new book "The Staff Engineer\'s Path"',
    target: "The Staff Engineer's Path",
    ip: "192.168.1.10",
    status: "Success",
  },
  {
    id: "TXN-0040",
    timestamp: "Mar 05, 2026 08:52 AM",
    admin: "Admin John",
    category: "Member",
    description: "Deactivated member account — repeated overdue violations",
    target: "David L.",
    ip: "192.168.1.12",
    status: "Success",
  },
  {
    id: "TXN-0039",
    timestamp: "Mar 04, 2026 04:30 PM",
    admin: "Admin Jane",
    category: "Borrow",
    description: "Manually issued book to member at front desk",
    target: "Clean Code → Alice M.",
    ip: "192.168.1.10",
    status: "Success",
  },
  {
    id: "TXN-0038",
    timestamp: "Mar 04, 2026 02:15 PM",
    admin: "Admin John",
    category: "Borrow",
    description: "Fine waived upon member appeal",
    target: "Bob K. — ₱45.00",
    ip: "192.168.1.12",
    status: "Success",
  },
  {
    id: "TXN-0037",
    timestamp: "Mar 04, 2026 11:08 AM",
    admin: "Admin Jane",
    category: "Book",
    description: 'Edited book details — updated copies from 3 to 5',
    target: "Design Patterns",
    ip: "192.168.1.10",
    status: "Success",
  },
  {
    id: "TXN-0036",
    timestamp: "Mar 03, 2026 05:47 PM",
    admin: "Admin John",
    category: "System",
    description: "Exported monthly borrowing report as PDF",
    target: "February 2026 Report",
    ip: "192.168.1.12",
    status: "Success",
  },
  {
    id: "TXN-0035",
    timestamp: "Mar 03, 2026 03:22 PM",
    admin: "Admin Jane",
    category: "Member",
    description: "Reset password for member account",
    target: "Carol T.",
    ip: "192.168.1.10",
    status: "Success",
  },
  {
    id: "TXN-0034",
    timestamp: "Mar 03, 2026 01:05 PM",
    admin: "Admin John",
    category: "Book",
    description: "Marked book as lost — reported by borrower",
    target: "Refactoring",
    ip: "192.168.1.12",
    status: "Success",
  },
  {
    id: "TXN-0033",
    timestamp: "Mar 03, 2026 09:30 AM",
    admin: "Admin Jane",
    category: "System",
    description: "Failed login attempt — incorrect password",
    target: "admin@library.com",
    ip: "203.0.113.45",
    status: "Failed",
  },
  {
    id: "TXN-0032",
    timestamp: "Mar 02, 2026 04:00 PM",
    admin: "Admin John",
    category: "Member",
    description: "Added new member account",
    target: "Emily R.",
    ip: "192.168.1.12",
    status: "Success",
  },
];

const MONTHLY_DATA = [
  { month: "Sep", Borrowed: 48, Returned: 40 },
  { month: "Oct", Borrowed: 62, Returned: 55 },
  { month: "Nov", Borrowed: 53, Returned: 60 },
  { month: "Dec", Borrowed: 70, Returned: 65 },
  { month: "Jan", Borrowed: 58, Returned: 72 },
  { month: "Feb", Borrowed: 75, Returned: 68 },
];

const STATUS_PIE = [
  { name: "Available", value: 920 },
  { name: "Borrowed",  value: 340 },
  { name: "Overdue",   value: 24  },
];
const PIE_COLORS = ["#32667F", "#EEA23A", "#EA8B33"];

const WEEKLY_DATA = [
  { day: "Mon", Borrowed: 12, Returned: 9  },
  { day: "Tue", Borrowed: 18, Returned: 14 },
  { day: "Wed", Borrowed: 10, Returned: 16 },
  { day: "Thu", Borrowed: 22, Returned: 18 },
  { day: "Fri", Borrowed: 15, Returned: 11 },
  { day: "Sat", Borrowed: 8,  Returned: 6  },
  { day: "Sun", Borrowed: 5,  Returned: 4  },
];

const TOP_BOOKS = [
  { title: "Clean Code",               author: "R. Martin",  borrows: 87, color: "#EEA23A" },
  { title: "The Pragmatic Programmer", author: "Hunt & Thomas", borrows: 74, color: "#32667F" },
  { title: "Design Patterns",          author: "GoF",        borrows: 61, color: "#132F45" },
  { title: "Refactoring",              author: "M. Fowler",  borrows: 55, color: "#EA8B33" },
  { title: "You Don't Know JS",        author: "K. Simpson", borrows: 48, color: "#32667F" },
];

const RETURN_RATE = 73; // percentage

const GENRE_DATA = [
  { genre: "Programming",  books: 420 },
  { genre: "Architecture", books: 210 },
  { genre: "Management",   books: 185 },
  { genre: "JavaScript",   books: 162 },
  { genre: "Design",       books: 148 },
  { genre: "Database",     books: 96  },
  { genre: "DevOps",       books: 63  },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-[12px] backdrop-blur-md"
      style={{
        background: "rgba(255, 255, 255, 0.95)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
        color: "var(--text-primary)",
      }}
    >
      {label && (
        <p className="font-bold mb-2 pb-2 border-b border-[var(--border-light)]"
          style={{ color: "var(--text-primary)" }}>
          {label}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map(p => (
          <p key={p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.fill || p.color }} />
              <span style={{ color: "var(--text-secondary)" }}>{p.name}</span>
            </span>
            <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ChartCard({ title, children, icon, className = "" }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col flex-1 transition-all duration-300 hover:shadow-md ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <h2 className="text-[13px] font-bold flex items-center gap-2.5 uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}>
          {icon && <span>{icon}</span>}
          {title}
        </h2>
      </div>
      <div className="px-4 py-6 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

function Badge({ children, type }) {
  const styles = {
    Borrowed: { bg: "rgba(238,162,58,0.15)", color: "#b87a1a" },
    Returned: { bg: "rgba(50,102,127,0.15)", color: "#32667F" },
    Overdue:  { bg: "rgba(234,139,51,0.15)", color: "#c05a0a" },
  };
  const style = styles[type] || styles.Borrowed;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ background: style.bg, color: style.color }}
    >
      {children}
    </span>
  );
}

/* ── Top Borrowed Books ──────────────────────── */
function TopBorrowedBooks() {
  const max = TOP_BOOKS[0].borrows;
  return (
    <ChartCard title="Top Borrowed Books" className="h-full">
      <div className="flex flex-col justify-evenly flex-1 px-1">
        {TOP_BOOKS.map((book, i) => (
          <div key={book.title} className="flex items-center gap-3">
            {/* Rank */}
            <span
              className="text-[11px] font-bold w-5 text-center flex-shrink-0"
              style={{ color: i === 0 ? "#EEA23A" : "var(--text-muted)" }}
            >
              {i + 1}
            </span>
            {/* Info + Bar */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {book.title}
                </span>
                <span className="text-[11px] font-bold ml-2 flex-shrink-0" style={{ color: book.color }}>
                  {book.borrows}x
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-light)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(book.borrows / max) * 100}%`, background: book.color }}
                />
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{book.author}</span>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

/* ── Return Rate Radial Gauge ────────────────── */
function ReturnRateGauge() {
  const rate = RETURN_RATE;
  const radius = 70;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Only use top 180° arc (semicircle)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (rate / 100) * arcLength;

  return (
    <ChartCard title="Return Rate">
      <div className="flex flex-col items-center justify-center gap-2 py-1">
        <div className="relative" style={{ width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background arc */}
            <circle
              cx="80" cy="80" r={normalizedRadius}
              fill="none"
              stroke="var(--border-light)"
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={-(circumference - arcLength) / 2}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
            />
            {/* Value arc */}
            <circle
              cx="80" cy="80" r={normalizedRadius}
              fill="none"
              stroke="#32667F"
              strokeWidth={stroke}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={offset + (circumference - arcLength) / 2}
              strokeLinecap="round"
              transform="rotate(135 80 80)"
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-bold leading-none" style={{ color: "#32667F" }}>{rate}%</span>
            <span className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>of borrowed</span>
          </div>
        </div>
        {/* Legend row */}
        <div className="flex gap-6 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#32667F" }} />
            <span style={{ color: "var(--text-secondary)" }}>Returned <strong style={{ color: "var(--text-primary)" }}>920</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "var(--border-light)" }} />
            <span style={{ color: "var(--text-secondary)" }}>Pending <strong style={{ color: "var(--text-primary)" }}>260</strong></span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

/* ── Pagination Controls ──────────────────────── */
function PaginationControls({ 
  currentPage, 
  totalPages, 
  itemsPerPage, 
  totalItems,
  onPageChange, 
  onItemsPerPageChange 
}) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const pageNumbers = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4" style={{ borderTop: "1px solid var(--border-light)" }}>
      {/* Left side: Items per page and showing text */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="items-per-page" className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>Show</label>
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border outline-none cursor-pointer transition-all hover:border-[var(--accent-amber)]"
            style={{ 
              background: "var(--bg-surface)", 
              borderColor: "var(--border)",
              color: "var(--text-primary)"
            }}
          >
            {[5, 10, 20].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>entries</span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
          Showing <span className="text-[var(--text-primary)] font-bold">{startItem}</span> to <span className="text-[var(--text-primary)] font-bold">{endItem}</span> of <span className="text-[var(--text-primary)] font-bold">{totalItems}</span>
        </span>
      </div>

      {/* Right side: Page navigation */}
      <nav className="flex items-center gap-1.5" aria-label="Pagination">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-[var(--border)]"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => currentPage !== 1 && (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-[var(--border)]"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => currentPage !== 1 && (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page numbers */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              aria-label="Page 1"
              className="min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all duration-150 border border-transparent hover:border-[var(--border)]"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              1
            </button>
            {startPage > 2 && <span className="text-[11px] px-1" style={{ color: "var(--text-muted)" }}>...</span>}
          </>
        )}

        {pageNumbers.map(num => (
          <button
            key={num}
            onClick={() => onPageChange(num)}
            aria-label={`Page ${num}`}
            aria-current={currentPage === num ? "page" : undefined}
            className="min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all duration-200"
            style={{
              background: currentPage === num ? "var(--accent-amber)" : "transparent",
              color: currentPage === num ? "#fff" : "var(--text-primary)",
              boxShadow: currentPage === num ? "0 4px 12px rgba(238,162,58,0.3)" : "none",
            }}
            onMouseEnter={e => currentPage !== num && (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={e => e.currentTarget.style.background = currentPage === num ? "var(--accent-amber)" : "transparent"}
          >
            {num}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-[11px] px-1" style={{ color: "var(--text-muted)" }}>...</span>}
            <button
              onClick={() => onPageChange(totalPages)}
              aria-label={`Page ${totalPages}`}
              className="min-w-[32px] h-8 px-2 rounded-lg text-[11px] font-bold transition-all duration-150 border border-transparent hover:border-[var(--border)]"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-[var(--border)]"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => currentPage !== totalPages && (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <ChevronRight size={16} />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-[var(--border)]"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={e => currentPage !== totalPages && (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <ChevronsRight size={16} />
        </button>
      </nav>
    </div>
  );
}

/* ── Admin Audit Trail with Pagination ────────── */
function AdminAuditTrail() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const categories = ["All", ...new Set(AUDIT_LOGS.map(log => log.category))];

  // Filter logs based on search and category
  const filteredLogs = useMemo(() => {
    return AUDIT_LOGS.filter(log => {
      const matchesSearch = searchQuery === "" || 
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.admin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "All" || log.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, categoryFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, itemsPerPage]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        style={{ borderBottom: "1px solid var(--border-light)" }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Admin Audit Trail
          </h2>
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(50,102,127,0.12)", color: "#32667F" }}
          >
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Last updated: Mar 05, 2026 09:14 AM
        </span>
      </div>

      {/* Search and Filter Bar */}
      <div
        className="px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
        style={{ borderBottom: "1px solid var(--border-light)", background: "var(--bg-subtle)" }}
      >
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <label htmlFor="search-logs" className="sr-only">Search audit logs</label>
          <Search 
            size={14} 
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            id="search-logs"
            type="text"
            placeholder="Search transactions, admins, or descriptions..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 text-[12px] rounded-xl border outline-none transition-all duration-200"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#EEA23A";
              e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        {/* Category Filter */}
        <div className="relative flex items-center gap-2.5">
          <label htmlFor="category-filter" className="text-[12px] font-bold" style={{ color: "var(--text-secondary)" }}>
            <Filter size={14} />
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={handleCategoryChange}
            className="px-4 py-2.5 text-[12px] font-semibold rounded-xl border outline-none appearance-none cursor-pointer transition-all duration-200 hover:border-[var(--accent-amber)]"
            style={{
              background: "var(--bg-surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              paddingRight: "2.5rem",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#EEA23A";
              e.target.style.boxShadow = "0 0 0 3px rgba(238,162,58,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border)";
              e.target.style.boxShadow = "none";
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse" aria-label="Admin Audit Trail">
          <thead>
            <tr>
              {["Txn ID", "Timestamp", "Admin", "Category", "Description", "Target", "IP Address", "Status"].map(h => (
                <th
                  key={h}
                  scope="col"
                  className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border-light)", background: "var(--bg-surface)" }}
                >
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
              paginatedLogs.map((row, i) => {
                const categoryColors = {
                  Book:   { bg: "rgba(19,47,69,0.1)",    color: "#132F45" },
                  Member: { bg: "rgba(50,102,127,0.12)", color: "#32667F" },
                  Borrow: { bg: "rgba(238,162,58,0.13)", color: "#b87a1a" },
                  System: { bg: "rgba(234,139,51,0.12)", color: "#c05a0a" },
                };
                const cat = categoryColors[row.category] || categoryColors.System;
                const isSuccess = row.status === "Success";
                const rowIndex = filteredLogs.indexOf(row);

                return (
                  <tr
                    key={row.id}
                    className="transition-all duration-150 hover:bg-[var(--bg-hover)]"
                    style={{ borderBottom: rowIndex < filteredLogs.length - 1 ? "1px solid var(--border-light)" : "none" }}
                  >
                    {/* Txn ID */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono font-semibold" style={{ color: "var(--text-muted)" }}>
                        {row.id}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {row.timestamp}
                      </span>
                    </td>

                    {/* Admin */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                          style={{ background: "rgba(50,102,127,0.15)", color: "#32667F" }}
                        >
                          {row.admin.split(" ").map(w => w[0]).join("").slice(0,2)}
                        </div>
                        <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                          {row.admin}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: cat.bg, color: cat.color }}
                      >
                        {row.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3" style={{ minWidth: 240 }}>
                      <span className="text-[12px] line-clamp-1" style={{ color: "var(--text-primary)" }}>
                        {row.description}
                      </span>
                    </td>

                    {/* Target */}
                    <td className="px-4 py-3" style={{ minWidth: 140 }}>
                      <span className="text-[11px] line-clamp-1" style={{ color: "var(--text-secondary)" }}>
                        {row.target}
                      </span>
                    </td>

                    {/* IP Address */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {row.ip}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: isSuccess ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                          color: isSuccess ? "#16a34a" : "#dc2626",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ background: isSuccess ? "#16a34a" : "#dc2626" }}
                        />
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

      {/* Pagination */}
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

export default function Dashboard() {
  return (
    <main className="flex flex-col gap-6" aria-label="Library Analytics Dashboard">
      <h1 className="sr-only">Analytics Dashboard Overview</h1>

      {/* ── Row 1: 4 Stats Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Key Performance Indicators">
        {STATS.map(stat => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            accent={stat.accent}
            percentage={stat.percentage}
          />
        ))}
      </section>

      {/* ── Row 2: Monthly (wide 3fr) + Pie (2fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ChartCard title="Monthly Borrowing Trends">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MONTHLY_DATA} barCategoryGap="30%" barGap={4} role="img" aria-label="Monthly borrowing trends chart showing Borrowed vs Returned books">
                <CartesianGrid vertical={false} stroke="var(--border-light)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", paddingTop: 12 }} />
                <Bar dataKey="Borrowed" fill="#EEA23A" radius={[4, 4, 0, 0]} name="Borrowed Books" />
                <Bar dataKey="Returned" fill="#32667F" radius={[4, 4, 0, 0]} name="Returned Books" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Book Status Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart role="img" aria-label="Book status distribution chart: Available, Borrowed, and Overdue">
                <Pie data={STATUS_PIE} cx="50%" cy="45%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                  {STATUS_PIE.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 3: Genre (2fr) + Weekly Area (3fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ChartCard title="Books by Genre">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={GENRE_DATA} layout="vertical" barCategoryGap="25%" role="img" aria-label="Books distribution by genre bar chart">
                <CartesianGrid horizontal={false} stroke="var(--border-light)" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="genre" tick={{ fontSize: 10, fill: "var(--text-primary)", fontWeight: 700 }} axisLine={false} tickLine={false} width={82} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-hover)", opacity: 0.4 }} />
                <Bar dataKey="books" fill="#132F45" radius={[0, 4, 4, 0]} name="Books Count" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-3">
          <ChartCard title="Weekly Activity">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY_DATA} role="img" aria-label="Weekly borrowing activity area chart">
                <defs>
                  <linearGradient id="gradBorrowed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EEA23A" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EEA23A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradReturned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#32667F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#32667F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)", fontWeight: 600 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)", strokeWidth: 1.5 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", paddingTop: 12 }} />
                <Area type="monotone" dataKey="Borrowed" stroke="#EEA23A" strokeWidth={2.5} fill="url(#gradBorrowed)" dot={{ r: 3, fill: "#EEA23A" }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="Returned" stroke="#32667F" strokeWidth={2.5} fill="url(#gradReturned)" dot={{ r: 3, fill: "#32667F" }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* ── Row 4: Top Borrowed Books (3fr) + Return Rate Gauge (2fr) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-stretch">
        <div className="lg:col-span-3 flex flex-col">
          <TopBorrowedBooks />
        </div>
        <div className="lg:col-span-2 flex flex-col">
          <ReturnRateGauge />
        </div>
      </div>

      {/* ── Row 5: Admin Audit Trail full width ── */}
      <AdminAuditTrail />

    </main>
  );
}