import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ currentPage, totalPages, setCurrentPage }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 py-2">
      <p className="text-[12px]" style={{ color:"var(--text-muted)" }}>
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-1" role="navigation" aria-label="Pagination Navigation">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          aria-label="Previous Page"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-500"
          style={{ background:"var(--bg-surface)", border:"1px solid var(--border)" }}
        >
          <ChevronLeft size={16} style={{ color: currentPage === 1 ? "var(--text-muted)" : "var(--text-secondary)" }} />
        </button>
        
        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[12px] font-medium transition-colors duration-150"
            style={{
              background: currentPage === page ? "var(--accent-amber)" : "var(--bg-surface)",
              color: currentPage === page ? "#fff" : "var(--text-secondary)",
              border: currentPage === page ? "none" : "1px solid var(--border)",
            }}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          aria-label="Next Page"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:border-amber-500"
          style={{ background:"var(--bg-surface)", border:"1px solid var(--border)" }}
        >
          <ChevronRight size={16} style={{ color: currentPage === totalPages ? "var(--text-muted)" : "var(--text-secondary)" }} />
        </button>
      </div>
    </div>
  );
}
