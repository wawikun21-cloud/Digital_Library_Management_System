import { useState, useEffect } from "react";
import { Plus, Trash2, Copy, AlertCircle } from "lucide-react";

const inputCls =
  "w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

const inputStyle = (err = false) => ({
  background:  "var(--bg-input)",
  color:       "var(--text-primary)",
  borderColor: err ? "#cc1f1f" : "var(--border)",
});

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION DEFINITIONS
//  Note: "accessionNumber" (books.accessionNumber) is kept as the primary /
//  call-number-style reference on the book record.
//  The dynamic copies list below maps to book_copies.accession_number rows.
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    title: "Title Information",
    fields: [
      { label: "Title",    fkey: "title" },
      { label: "Subtitle", fkey: "subtitle" },
      { label: "Authors",  fkey: "authors" },
      { label: "Edition",  fkey: "edition" },
      { label: "Genre",    fkey: "genre",    placeholder: "e.g. Fiction, Science, History" },
      { label: "Call No.", fkey: "callNumber" },
      { label: "Volume",   fkey: "volume" },
    ],
  },
  {
    title: "Standard Numbers",
    fields: [
      { label: "LCCN", fkey: "lccn" },
      { label: "ISBN", fkey: "isbn", placeholder: "e.g. 978-0..." },
      { label: "ISSN", fkey: "issn" },
    ],
  },
  {
    title: "Publication Information",
    fields: [
      { label: "Place",      fkey: "place" },
      { label: "Publisher",  fkey: "publisher" },
      { label: "Date",       fkey: "date", type: "number", placeholder: "e.g. 2024" },
    ],
  },
  {
    title: "Physical Description",
    fields: [
      { label: "Extent",       fkey: "extent" },
      { label: "Other Details",fkey: "otherDetails" },
      { label: "Size",         fkey: "size" },
      { label: "Shelf",        fkey: "shelf" },
      { label: "Pages", fkey: "pages", type: "number", placeholder: "e.g. 320" },
      { label: "Coll.", fkey: "collection" },
      {
        label: "Sublocation",
        fkey: "sublocation",
        placeholder: "e.g. Reference Section",
        optional: true,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// bookId is passed when editing an existing book so we can fetch its copies.
// ─────────────────────────────────────────────────────────────────────────────
export default function BookForm({ form, setForm, errors, setErrors, bookId }) {
  const [loadingCopies, setLoadingCopies] = useState(false);

  // ── On edit mode: fetch existing copies from the server and seed form.copies ──
  useEffect(() => {
    if (!bookId) return;                          // add mode — nothing to fetch
    if (Array.isArray(form.copies) && form.copies.length > 0) return; // already loaded

    setLoadingCopies(true);
    fetch(`/api/books/${bookId}/copies`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          const seeded = d.data.map((c) => ({
            id:               c.id,               // preserve DB id for upsert
            accession_number: c.accession_number ?? "",
            status:           c.status ?? "Available", // read-only display
          }));
          setForm((prev) => ({ ...prev, copies: seeded, quantity: seeded.length }));
        }
      })
      .catch(() => {/* silently ignore — form still works without pre-fill */})
      .finally(() => setLoadingCopies(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);


  // Initialised to one blank row when empty (add mode).
  const copies = Array.isArray(form.copies) && form.copies.length > 0
    ? form.copies
    : [{ accession_number: "" }];

  // ── helpers ──────────────────────────────────────────────────────────────
  const setCopies = (updater) => {
    setForm((prev) => {
      const next = typeof updater === "function" ? updater(prev.copies || []) : updater;
      return { ...prev, copies: next, quantity: next.length };
    });
  };

  const addCopy = () =>
    setCopies((prev) => [
      ...(prev || []),
      { accession_number: "" },
    ]);

  const removeCopy = (idx) => {
    setCopies((prev) => prev.filter((_, i) => i !== idx));
    // clear any errors belonging to this row or rows after it
    const e = { ...errors };
    delete e[`copies[${idx}].accession_number`];
    setErrors(e);
  };

  // ── Uniqueness check: returns duplicate indices within the current form ──
  const getDuplicateIndices = (copiesArr) => {
    const seen = {};
    const dupes = new Set();
    copiesArr.forEach((c, i) => {
      const val = c.accession_number?.trim().toLowerCase();
      if (!val) return;
      if (seen[val] !== undefined) {
        dupes.add(seen[val]);
        dupes.add(i);
      } else {
        seen[val] = i;
      }
    });
    return dupes;
  };

  const updateCopy = (idx, field, value) => {
    setCopies((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };

      // Re-validate uniqueness across all rows whenever accession_number changes
      if (field === "accession_number") {
        const dupes = getDuplicateIndices(next);
        const e = { ...errors };
        // Clear all copy accession errors first, then re-set for current dupes
        next.forEach((_, i) => delete e[`copies[${i}].accession_number`]);
        dupes.forEach((i) => {
          e[`copies[${i}].accession_number`] = "Duplicate accession number";
        });
        // Use setTimeout to avoid setState-inside-setState warning
        setTimeout(() => setErrors(e), 0);
      }

      return next;
    });

    // Clear the error for this field if it's not an accession_number change
    // (accession errors are handled above via dupes logic)
    if (field !== "accession_number" && errors[`copies[${idx}].accession_number`]) {
      const e = { ...errors };
      delete e[`copies[${idx}].accession_number`];
      setErrors(e);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8">

      {/* ── Standard metadata sections ── */}
      {SECTIONS.map((section, idx) => (
        <div key={idx} className="flex flex-col gap-4">
          <SectionDivider title={section.title} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {section.fields.map((field) => (
              <Field
                key={field.fkey}
                {...field}
                form={form}
                setForm={setForm}
                errors={errors}
                setErrors={setErrors}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Physical Copies (book_copies rows) ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <SectionDivider
              title="Physical Copies"
              badge={copies.length}
            />
          </div>
        </div>

        {loadingCopies ? (
          <div
            className="flex items-center justify-center gap-2 py-6 rounded-xl border-[1.5px] text-[13px]"
            style={{ borderColor: "var(--border-light)", background: "var(--bg-subtle)", color: "var(--text-muted)" }}
          >
            <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
            Loading existing copies…
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {copies.map((copy, idx) => (
              <CopyRow
                key={copy.id ?? idx}
                idx={idx}
                copy={copy}
                errors={errors}
                canRemove={copies.length > 1}
                onChange={updateCopy}
                onRemove={removeCopy}
              />
            ))}
          </div>
        )}

        {/* Add another copy button */}
        <button
          type="button"
          onClick={addCopy}
          className="flex items-center gap-2 self-start px-4 py-2 rounded-xl text-[12px] font-bold border-[1.5px] border-dashed transition-all duration-150 hover:border-amber-500 hover:text-amber-600"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          <Plus size={13} />
          Add Another Accession Number
        </button>

        {/* Summary pill */}
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
            style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            <Copy size={10} />
            {copies.length} cop{copies.length !== 1 ? "ies" : "y"} — quantity will be set automatically
          </span>
        </p>
      </div>

      {/* ── Description ── */}
      <div className="flex flex-col gap-4">
        <SectionDivider title="Description" />
        <textarea
          id="field-description"
          className={`${inputCls} resize-y min-h-[120px]`}
          style={inputStyle()}
          placeholder="Enter a brief summary or description of the book..."
          value={form.description ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CopyRow — one book_copies entry
// ─────────────────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    Available:  { bg: "rgba(34,197,94,0.12)",   color: "#15803d", dot: "#22c55e" },
    Borrowed:   { bg: "rgba(239,68,68,0.12)",   color: "#b91c1c", dot: "#ef4444" },
    Reserved:   { bg: "rgba(234,179,8,0.12)",   color: "#92400e", dot: "#f59e0b" },
    Lost:       { bg: "rgba(107,114,128,0.12)", color: "#374151", dot: "#6b7280" },
    Damaged:    { bg: "rgba(239,68,68,0.12)",   color: "#b91c1c", dot: "#ef4444" },
    OutOfStock: { bg: "rgba(239,68,68,0.12)",   color: "#dc2626", dot: "#ef4444" },
  };
  const c = cfg[status] || cfg.Available;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.dot}40` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {status || "Available"}
    </span>
  );
}

function CopyRow({ idx, copy, errors, canRemove, onChange, onRemove }) {
  const accErr   = errors[`copies[${idx}].accession_number`];
  const isExisting = !!copy.id; // came from the DB

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl border-[1.5px]"
      style={{
        borderColor: isExisting ? "#c7d7e0" : "var(--border-light)",
        background:  isExisting ? "rgba(50,102,127,0.04)" : "var(--bg-subtle)",
      }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Copy #{idx + 1}
          </span>
          {isExisting && copy.status && (
            <StatusPill status={copy.status} />
          )}
          {isExisting && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(50,102,127,0.1)", color: "#32667F" }}
            >
              existing
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-red-500 transition-all duration-150 hover:bg-red-50"
          >
            <Trash2 size={11} />
            Remove
          </button>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 gap-3">
        {/* Accession Number — required */}
        <div className="flex flex-col gap-1.5">
          <label
            className="text-[11px] font-bold uppercase tracking-wider pl-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Accession No. <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
            style={inputStyle(!!accErr)}
            type="text"
            placeholder="e.g. 14043C1"
            value={copy.accession_number ?? ""}
            onChange={(e) => onChange(idx, "accession_number", e.target.value)}
            aria-invalid={!!accErr}
          />
          {accErr && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600 pl-1">
              <AlertCircle size={10} />
              {accErr}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SectionDivider
// ─────────────────────────────────────────────────────────────────────────────
function SectionDivider({ title, badge }) {
  return (
    <div className="flex items-center gap-3 w-full">
      <h3 className="text-[12px] font-bold uppercase tracking-widest text-amber-600/80 whitespace-nowrap">
        {title}
      </h3>
      {badge != null && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "var(--accent-amber)", color: "#fff" }}
        >
          {badge}
        </span>
      )}
      <div className="flex-1 h-px bg-border-light" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Field — generic labelled input / autocomplete
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  fkey,
  type = "text",
  placeholder = "",
  optional = false,
  form,
  setForm,
  errors,
  setErrors,
}) {
  const err = errors[fkey];
  const id  = `field-${fkey}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wider pl-0.5"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
        {optional && (
          <span className="ml-1 normal-case font-normal text-[10px]" style={{ color: "var(--text-muted)" }}>
            (optional)
          </span>
        )}
      </label>
      <input
        id={id}
        className={inputCls}
        style={inputStyle(!!err)}
        type={type}
        placeholder={placeholder || label}
        value={form[fkey] ?? ""}
        onChange={(e) => {
          setForm((f) => ({ ...f, [fkey]: e.target.value }));
          if (err) {
            const newErrors = { ...errors };
            delete newErrors[fkey];
            setErrors(newErrors);
          }
        }}
        aria-invalid={!!err}
        aria-describedby={err ? `${id}-error` : undefined}
      />
      {err && (
        <span id={`${id}-error`} className="text-[10px] font-semibold text-red-600 pl-1">
          {err}
        </span>
      )}
    </div>
  );
}