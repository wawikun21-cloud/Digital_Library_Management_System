import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const inputCls = "w-full px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] outline-none transition-all duration-150 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";
const inputStyle = (err = false) => ({
  background:  "var(--bg-input)",
  color:       "var(--text-primary)",
  borderColor: err ? "#cc1f1f" : "var(--border)",
});

export default function BookForm({ form, setForm, errors, setErrors }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function readFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = e => setForm(f => ({ ...f, cover: e.target.result }));
    r.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cover Upload */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
          Book Cover
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => readFile(e.target.files[0])}
        />

        {form.cover ? (
          <div
            className="flex items-start gap-4 p-3.5 rounded-xl"
            style={{ background:"var(--bg-subtle)", border:"1.5px solid var(--border)" }}
          >
            <img
              src={form.cover}
              alt="Cover preview"
              className="w-20 h-28 object-cover rounded-lg shrink-0"
              style={{ boxShadow:"var(--shadow-md)", border:"2px solid var(--bg-surface)" }}
            />
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                style={{ background:"rgba(184,122,0,0.1)", borderColor:"rgba(184,122,0,0.3)", color:"#926200" }}
              >
                <ImagePlus size={14} /> Change
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(f => ({ ...f, cover:null }));
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition-colors duration-150"
                style={{ background:"rgba(204,31,31,0.08)", borderColor:"rgba(204,31,31,0.25)", color:"#cc1f1f" }}
              >
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer text-center select-none transition-all duration-150"
            style={{ 
              background: dragOver ? "rgba(184,122,0,0.05)" : "var(--bg-subtle)", 
              borderColor: dragOver ? "var(--accent-amber)" : "var(--border)" 
            }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); readFile(e.dataTransfer.files[0]); }}
          >
            <ImagePlus size={28} style={{ color: dragOver ? "var(--accent-amber)" : "var(--text-secondary)" }} />
            <p className="text-[13px]" style={{ color:"var(--text-secondary)" }}>
              <span className="font-bold underline underline-offset-2" style={{ color:"var(--accent-amber)" }}>
                Click to upload
              </span> or drag & drop
            </p>
          </div>
        )}
      </div>

      {/* Text fields 2-col */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Field label="Accession No." fkey="accessionNumber" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Title" fkey="title" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Subtitle" fkey="subtitle" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Author" fkey="author" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Genre" fkey="genre" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="ISBN Number" fkey="isbn" placeholder="e.g. 978-0000000000" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Year Published" fkey="year" type="number" placeholder="e.g. 2024" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Publisher" fkey="publisher" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Quantity" fkey="quantity" type="number" placeholder="e.g. 5" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Call Number" fkey="callNumber" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Edition" fkey="edition" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Volume" fkey="volume" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
        <Field label="Size" fkey="size" form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
          Description
        </label>
        <textarea
          className={`${inputCls} resize-y min-h-[100px]`}
          style={inputStyle()}
          placeholder="Short description of the book…"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );
}

function Field({ label, fkey, type = "text", placeholder = "", form, setForm, errors, setErrors }) {
  const err = errors[fkey];
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color:"var(--text-secondary)" }}>
        {label}
      </label>
      <input
        className={inputCls}
        style={inputStyle(!!err)}
        type={type}
        placeholder={placeholder || label}
        value={form[fkey]}
        onChange={e => {
          setForm(f => ({ ...f, [fkey]: e.target.value }));
          if (err) setErrors(v => { const n = { ...v }; delete n[fkey]; return n; });
        }}
        aria-invalid={!!err}
      />
      {err && <span className="text-[11px] font-medium text-red-600">{err}</span>}
    </div>
  );
}
