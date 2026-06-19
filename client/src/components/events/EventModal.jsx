import { useState, useEffect } from "react";
import { X, Calendar, Tag, Image as ImageIcon, FileText } from "lucide-react";
import EventForm from "./EventForm";

const EMPTY_FORM = {
  title: "",
  description: "",
  event_date: "",
  category: "",
  image: null,
};

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0" style={{ borderColor: "var(--border-light)" }}>
      <div className="flex items-center gap-1.5 shrink-0 w-[100px]">
        <Icon size={12} style={{ color: "var(--text-muted)" }} />
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span className="text-[13px] leading-relaxed flex-1 break-words" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

export default function EventModal({ isOpen, onClose, event, mode, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [internalMode, setInternalMode] = useState(mode);

  useEffect(() => { setInternalMode(mode); }, [mode]);

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setErrors({});
      setSaving(false);
      return;
    }

    if (internalMode === "add") {
      setForm(EMPTY_FORM);
      setErrors({});
      return;
    }

    if (event && internalMode === "view") {
      setForm({
        title: event.title || "",
        description: event.description || "",
        event_date: event.event_date || "",
        category: event.category || "",
        image: event.image || null,
      });
      setErrors({});
    }
  }, [isOpen, event, internalMode]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (internalMode === "edit") {
          setInternalMode("view");
          setErrors({});
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [internalMode, onClose]);

  const isView = internalMode === "view";
  const isEdit = internalMode === "edit";
  const isAdd = internalMode === "add";

  function validate() {
    const e = {};
    if (!form.title?.trim()) e.title = "Title is required";
    if (!form.event_date) e.event_date = "Event date is required";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const result = await onSave(form);
      if (result?.success) { onClose(); }
      else { setErrors({ title: result?.error || "Failed to save" }); }
    } catch {
      setErrors({ title: "Could not connect to server" });
    } finally { setSaving(false); }
  }

  const maxWidth = isView ? "640px" : "580px";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 anim-overlay" style={{ background: "rgba(10,22,34,0.72)", backdropFilter: "blur(8px)" }} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="flex flex-col rounded-2xl overflow-hidden anim-modal shadow-2xl" style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)", width: "100%", maxWidth, maxHeight: "92vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: "1.5px solid var(--border-light)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
              {isView && <FileText size={17} />}
              {(isEdit || isAdd) && <ImageIcon size={17} />}
            </div>
            <div>
              <h2 id="modal-title" className="text-[14px] font-bold tracking-tight leading-none" style={{ color: "var(--text-primary)" }}>
                {isView ? "Event Details" : isEdit ? "Edit Event" : "Add New Event"}
              </h2>
              {isView && form.title && (
                <p className="text-[11px] mt-0.5 truncate max-w-[320px]" style={{ color: "var(--text-muted)" }}>{form.title}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 hover:bg-red-50 hover:text-red-500" style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)" }} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 focus:outline-none custom-scrollbar" tabIndex="0" role="region" aria-labelledby="modal-title">
          {isView ? (
            <div className="flex flex-col gap-4">
              {form.image && (
                <div className="flex justify-center mb-2">
                  <img src={form.image} alt={form.title} className="max-h-48 rounded-lg border-[1.5px]" style={{ borderColor: "var(--border)" }} />
                </div>
              )}
              <DetailRow icon={FileText} label="Title" value={form.title} />
              <DetailRow icon={FileText} label="Description" value={form.description} />
              <DetailRow icon={Calendar} label="Date" value={form.event_date} />
              <DetailRow icon={Tag} label="Category" value={form.category || "—"} />
            </div>
          ) : (
            <EventForm form={form} setForm={setForm} errors={errors} setErrors={setErrors} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 px-5 py-3 border-t shrink-0" style={{ borderColor: "var(--border-light)", background: "var(--bg-subtle, rgba(245,243,240,0.5))" }}>
          {isView && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150" style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}>
              Close
            </button>
          )}

          {(isEdit || isAdd) && (
            <>
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150" style={{ color: "var(--text-secondary)", background: "var(--bg-subtle)", border: "1.5px solid var(--border-light)" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-xl text-[12px] font-bold text-white shadow-sm transition-all duration-150 hover:brightness-110 disabled:opacity-60" style={{ background: "var(--accent-amber)" }}>
                {saving ? "Saving…" : isEdit ? "Update Event" : "Save Event"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
