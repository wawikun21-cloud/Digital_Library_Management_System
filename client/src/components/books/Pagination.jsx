import { ChevronLeft, ChevronRight } from "lucide-react";

function getPageNumbers(current, total) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];

  range.push(1);
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }
  if (total > 1) range.push(total);

  for (let i of range) {
    if (rangeWithDots.length) {
      const last = rangeWithDots[rangeWithDots.length - 1];
      if (i - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (i - last !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
  }
  return rangeWithDots;
}

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
{getPageNumbers(currentPage, totalPages).map(page => {
          if (page === '...') {
            return <span key={page} className="w-8 h-8 flex items-center justify-center text-[12px] text-muted px-1">...</span>;
          }
          return (
            <button
            key={page}
            onClick={() => setCurrentPage(Number(page))}
            aria-label={`Page ${page}`}
            aria-current={currentPage === Number(page) ? "page" : undefined}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[12px] font-medium transition-colors duration-150"
            style={{
              background: currentPage === Number(page) ? "var(--accent-amber)" : "var(--bg-surface)",
              color: currentPage === Number(page) ? "#fff" : "var(--text-secondary)",
              border: currentPage === Number(page) ? "none" : "1px solid var(--border)",
            }}
            >
            {page}
          </button>
          );
        })}
        
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
