export default function BookTable({ 
  books, 
  onView, 
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] shadow-sm">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <caption className="sr-only">List of books in the library with details like accession number, title, author, and status</caption>
        <thead>
          <tr style={{ background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border)" }}>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ 
              color: "var(--text-muted)", 
              minWidth: "60px"
            }}>Accession No.</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ 
              color: "var(--text-muted)", 
              minWidth: "180px"
            }}>Title</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "100px" }}>Author</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "100px" }}>ISBN</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "60px" }}>Year</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "80px" }}>Genre</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)", minWidth: "60px" }}>Qty</th>
            <th scope="col" className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ 
              color: "var(--text-muted)", 
              minWidth: "80px"
            }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {books.map((book, idx) => {
            // Use display_status (derived from book_copies) when available.
            // Falls back to raw status/quantity for books without copy records.
            const effectiveStatus = book.display_status || book.status;
            const availCopies = book.available_copies;
            const isOutOfStock =
              effectiveStatus === "OutOfStock" ||
              (availCopies !== undefined && availCopies !== null
                ? Number(availCopies) === 0
                : book.quantity === 0);
            // Show available / total  (e.g. "2 / 3"), or just quantity if no copies table
            const qtyLabel = book.total_copies
              ? `${availCopies ?? 0} / ${book.total_copies}`
              : (book.quantity ?? 0);
            return (
              <tr 
                key={book.id} 
                className="border-b transition-colors duration-150 cursor-pointer group hover:bg-[var(--bg-hover)]"
                style={{ 
                  borderColor: "var(--border-light)",
                  background: idx % 2 === 0 ? "var(--bg-surface)" : "rgba(0,0,0,0.01)",
                }}
                onClick={() => onView(book)}
                tabIndex="0"
                onKeyDown={(e) => e.key === 'Enter' && onView(book)}
                aria-label={`View details for ${book.title}`}
              >
                <td className="px-3 py-3.5">
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                    {book.accessionNumber || book.accession_no || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <p className="text-[13px] font-semibold truncate max-w-[180px] group-hover:text-[var(--accent-amber)] transition-colors" style={{ color: "var(--text-primary)" }}>
                    {book.title || "—"}
                  </p>
                </td>
                <td className="px-3 py-3.5">
                  <span className="text-[12px] block max-w-[100px] truncate" style={{ color: "var(--text-primary)" }}>
                    {book.author || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span 
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-block"
                    style={{ 
                      background: "var(--bg-subtle)", 
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)"
                    }}
                  >
                    {book.isbn || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {book.year || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span 
                    className="text-[10px] font-bold px-2 py-1 rounded-md"
                    style={{ 
                      background: "var(--bg-subtle)", 
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-light)",
                    }}
                  >
                    {book.genre || book.category || "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className="text-[13px] font-bold"
                    style={{ color: isOutOfStock ? "var(--status-red)" : "var(--text-primary)" }}
                  >
                    {qtyLabel}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span 
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                    style={{ 
                      background: isOutOfStock ? "rgba(204,31,31,0.1)" : "rgba(36,97,57,0.1)", 
                      color: isOutOfStock ? "var(--status-red)" : "var(--status-green)",
                    }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-[#cc1f1f]' : 'bg-[#246139]'}`} />
                    {isOutOfStock ? "Out of Stock" : "Available"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}