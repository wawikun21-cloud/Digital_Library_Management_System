/**
 * features/books/components/BooksEmptyState.jsx
 *
 * Empty catalog state. Extracted from the former pages/Books.jsx.
 */

import { PackageX } from "lucide-react";

export default function BooksEmptyState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 bg-surface rounded-2xl border border-dashed border-border">
      <PackageX size={48} className="text-muted mb-3 opacity-20" />
      <p className="text-sm font-medium text-secondary">No books found matching your criteria.</p>
      <button
        onClick={onClearFilters}
        className="mt-4 text-[13px] font-bold text-amber-600 hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
