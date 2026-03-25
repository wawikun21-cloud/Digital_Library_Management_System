import { ChevronDown, X, SlidersHorizontal, PenLine, FileSpreadsheet, Search, Globe } from "lucide-react";
import { useRef } from "react";

const ALL_MODES = [
  { mode: "manual",  Icon: PenLine,         label: "Add Manually" },
  { mode: "import",  Icon: FileSpreadsheet, label: "Import from Excel" },
  { mode: "lexora",  Icon: Globe,           label: "Import Lexora Excel" },
];

export default function BookToolbar({ 
  query, 
  setQuery, 
  genreFilter, 
  setGenreFilter, 
  genres, 
  sortBy, 
  setSortBy, 
  ddOpen, 
  setDdOpen, 
  openModal,
  // Pass an array of mode strings to restrict which items appear.
  // Defaults to all three if omitted.
  importModes,
}) {
  const visibleModes = importModes
    ? ALL_MODES.filter(m => importModes.includes(m.mode))
    : ALL_MODES;
  const ddRef = useRef(null);

  return (
    <div className="flex flex-wrap items-center gap-2.5 justify-between">
      {/* Left: search + genre + sort */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">

        {/* Search input */}
        <div
          className="relative flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px] max-w-sm"
          style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}
        >
          <Search size={14} className="shrink-0" style={{ color:"var(--text-secondary)" }} aria-hidden="true" />
          <input
            className="border-none outline-none text-[13px] bg-transparent w-full"
            style={{ color:"var(--text-primary)" }}
            placeholder="Search title, author, genre, ISBN…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search books"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 flex items-center justify-center w-4 h-4 rounded-full transition-colors duration-100"
              style={{ color:"var(--text-muted)" }}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Genre filter */}
        <div className="relative flex items-center">
          <label htmlFor="genre-filter" className="sr-only">Filter by Genre</label>
          <SlidersHorizontal
            size={13}
            className="absolute left-2.5 pointer-events-none"
            style={{ color:"var(--text-secondary)" }}
            aria-hidden="true"
          />
          <select
            id="genre-filter"
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="pl-7 pr-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer transition-colors duration-150"
            style={{
              background:  "var(--bg-surface)",
              border:      "1px solid var(--border)",
              color:       genreFilter ? "var(--accent-amber)" : "var(--text-secondary)",
              boxShadow:   "var(--shadow-sm)",
              fontFamily:  "inherit",
            }}
          >
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        {/* Sort */}
        <div className="relative flex items-center">
          <label htmlFor="sort-by" className="sr-only">Sort Books</label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg text-[12.5px] font-medium border outline-none appearance-none cursor-pointer transition-colors duration-150"
            style={{
              background: "var(--bg-surface)",
              border:     "1px solid var(--border)",
              color:      sortBy ? "var(--accent-amber)" : "var(--text-secondary)",
              boxShadow:  "var(--shadow-sm)",
              fontFamily: "inherit",
            }}
          >
            <option value="">Sort: Default</option>
            <option value="title">Title A–Z</option>
            <option value="author">Author A–Z</option>
            <option value="year">Newest First</option>
          </select>
        </div>
      </div>

      {/* Add Book dropdown */}
      <div className="relative shrink-0" ref={ddRef}>
        <button
          onClick={() => setDdOpen(o => !o)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold text-white transition-colors duration-150"
          style={{ background:"var(--accent-amber)", boxShadow:"0 2px 6px rgba(238,162,58,0.3)" }}
          aria-expanded={ddOpen}
          aria-haspopup="menu"
        >
          + Add Book
          <ChevronDown
            size={14}
            className="transition-transform duration-200"
            style={{ transform: ddOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {ddOpen && (
          <div
            className="anim-drop absolute right-0 top-[calc(100%+6px)] w-48 rounded-xl p-1.5 z-20"
            style={{ background:"var(--bg-surface)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)" }}
            role="menu"
          >
{visibleModes.map(({ mode, Icon, label }) => (
              <button
                key={mode}
                onClick={() => openModal(mode)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-100 hover:bg-amber-50 hover:text-amber-600"
                style={{ color:"var(--text-primary)" }}
                role="menuitem"
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}