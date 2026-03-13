import { Search, Loader2, AlertCircle, BookOpen } from "lucide-react";

export default function BookAddLookup({
  lookupTitle, setLookupTitle,
  lookupAuthor, setLookupAuthor,
  lookupLoading, lookupError,
  handleLookup,
  groupedResults,
  applyLookupResult,
  showEditions, setShowEditions,
  editions, editionsLoading,
  applyEdition,
  lookupDone
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Instruction banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background:"rgba(184,122,0,0.08)", border:"1.5px solid rgba(184,122,0,0.2)" }}
      >
        <BookOpen size={18} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:1 }} />
        <div>
          <p className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>
            Search by Title / Author
          </p>
          <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
            Enter a title and optional author name. Pick a result to auto-fill all fields instantly.
          </p>
        </div>
      </div>

      {/* Inputs + button */}
      <div className="flex flex-col gap-2">
        <input
          className="w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500"
          style={{ background:"var(--bg-input)", color:"var(--text-primary)", borderColor:lookupError && !lookupTitle.trim() ? "#cc1f1f" : "var(--border)" }}
          placeholder="Book title (e.g. Computing Essentials)"
          value={lookupTitle}
          onChange={e => setLookupTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLookup()}
          aria-label="Book title for search"
        />
        <input
          className="w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500"
          style={{ background:"var(--bg-input)", color:"var(--text-primary)", borderColor:"var(--border)" }}
          placeholder="Author name (optional)"
          value={lookupAuthor}
          onChange={e => setLookupAuthor(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLookup()}
          aria-label="Author name for search"
        />
        <button
          onClick={handleLookup}
          disabled={lookupLoading}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
          style={{
            background: lookupLoading ? "var(--bg-subtle)" : "var(--accent-amber)",
            color:      lookupLoading ? "var(--text-muted)" : "#fff",
            cursor:     lookupLoading ? "not-allowed" : "pointer",
          }}
        >
          {lookupLoading
            ? <><Loader2 size={15} className="animate-spin" /> Searching…</>
            : <><Search size={15} /> Search Books</>}
        </button>
      </div>

      {/* Error */}
      {lookupError && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px]"
          style={{ background:"rgba(204,31,31,0.08)", border:"1px solid rgba(204,31,31,0.25)", color:"#cc1f1f" }}>
          <AlertCircle size={14} style={{ flexShrink:0 }} />
          {lookupError}
        </div>
      )}

      {/* Results list */}
      {lookupDone && (
        <div className="flex flex-col gap-4 mt-2">
          {Object.entries(groupedResults).map(([source, results]) => (
            results?.length > 0 && (
              <div key={source} className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-2" 
                   style={{ color: source === "Open Library" ? "var(--accent-amber)" : "#32667F" }}>
                  <span>{source === "Open Library" ? "📚" : source === "Google Books" ? "📖" : "🌐"}</span> 
                  {source} ({results.length})
                </p>
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {results.map((r, i) => (
                    <button
                      key={`${source}-${i}`}
                      onClick={() => applyLookupResult(r)}
                      className="flex items-start gap-3 p-3 rounded-xl text-left w-full transition-all duration-150 border-[1.5px] border-transparent hover:border-amber-500 hover:bg-amber-50/10"
                      style={{ background:"var(--bg-subtle)", border:"1.5px solid var(--border)" }}
                    >
                      <div className="w-10 h-14 rounded shrink-0 overflow-hidden flex items-center justify-center bg-input border border-border">
                          <BookOpen size={16} style={{ color:"var(--text-muted)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-snug truncate" style={{ color:"var(--text-primary)" }}>{r.title}</p>
                        {r.author && <p className="text-[11.5px] truncate mt-0.5" style={{ color:"var(--text-secondary)" }}>{r.author}</p>}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {r.year && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-600">{r.year}</span>}
                          {r.publisher && <span className="text-[10px] truncate max-w-[120px]" style={{ color:"var(--text-muted)" }}>{r.publisher}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Editions */}
      {showEditions && editions.length > 0 && (
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
              📚 Different Editions ({editions.length})
            </p>
            <button onClick={() => setShowEditions(false)} className="text-[10px] text-muted-foreground hover:underline">Hide</button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-0.5 custom-scrollbar">
            {editions.map((ed, i) => (
              <button
                key={i}
                onClick={() => applyEdition(ed)}
                className="flex items-start gap-3 p-2.5 rounded-lg text-left w-full transition-all duration-150 border border-transparent hover:border-amber-500 bg-subtle"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{ed.publisher || "Unknown Publisher"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{ed.year || "N/A"}</span>
                    {ed.isbn && <span className="text-[10px] text-muted-foreground font-mono">ISBN: {ed.isbn}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {editionsLoading && (
        <div className="flex items-center gap-2 py-2">
          <Loader2 size={14} className="animate-spin text-teal-600" />
          <span className="text-[11px] text-teal-600">Checking for more editions...</span>
        </div>
      )}
    </div>
  );
}
