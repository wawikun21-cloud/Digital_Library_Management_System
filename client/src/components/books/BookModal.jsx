import { X, BookOpen, PenLine, FileSpreadsheet, RefreshCw, Loader2, MapPin, Hash, BookMarked, Calendar, Layers, Building2, FileText, Tag, Library } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BookView from "./BookView";
import BookForm from "./BookForm";
import BookAddImport from "./BookAddImport";

// ── Inline detail field used in the updated View header ──
function DetailChip({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
         style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
      <Icon size={12} style={{ color: "var(--text-muted)" }} />
      <span style={{ color: "var(--text-muted)" }} className="font-medium">{label}:</span>
      <span style={{ color: "var(--text-primary)" }} className="font-semibold">{value}</span>
    </div>
  );
}

// ── Inline Book View Panel (replaces the separate BookView for modal) ──
function BookViewPanel({ book, onEdit, onDelete }) {
  if (!book) return null;

  const statusColors = {
    Available:  { bg: "rgba(34,197,94,0.1)",  text: "#16a34a", dot: "#22c55e" },
    Borrowed:   { bg: "rgba(249,115,22,0.1)", text: "#ea580c", dot: "#f97316" },
    OutOfStock: { bg: "rgba(239,68,68,0.1)",  text: "#dc2626", dot: "#ef4444" },
  };
  const sc = statusColors[book.status] || statusColors.Available;

  const InfoRow = ({ label, value, full = false }) => {
    if (!value && value !== 0) return null;
    return (
      <div className={`flex flex-col gap-0.5 ${full ? "col-span-2" : ""}`}>
        <span className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{value}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Title block ── */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[20px] font-bold leading-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif, serif)" }}>
          {book.title}
        </h2>
        {(book.subtitle) && (
          <p className="text-[13px] italic" style={{ color: "var(--text-secondary)" }}>{book.subtitle}</p>
        )}
        {(book.author || book.authors) && (
          <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
            by <span className="font-semibold">{book.author || book.authors}</span>
          </p>
        )}
      </div>

      {/* ── Status + Location chips ── */}
      <div className="flex flex-wrap gap-2">
        {/* Status badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
             style={{ background: sc.bg, color: sc.text }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
          {book.status || "Available"}
        </div>

        {book.shelf && (
          <DetailChip icon={Library} label="Shelf" value={book.shelf} />
        )}
        {book.sublocation && (
          <DetailChip icon={MapPin} label="Sublocation" value={book.sublocation} />
        )}
        {(book.total_copies || book.quantity) && (
          <DetailChip icon={Layers} label="Copies" value={`${book.available_copies ?? book.quantity ?? 0} / ${book.total_copies || book.quantity}`} />
        )}
      </div>

      {/* ── Title Information ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600/80">Title Information</h3>
          <div className="flex-1 h-px bg-border-light" />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <InfoRow label="Call No."      value={book.callNumber} />
          <InfoRow label="Accession No." value={book.accessionNumber || book.accession_list} />
          <InfoRow label="Edition"       value={book.edition} />
          <InfoRow label="Volume"        value={book.volume} />
        </div>
      </div>

      {/* ── Standard Numbers ── */}
      {(book.isbn || book.issn || book.lccn) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600/80">Standard Numbers</h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="ISBN"  value={book.isbn} />
            <InfoRow label="ISSN"  value={book.issn} />
            <InfoRow label="LCCN"  value={book.lccn} />
          </div>
        </div>
      )}

      {/* ── Publication Information ── */}
      {(book.publisher || book.place || book.year || book.date) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600/80">Publication</h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Publisher" value={book.publisher} />
            <InfoRow label="Place"     value={book.place} />
            <InfoRow label="Year"      value={book.year || book.date} />
          </div>
        </div>
      )}

      {/* ── Physical Description ── */}
      {(book.pages || book.extent || book.size || book.otherDetails) && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600/80">Physical Description</h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <InfoRow label="Pages"       value={book.pages} />
            <InfoRow label="Extent"      value={book.extent} />
            <InfoRow label="Size"        value={book.size} />
            <InfoRow label="Other Details" value={book.otherDetails} full />
          </div>
        </div>
      )}

      {/* ── Description ── */}
      {book.description && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-amber-600/80">Description</h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {book.description}
          </p>
        </div>
      )}

    </div>
  );
}

export default function BookModal({
  isOpen, onClose,
  mode,       // "view" | "edit" | "add"
  addMode,    // "manual" | "import"
  book,
  form, setForm,
  errors, setErrors,
  onSave, onUpdate, onDelete, onEdit,
  importProps
}) {
  const importRef = useRef(null);

  const [importStep, setImportStep]       = useState(1);
  const [importParsed, setImportParsed]   = useState([]);
  const [importChecking, setImportChecking] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isOpen && addMode === "import") {
      setImportStep(1);
      setImportParsed([]);
      setImportChecking(false);
    }
  }, [isOpen, addMode]);

  if (!isOpen) return null;

  const isView   = mode === "view";
  const isEdit   = mode === "edit";
  const isAdd    = mode === "add";
  const isImport = isAdd && (addMode === "import" || addMode === "lexora");

  const parsed      = importParsed;
  const totalCopies = parsed.reduce((s, b) => s + (b.accessionNumbers?.length ?? 0), 0);

  const handleImportClick = async () => {
    setImportChecking(true);
    try {
      await importRef.current?.startImport();
    } finally {
      setImportChecking(false);
    }
  };

  const handleImportReset = () => {
    importRef.current?.reset();
    setImportStep(1);
    setImportParsed([]);
    setImportChecking(false);
  };

  const handleStepChange = (s, books) => {
    setImportStep(s);
    if (books) setImportParsed(books);
  };

  // Modal width: view is wider to show the detail panel nicely
  const maxWidth = isView ? "880px" : "740px";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 anim-overlay"
      style={{ background: "rgba(10,22,34,0.72)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="flex flex-col rounded-2xl overflow-hidden anim-modal shadow-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1.5px solid var(--border)",
          width: "100%",
          maxWidth,
          maxHeight: "92vh",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1.5px solid var(--border-light)" }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl"
                 style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
              {isView   && <BookOpen size={17} />}
              {isEdit   && <PenLine size={17} />}
              {isAdd && addMode === "manual" && <PenLine size={17} />}
              {isImport && <FileSpreadsheet size={17} />}
            </div>
            <div>
              <h2 id="modal-title" className="text-[14px] font-bold tracking-tight leading-none"
                  style={{ color: "var(--text-primary)" }}>
                {isView   ? "Book Details"
                 : isEdit ? "Edit Book"
                : addMode === "lexora" ? "Import Lexora Excel"
                 : isImport ? "Import from Excel"
                 : "Add New Book"}
              </h2>
              {isView && book?.title && (
                <p className="text-[11px] mt-0.5 truncate max-w-[420px]"
                   style={{ color: "var(--text-muted)" }}>
                  {book.title}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-red-50 hover:text-red-500"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-5 focus:outline-none custom-scrollbar"
          tabIndex="0"
          role="region"
          aria-labelledby="modal-title"
        >
          {/* View mode — use our improved inline panel */}
          {isView && <BookViewPanel book={book} />}

          {/* Edit mode */}
          {isEdit && (
            <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
          )}

          {/* Add mode */}
          {isAdd && (
            <>
              {addMode === "manual" && (
                <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
              )}
              {(addMode === "import" || addMode === "lexora") && (
                <BookAddImport
                  ref={importRef}
                  mode={addMode}
                  onStepChange={handleStepChange}
                  {...importProps}
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex justify-end gap-2.5 px-5 py-3 border-t shrink-0"
          style={{
            borderColor: "var(--border-light)",
            background: "var(--bg-subtle, rgba(245,243,240,0.5))",
          }}
        >
          {/* View mode */}
          {isView && (
            <>
              <button
                onClick={() => onDelete(book)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-red-600 border border-transparent transition-all duration-150 hover:bg-red-50 hover:border-red-200"
              >
                Delete
              </button>
              <button
                onClick={() => onEdit(book)}
                className="px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 hover:brightness-110"
                style={{ background: "var(--accent-amber)" }}
              >
                Edit Book
              </button>
            </>
          )}

          {/* Edit mode */}
          {isEdit && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}
              >
                Cancel
              </button>
              <button
                onClick={onUpdate}
                className="px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 hover:brightness-110"
                style={{ background: "var(--accent-amber)" }}
              >
                Update Book
              </button>
            </>
          )}

          {/* Manual add mode */}
          {isAdd && addMode === "manual" && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 hover:brightness-110"
                style={{ background: "var(--accent-amber)" }}
              >
                Save Book
              </button>
            </>
          )}

          {/* Import mode footer */}
          {isImport && (
            <>
              {importStep === 1 && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                  style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}
                >
                  Cancel
                </button>
              )}

              {importStep === 2 && (
                <>
                  <button
                    onClick={handleImportReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                    style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}
                  >
                    <RefreshCw size={12} /> Change File
                  </button>
                  <button
                    onClick={handleImportClick}
                    disabled={importChecking}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110"
                    style={{ background: "var(--accent-amber)" }}
                  >
                    {importChecking ? (
                      <><Loader2 size={13} className="animate-spin" /> Checking…</>
                    ) : (
                      <><FileSpreadsheet size={13} />
                        Import {parsed.length} Book{parsed.length !== 1 ? "s" : ""}
                        {totalCopies > 0 && ` (${totalCopies} cop${totalCopies !== 1 ? "ies" : "y"})`}
                      </>
                    )}
                  </button>
                </>
              )}

              {importStep === 3 && (
                <button disabled
                        className="px-4 py-2 rounded-xl text-[12px] font-bold opacity-40 cursor-not-allowed"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                  Importing…
                </button>
              )}

              {importStep === 4 && (
                <>
                  <button
                    onClick={handleImportReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1.5px solid var(--border-light)" }}
                  >
                    <RefreshCw size={12} /> Import Another File
                  </button>
                  <button
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 hover:brightness-110"
                    style={{ background: "var(--accent-amber)" }}
                  >
                    Done
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}