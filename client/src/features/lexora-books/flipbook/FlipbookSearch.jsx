import { useState, useCallback } from "react"

export default function FlipbookSearch({ onSearch, onNavigate, onClose }) {
  const [query, setQuery]           = useState("")
  const [results, setResults]       = useState([])
  const [searching, setSearching]   = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setHasSearched(true)
    try {
      const r = await onSearch(query)
      setResults(r)
    } catch {
      setResults([])
    }
    setSearching(false)
  }, [query, onSearch])

  return (
    <div className="absolute right-0 top-0 z-40 h-full w-80 border-l border-white/10 bg-[var(--flipbook-panel-bg,rgba(8,18,29,0.88))] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-sm font-semibold" style={{ color: "var(--flipbook-text-primary)" }}>Search</span>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: "rgba(255,255,255,0.5)" }}
          onMouseEnter={(e) => { e.target.style.background = "rgba(255,255,255,0.1)"; e.target.style.color = "#fff" }}
          onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "rgba(255,255,255,0.5)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="border-b border-white/10 p-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch() }}
          className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in document…"
            className="h-9 flex-1 rounded-lg bg-white/10 px-3 text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-white/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="h-9 rounded-lg bg-white/15 px-3 text-xs font-medium text-white hover:bg-white/25 disabled:opacity-40"
          >
            {searching ? "…" : "Go"}
          </button>
        </form>
      </div>

      <div className="overflow-y-auto styled-scroll" style={{ maxHeight: "calc(100% - 110px)" }}>
        {searching && (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--flipbook-text-muted)" }}>
            No results found
          </div>
        )}

        {!searching && results.map((result, index) => (
          <button
            key={index}
            onClick={() => { onNavigate(result.pageIndex); onClose() }}
            className="w-full border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">
                Page {result.pageIndex + 1}
              </span>
            </div>
            <p className="line-clamp-3 text-xs leading-relaxed text-white/50">
              {result.text}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
