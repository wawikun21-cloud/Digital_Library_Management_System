import { useEffect, useCallback, useState } from "react";
import {
  X, ExternalLink, BookMarked, FileText, BookOpen,
  User, Calendar, Tag, Globe, GraduationCap, Layers, BookCopy,
  Edit2, Trash2, CheckCircle2, Loader2,
} from "lucide-react";

/* ── Mirror normalizer from LexoraBookTable exactly ────────── */
function normalizeType(raw) {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  if (t === "ebook"    || t === "ebooks")   return "Ebook";
  if (t === "journal"  || t === "journal ") return "Journal";
  if (t === "module"   || t === "mdule")    return "Module";
  if (t === "reviewer")                     return "Reviewer";
  if (t === "exam")                         return "Exam";
  return raw.trim();
}

const TYPE_STYLE = {
  Ebook:    { bg: "rgba(50,102,127,0.12)",  color: "#32667F",  Icon: BookMarked },
  Journal:  { bg: "rgba(36,97,57,0.12)",    color: "#246139",  Icon: FileText   },
  Module:   { bg: "rgba(153,101,0,0.12)",   color: "#996500",  Icon: BookOpen   },
  Reviewer: { bg: "rgba(109,40,217,0.1)",   color: "#6d28d9",  Icon: BookOpen   },
  Exam:     { bg: "rgba(204,31,31,0.1)",    color: "#cc1f1f",  Icon: FileText   },
};

const EMPTY_FORM = {
  title: "", author: "", source: "", year: "",
  resource_type: "", format: "", subject_course: "", program: "",
};

/* ── Badges ─────────────────────────────────────────────────── */
function TypeBadge({ raw }) {
  const label = normalizeType(raw) || "—";
  const s     = TYPE_STYLE[label];
  if (!s) return <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>;
  const { Icon } = s;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold"
      style={{ background: s.bg, color: s.color }}>
      <Icon size={11} /> {label}
    </span>
  );
}

function ProgramBadge({ program }) {
  if (!program) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold"
      style={{ background: "rgba(153,101,0,0.1)", color: "var(--accent-amber)" }}>
      <GraduationCap size={11} /> {program}
    </span>
  );
}

/* ── Detail row (view mode) ─────────────────────────────────── */
function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  const clean = typeof value === "string" ? value.replace(/[\r\n]+/g, " ").trim() : value;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0"
      style={{ borderColor: "var(--border-light)" }}>
      <div className="flex items-center gap-1.5 shrink-0 w-[120px]">
        <Icon size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span className="text-[13px] leading-relaxed flex-1" style={{ color: "var(--text-primary)" }}>
        {clean}
      </span>
    </div>
  );
}

/* ── Form field wrapper ─────────────────────────────────────── */
function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}>
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-orange-500">{error}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] border outline-none";
const inputStyle = (err) => ({
  background:   "var(--bg-main)",
  borderColor:  err ? "#EA8B33" : "var(--border)",
  color:        "var(--text-primary)",
  fontFamily:   "inherit",
});

/* ══ Main Modal ═════════════════════════════════════════════ */
export default function LexoraBookDetailModal({
  isOpen,
  onClose,
  book,
  onEdit,     // (updatedBook) => void — called after successful update
  onDelete,   // (bookId)      => void — called after successful delete
  onAdd,      // (newBook)     => void — called after successful create
  addMode,    // boolean — open in create mode (no book needed)
}) {
  // "view" | "edit" | "add"
  const [mode,          setMode]          = useState("view");
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [errors,        setErrors]        = useState({});
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* ── Sync state when book / addMode changes ── */
  useEffect(() => {
    if (!isOpen) {
      setMode("view");
      setForm(EMPTY_FORM);
      setErrors({});
      setConfirmDelete(false);
      return;
    }
    if (addMode) {
      setMode("add");
      setForm(EMPTY_FORM);
      setErrors({});
      return;
    }
    if (book) {
      setMode("view");
      setForm({
        title:          book.title          || "",
        author:         book.author         || "",
        source:         book.source         || "",
        year:           book.year           || "",
        resource_type:  book.resource_type  || "",
        format:         book.format         || "",
        subject_course: book.subject_course || "",
        program:        book.program        || "",
      });
      setErrors({});
      setConfirmDelete(false);
    }
  }, [isOpen, book, addMode]);

  /* ── Keyboard: Escape cancels edit or closes ── */
  const handleKey = useCallback((e) => {
    if (e.key !== "Escape") return;
    if (mode === "edit") { setMode("view"); setErrors({}); }
    else onClose();
  }, [onClose, mode]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKey]);

  if (!isOpen) return null;
  if (mode !== "add" && !book) return null;

  /* ── Derived display values ── */
  const displayBook  = mode === "view" ? book : null;
  const type         = normalizeType(displayBook?.resource_type ?? form.resource_type);
  const typeStyle    = TYPE_STYLE[type] ?? {};
  const accentColor  = typeStyle.color ?? "var(--accent-amber)";
  const IconComp     = typeStyle.Icon  ?? BookOpen;

  const cleanTitle  = (mode === "add" ? form.title : book?.title)
    ?.replace(/[\r\n]+/g, " ").trim() || (mode === "add" ? "" : "Untitled");
  const cleanAuthor = (mode === "view" ? book?.author : form.author)
    ?.replace(/[\r\n]+/g, " ").trim();

  const isEditing = mode === "edit" || mode === "add";

  /* ── Validation ── */
  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    return e;
  }

  /* ── Save (create or update) ── */
  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const isAdd = mode === "add";
      const url   = isAdd ? "/api/books/lexora" : `/api/books/lexora/${book.id}`;
      const res   = await fetch(url, {
        method:  isAdd ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const result = await res.json();
      if (result.success) {
        if (isAdd) {
          onAdd?.(result.data);
        } else {
          onEdit?.(result.data);
          setMode("view");
        }
      } else {
        setErrors({ title: result.error || "Failed to save" });
      }
    } catch {
      setErrors({ title: "Could not connect to server" });
    } finally {
      setSaving(false);
    }
  }

  /* ── Delete ── */
  async function handleDelete() {
    setDeleting(true);
    try {
      const res    = await fetch(`/api/books/lexora/${book.id}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        onDelete?.(book.id);
        onClose();
      } else {
        setErrors({ title: result.error || "Failed to delete" });
        setConfirmDelete(false);
      }
    } catch {
      setErrors({ title: "Could not connect to server" });
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={() => { if (!isEditing) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "add" ? "Add Lexora Book" : `Details for ${cleanTitle}`}
      >
        {/* Accent top bar */}
        <div className="h-1 w-full shrink-0" style={{ background: accentColor }} />

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start gap-4 px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}>

          <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ background: typeStyle.bg ?? "rgba(238,162,58,0.12)" }}>
            <IconComp size={22} style={{ color: accentColor }} />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
                {mode === "add" ? "Add New Lexora Book" : "Edit Book Details"}
              </p>
            ) : (
              <>
                <h2 className="text-[15px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {cleanTitle}
                </h2>
                {cleanAuthor && (
                  <p className="text-[12px] mt-0.5 italic" style={{ color: "var(--text-secondary)" }}>
                    by {cleanAuthor}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <TypeBadge raw={book?.resource_type} />
                  <ProgramBadge program={book?.program} />
                  {book?.year && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold"
                      style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}>
                      <Calendar size={10} /> {book.year}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg"
            style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-subtle)"}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* VIEW MODE */}
          {mode === "view" && (
            <>
              <DetailRow icon={User}          label="Author"         value={cleanAuthor} />
              <DetailRow icon={Calendar}      label="Year"           value={book?.year} />
              <DetailRow icon={Tag}           label="Type"           value={type} />
              <DetailRow icon={Layers}        label="Format"         value={book?.format} />
              <DetailRow icon={BookCopy}      label="Subject/Course" value={book?.subject_course} />
              <DetailRow icon={GraduationCap} label="Program"        value={book?.program} />
              <DetailRow icon={Globe}         label="Source URL"     value={book?.source} />
            </>
          )}

          {/* EDIT / ADD MODE */}
          {isEditing && (
            <div className="flex flex-col gap-4">

              <Field label="Title" required error={errors.title}>
                <input
                  value={form.title}
                  onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(v => ({ ...v, title: undefined })); }}
                  placeholder="Book or resource title"
                  className={inputCls}
                  style={inputStyle(errors.title)}
                />
              </Field>

              <Field label="Author">
                <input value={form.author}
                  onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                  placeholder="Author name"
                  className={inputCls} style={inputStyle()} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Year">
                  <input value={form.year} type="number"
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    placeholder="e.g. 2023"
                    className={inputCls} style={inputStyle()} />
                </Field>
                <Field label="Resource Type">
                  <select value={form.resource_type}
                    onChange={e => setForm(f => ({ ...f, resource_type: e.target.value }))}
                    className={inputCls} style={inputStyle()}>
                    <option value="">Select type</option>
                    <option value="Ebook">Ebook</option>
                    <option value="Journal">Journal</option>
                    <option value="Module">Module</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="Exam">Exam</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Format">
                  <input value={form.format}
                    onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                    placeholder="e.g. PDF"
                    className={inputCls} style={inputStyle()} />
                </Field>
                <Field label="Program">
                  <input value={form.program}
                    onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
                    placeholder="e.g. BSIT"
                    className={inputCls} style={inputStyle()} />
                </Field>
              </div>

              <Field label="Subject / Course">
                <input value={form.subject_course}
                  onChange={e => setForm(f => ({ ...f, subject_course: e.target.value }))}
                  placeholder="e.g. Keyboarding Applications"
                  className={inputCls} style={inputStyle()} />
              </Field>

              <Field label="Source URL">
                <input value={form.source} type="url"
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="https://…"
                  className={inputCls} style={inputStyle()} />
              </Field>

            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between gap-2 px-6 py-3 shrink-0 flex-wrap"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-subtle)" }}
        >

          {/* VIEW mode footer */}
          {mode === "view" && (
            <>
              {/* Left: Open Resource link */}
              <div>
                {book?.source ? (
                  <a href={book.source} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg"
                    style={{ background: typeStyle.bg ?? "rgba(238,162,58,0.12)", color: accentColor, border: `1px solid ${accentColor}30` }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.75"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <ExternalLink size={12} /> Open Resource
                  </a>
                ) : (
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>No external source</span>
                )}
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-2">
                {/* Delete — two-step confirm */}
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border"
                    style={{ background: "rgba(220,38,38,0.08)", borderColor: "rgba(220,38,38,0.25)", color: "#dc2626" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(220,38,38,0.08)"}>
                    <Trash2 size={12} /> Delete
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold" style={{ color: "#dc2626" }}>Sure?</span>
                    <button onClick={handleDelete} disabled={deleting}
                      className="inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: "#dc2626", opacity: deleting ? 0.7 : 1 }}>
                      {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border"
                      style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Edit */}
                {!confirmDelete && (
                  <button onClick={() => setMode("edit")}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border"
                    style={{ background: "rgba(50,102,127,0.08)", borderColor: "rgba(50,102,127,0.25)", color: "#32667F" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(50,102,127,0.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(50,102,127,0.08)"}>
                    <Edit2 size={12} /> Edit
                  </button>
                )}

                {/* Close */}
                {!confirmDelete && (
                  <button onClick={onClose}
                    className="text-[12px] font-semibold px-4 py-1.5 rounded-lg border"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}>
                    Close
                  </button>
                )}
              </div>
            </>
          )}

          {/* EDIT / ADD mode footer */}
          {isEditing && (
            <>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {mode === "add"
                  ? "All fields except Title are optional"
                  : `Editing: ${cleanTitle.slice(0, 35)}${cleanTitle.length > 35 ? "…" : ""}`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { mode === "add" ? onClose() : (setMode("view"), setErrors({})); }}
                  className="text-[12px] font-semibold px-4 py-1.5 rounded-lg border"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold px-4 py-1.5 rounded-lg text-white"
                  style={{ background: "var(--accent-amber)", opacity: saving ? 0.7 : 1 }}>
                  {saving
                    ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                    : <><CheckCircle2 size={12} /> {mode === "add" ? "Add Book" : "Save Changes"}</>}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}