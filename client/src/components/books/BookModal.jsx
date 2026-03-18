import { X, BookOpen, PenLine, FileSpreadsheet, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BookView from "./BookView";
import BookForm from "./BookForm";
import BookAddImport from "./BookAddImport";

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
  // Ref into BookAddImport so the footer can call startImport/reset
  const importRef = useRef(null);

  // Re-render footer when import step or parsed books change
  const [importStep, setImportStep]       = useState(1);
  const [importParsed, setImportParsed]   = useState([]);
  const [importChecking, setImportChecking] = useState(false);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Reset when modal opens in import mode
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
  const isImport = isAdd && addMode === "import";

  // Read counts from state (set via onStepChange) — not from ref
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 anim-overlay"
      style={{ background: "rgba(10,22,34,0.7)", backdropFilter: "blur(8px)" }}
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
          maxWidth: isView ? "860px" : "720px",
          maxHeight: "90vh",
        }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              {isView   && <BookOpen size={18} />}
              {isEdit   && <PenLine size={18} />}
              {isAdd && addMode === "manual" && <PenLine size={18} />}
              {isImport && <FileSpreadsheet size={18} />}
            </div>
            <h2 id="modal-title" className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {isView   ? "Book Details"
               : isEdit ? "Edit Book"
               : isImport ? "Import from Excel"
               : "Add Book"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-red-50 hover:text-red-600"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 focus:outline-none custom-scrollbar"
          tabIndex="0"
          role="region"
          aria-labelledby="modal-title"
        >
          {isView && <BookView book={book} />}
          {isEdit && <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
          {isAdd && (
            <>
              {addMode === "manual" && <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
              {isImport && (
                <BookAddImport
                  ref={importRef}
                  onStepChange={handleStepChange}
                  {...importProps}
                />
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="flex justify-end gap-3 px-5 py-3 border-t border-border-light shrink-0"
          style={{ background: "var(--bg-subtle, rgba(245,243,240,0.5))" }}
        >
          {/* View mode */}
          {isView && (
            <>
              <button
                onClick={() => onDelete(book)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-red-600 border border-transparent transition-all duration-150 hover:bg-red-50 hover:border-red-300"
              >
                Delete Book
              </button>
              <button
                onClick={() => onEdit(book)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150"
                style={{ background: "var(--accent-amber)" }}
              >
                Edit Book
              </button>
            </>
          )}

          {/* Edit mode */}
          {isEdit && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-150 hover:bg-subtle"
                      style={{ color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={onUpdate} className="px-4 py-2 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150"
                      style={{ background: "var(--accent-amber)" }}>
                Update Book
              </button>
            </>
          )}

          {/* Manual add mode */}
          {isAdd && addMode === "manual" && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-150 hover:bg-subtle"
                      style={{ color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={onSave} className="px-4 py-2 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150"
                      style={{ background: "var(--accent-amber)" }}>
                Save Book
              </button>
            </>
          )}

          {/* Import mode footer — changes per step */}
          {isImport && (
            <>
              {/* Step 1: just a Cancel */}
              {importStep === 1 && (
                <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-150 hover:bg-subtle"
                        style={{ color: "var(--text-secondary)" }}>
                  Cancel
                </button>
              )}

              {/* Step 2: Change File + Import N Books */}
              {importStep === 2 && (
                <>
                  <button
                    onClick={handleImportReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 hover:bg-subtle"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <RefreshCw size={12} /> Change File
                  </button>
                  <button
                    onClick={handleImportClick}
                    disabled={importChecking}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "var(--accent-amber)" }}
                  >
                    {importChecking ? (
                      <><Loader2 size={13} className="animate-spin" /> Checking…</>
                    ) : (
                      <><FileSpreadsheet size={14} />
                        Import {parsed.length} Book{parsed.length !== 1 ? "s" : ""}
                        {totalCopies > 0 && ` (${totalCopies} cop${totalCopies !== 1 ? "ies" : "y"})`}
                      </>
                    )}
                  </button>
                </>
              )}

              {/* Step 3: importing in progress — no buttons */}
              {importStep === 3 && (
                <button disabled className="px-4 py-2 rounded-xl text-[12px] font-bold opacity-40 cursor-not-allowed"
                        style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                  Importing…
                </button>
              )}

              {/* Step 4: done — Import Another + Close */}
              {importStep === 4 && (
                <>
                  <button
                    onClick={handleImportReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1.5px solid var(--border-light)" }}
                  >
                    <RefreshCw size={12} /> Import Another File
                  </button>
                  <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150"
                          style={{ background: "var(--accent-amber)" }}>
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