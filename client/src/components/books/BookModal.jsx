import { X, BookOpen, PenLine, FileSpreadsheet } from "lucide-react";
import { useEffect } from "react";
import BookView from "./BookView";
import BookForm from "./BookForm";
import BookAddImport from "./BookAddImport";

export default function BookModal({
  isOpen, onClose,
  mode, // "view", "edit", "add"
  addMode, // "manual", "import"
  book, // selected book for view/edit
  form, setForm,
  errors, setErrors,
  onSave, onUpdate, onDelete, onEdit,
  // Import props
  importProps
}) {
  // ESC to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isAdd  = mode === "add";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 anim-overlay"
      style={{ background:"rgba(10,22,34,0.7)", backdropFilter:"blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[640px] max-h-[90vh] flex flex-col rounded-2xl overflow-hidden anim-modal shadow-2xl"
        style={{ background:"var(--bg-surface)", border:"1.5px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              {isView && <BookOpen size={20} />}
              {isEdit && <PenLine size={20} />}
              {isAdd && addMode === "manual" && <PenLine size={20} />}
              {isAdd && addMode === "import" && <FileSpreadsheet size={20} />}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-primary">
              {isView ? "Book Details" : isEdit ? "Edit Book" :
               addMode === "import" ? "Import from Excel" : "Add Book"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-subtle text-secondary hover:bg-red-50 hover:text-red-600 transition-all duration-150"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          {isView && <BookView book={book} />}
          {isEdit && <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
          {isAdd && (
            <>
              {addMode === "manual" && <BookForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
              {addMode === "import" && <BookAddImport {...importProps} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-5 border-t border-border-light bg-subtle/50">
          {isView && (
            <>
              <button
                onClick={() => onDelete(book)}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all duration-150"
              >
                Delete Book
              </button>
              <button
                onClick={() => onEdit(book)}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all duration-150"
                style={{ background: "var(--accent-amber)" }}
              >
                Edit Book
              </button>
            </>
          )}
          {isEdit && (
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-secondary hover:bg-subtle transition-all duration-150">Cancel</button>
              <button
                onClick={onUpdate}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 transition-all duration-150"
                style={{ background: "var(--accent-amber)" }}
              >
                Update Book
              </button>
            </>
          )}
          {isAdd && (
            <>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-secondary hover:bg-subtle transition-all duration-150">Cancel</button>
              <button
                onClick={onSave}
                className="px-5 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-lg shadow-amber-500/20 transition-all duration-150"
                style={{ background: "var(--accent-amber)" }}
              >
                Save Book
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
