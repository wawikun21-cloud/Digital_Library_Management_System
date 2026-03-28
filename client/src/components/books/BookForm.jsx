import { useState } from "react";

const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";
const inputStyle = (err = false) => ({
  background:  "var(--bg-input)",
  color:       "var(--text-primary)",
  borderColor: err ? "#cc1f1f" : "var(--border)",
});

export default function BookForm({ form, setForm, errors, setErrors }) {
  const sections = [
    {
      title: "Title Information",
      fields: [
        { label: "Title", fkey: "title" },
        { label: "Subtitle", fkey: "subtitle" },
        { label: "Authors", fkey: "authors" },
        { label: "Edition", fkey: "edition" },
        { label: "Call No.", fkey: "callNumber" },
        { label: "Accession No.", fkey: "accessionNumber" },
        { label: "No. of Copies", fkey: "quantity", type: "number", placeholder: "e.g. 5" },
        { label: "Volume", fkey: "volume" },
      ]
    },
    {
      title: "Standard Numbers",
      fields: [
        { label: "LCCN", fkey: "lccn" },
        { label: "ISBN", fkey: "isbn", placeholder: "e.g. 978-0..." },
        { label: "ISSN", fkey: "issn" },
      ]
    },
    {
      title: "Publication Information",
      fields: [
        { label: "Place", fkey: "place" },
        { label: "Publisher", fkey: "publisher" },
        { label: "Date", fkey: "date", type: "number", placeholder: "e.g. 2024" },
      ]
    },
    {
      title: "Physical Description",
      fields: [
        { label: "Extent", fkey: "extent" },
        { label: "Other Details", fkey: "otherDetails" },
        { label: "Size", fkey: "size" },
        { label: "Shelf", fkey: "shelf" },
        { label: "Pages", fkey: "pages", type: "number", placeholder: "e.g. 320" },
        // ── NEW ──────────────────────────────────────────────
        { label: "Sublocation", fkey: "sublocation", placeholder: "e.g. Reference Section" },
      ]
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section, idx) => (
        <div key={idx} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-amber-600/80">
              {section.title}
            </h3>
            <div className="flex-1 h-px bg-border-light" />
          </div>
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

      {/* Description */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[12px] font-bold uppercase tracking-widest text-amber-600/80">
            Description
          </h3>
          <div className="flex-1 h-px bg-border-light" />
        </div>
        <textarea
          id="field-description"
          className={`${inputCls} resize-y min-h-[120px]`}
          style={inputStyle()}
          placeholder="Enter a brief summary or description of the book..."
          value={form.description ?? ""}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

function Field({ label, fkey, type = "text", placeholder = "", form, setForm, errors, setErrors }) {
  const err = errors[fkey];
  const id = `field-${fkey}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-bold uppercase tracking-wider pl-0.5"
        style={{ color:"var(--text-secondary)" }}
      >
        {label}
        {/* Sublocation is optional — show hint */}
        {fkey === "sublocation" && (
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
        onChange={e => {
          setForm(f => ({ ...f, [fkey]: e.target.value }));
          if (err) setErrors(v => { const n = { ...v }; delete n[fkey]; return n; });
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