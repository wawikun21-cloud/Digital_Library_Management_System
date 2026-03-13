import { BookOpen } from "lucide-react";

export default function BookView({ book }) {
  const isOutOfStock = book.quantity === 0 || book.status === "OutOfStock";

  return (
    <div className="flex flex-col gap-5">
      {/* Cover */}
      <div className="flex items-start gap-5">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-32 h-44 object-cover rounded-lg shrink-0"
            style={{ boxShadow:"var(--shadow-md)" }}
          />
        ) : (
          <div
            className="w-32 h-44 rounded-lg shrink-0 flex items-center justify-center"
            style={{ background:"var(--bg-subtle)", border:"1px solid var(--border)" }}
          >
            <BookOpen size={32} style={{ color:"var(--text-muted)" }} />
          </div>
        )}
        <div className="flex flex-col gap-2 flex-1">
          <div>
            <h3 className="text-lg font-bold" style={{ color:"var(--text-primary)" }}>{book.title}</h3>
            <p className="text-sm" style={{ color:"var(--text-secondary)" }}>{book.author}</p>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <DetailItem label="Accession No." value={book.accessionNumber} />
        <DetailItem label="Subtitle" value={book.subtitle} />
        <DetailItem label="ISBN" value={book.isbn} />
        <DetailItem label="Author" value={book.author} />
        <DetailItem label="Year" value={book.year} />
        <DetailItem label="Genre" value={book.genre} />
        <DetailItem label="Publisher" value={book.publisher} />
        <DetailItem label="Quantity" value={book.quantity} />
        <DetailItem label="Availability" value={isOutOfStock ? "Out of Stock" : "In Stock"} />
      </div>

      {/* Library Catalog Information */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
          Library Catalog Information
        </label>
        <div className="grid grid-cols-2 gap-4">
          <DetailItem label="Call Number" value={book.callNumber} />
          <DetailItem label="Edition" value={book.edition} />
          <DetailItem label="Volume" value={book.volume} />
          <DetailItem label="Size" value={book.size} />
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
            Description
          </label>
          <p className="text-sm leading-relaxed" style={{ color:"var(--text-primary)" }}>{book.description}</p>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-muted)" }}>
        {label}
      </label>
      <span className="text-[13px]" style={{ color:"var(--text-primary)" }}>
        {value || "—"}
      </span>
    </div>
  );
}
