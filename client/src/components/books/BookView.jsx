import { BookOpen, Hash, Calendar, Tag, Package, Ruler, Layers, User, Building2, CheckCircle, MapPin, Info, Fingerprint } from "lucide-react";

export default function BookView({ book }) {
  const isOutOfStock = book.quantity === 0 || book.status === "OutOfStock";

  const groups = [
    {
      title: "Identifiers",
      icon: Fingerprint,
      fields: [
        { label: "Accession No.", value: book.accessionNumber, icon: Hash, highlight: true },
        { label: "ISBN", value: book.isbn, icon: Hash },
        { label: "ISSN", value: book.issn, icon: Hash },
        { label: "LCCN", value: book.lccn, icon: Hash },
        { label: "Call Number", value: book.callNumber, icon: Hash },
      ]
    },
    {
      title: "Publication & Authors",
      icon: User,
      fields: [
        { label: "Authors", value: book.authors, icon: User, color: "text-indigo-600" },
        { label: "Publisher", value: book.publisher, icon: Building2 },
        { label: "Date", value: book.date, icon: Calendar },
        { label: "Place", value: book.place, icon: MapPin },
        { label: "Author Name", value: book.authorName, icon: User },
        { label: "Author Dates", value: book.authorDates, icon: Calendar },
      ]
    },
    {
      title: "Material & Physical",
      icon: Ruler,
      fields: [
        { label: "Material Type", value: book.materialType, icon: Tag },
        { label: "Subtype", value: book.subtype, icon: Tag },
        { label: "Edition", value: book.edition, icon: CheckCircle },
        { label: "Extent", value: book.extent, icon: Ruler },
        { label: "Size", value: book.size, icon: Ruler },
        { label: "Volume", value: book.volume, icon: Layers },
      ]
    },
    {
      title: "Inventory",
      icon: Package,
      fields: [
        { label: "Quantity", value: book.quantity, icon: Package, badge: isOutOfStock ? "Out of Stock" : "Available" },
        { label: "Genre", value: book.genre, icon: Tag, color: "text-green-600" },
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Hero Section */}
      <div className="flex items-start gap-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/5 to-amber-600/10 border border-amber-500/20">
        <div className="w-24 h-32 shrink-0 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/10 border border-white/20"
             style={{ background: "linear-gradient(135deg, var(--accent-amber), var(--accent-orange))" }}>
          <BookOpen size={40} className="text-white drop-shadow-md" />
        </div>
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/10">
              {book.materialType || "Book"}
            </span>
            {isOutOfStock && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                Out of Stock
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-primary truncate mb-1" style={{ color: "var(--text-primary)" }}>
            {book.title}
          </h1>
          {book.subtitle && (
            <p className="text-sm font-medium text-secondary truncate mb-2" style={{ color: "var(--text-secondary)" }}>
              {book.subtitle}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted" style={{ color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1.5 font-medium">
              <User size={14} className="opacity-70" /> {book.author || book.authors || "Unknown Author"}
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar size={14} className="opacity-70" /> {book.date || book.year || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group, idx) => (
          <div key={idx} className="flex flex-col gap-3 p-5 rounded-2xl bg-surface border border-border-light shadow-sm hover:shadow-md transition-shadow duration-200"
               style={{ background: "var(--bg-surface)" }}>
            <div className="flex items-center gap-2 pb-1 border-b border-border-light/50 mb-1">
              <group.icon size={14} className="text-amber-600 opacity-80" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted" style={{ color: "var(--text-muted)" }}>
                {group.title}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {group.fields.map((field, fIdx) => (
                <div key={fIdx} className={`flex flex-col gap-0.5 ${field.highlight ? 'col-span-full bg-amber-50/50 p-2 rounded-lg border border-amber-100/50' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <field.icon size={11} className={`${field.color} opacity-70`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      {field.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[13px] font-semibold truncate ${field.highlight ? 'text-amber-700' : 'text-primary'}`} style={{ color: field.highlight ? undefined : "var(--text-primary)" }}>
                      {field.value || "—"}
                    </span>
                    {field.badge && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter"
                            style={{ 
                              background: field.badge === "Available" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                              color: field.badge === "Available" ? "#166534" : "#991b1b"
                            }}>
                        {field.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Description / Other Details */}
      {(book.description || book.otherDetails) && (
        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-subtle border border-border shadow-sm">
          <div className="flex items-center gap-2 pb-1 border-b border-border-light/50">
            <Info size={14} className="text-amber-600 opacity-80" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted" style={{ color: "var(--text-muted)" }}>
              Description & Additional Info
            </h3>
          </div>
          <div className="flex flex-col gap-4">
            {book.description && (
              <p className="text-[13px] leading-relaxed text-secondary whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {book.description}
              </p>
            )}
            {book.otherDetails && (
              <div className="p-3 rounded-lg bg-surface border border-border-light text-[12px] italic text-muted" style={{ color: "var(--text-muted)" }}>
                {book.otherDetails}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

