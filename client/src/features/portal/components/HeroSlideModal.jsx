import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import Modal from "../../../components/ui/Modal";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const inputStyle = {
  background: "var(--bg-primary)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
};

/** Create (slide = null) or edit a hero slide. onSubmit receives a FormData. */
export default function HeroSlideModal({ isOpen, slide, onClose, onSubmit }) {
  const isEdit = Boolean(slide);
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setError("");
    setSaving(false);
    setPreview(slide?.image_url || "");
    setIsActive(slide ? Boolean(slide.is_active) : true);
  }, [isOpen, slide]);

  useEffect(() => () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  const handleFile = (event) => {
    const picked = event.target.files?.[0];
    if (!picked) return;
    if (!ACCEPTED_TYPES.includes(picked.type)) return setError("Choose a JPEG, PNG, or WebP image.");
    if (picked.size > MAX_IMAGE_BYTES) return setError("Image must be 5 MB or smaller.");
    setError("");
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isEdit && !file) return setError("Choose an image for the slide.");

    const body = new FormData();
    if (file) body.append("image", file);
    body.append("is_active", String(isActive));

    setSaving(true);
    setError("");
    try {
      await onSubmit(body);
      onClose();
    } catch (err) {
      setError(err.message || "Could not save the slide.");
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={saving ? undefined : onClose} title={isEdit ? "Edit slide" : "Add slide"} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors hover:border-[var(--accent-amber)]"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            {preview ? (
              <img src={preview} alt="Slide preview" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-[12px]">
                <ImagePlus size={24} />
                Choose an image
              </span>
            )}
          </button>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(",")} onChange={handleFile} className="sr-only" aria-label="Slide image" />
          <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            {isEdit ? "Choose a new image to replace the current one. " : ""}
            Wide images work best (about 1920 × 600). JPEG, PNG or WebP, up to 5 MB.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--text-primary)" }}>
          <input type="checkbox" checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)} />
          Show this slide to students
        </label>

        {error && <p role="alert" className="text-[12px] font-medium" style={{ color: "#dc2626" }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--accent-amber)" }}>
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isEdit ? "Save changes" : "Add slide"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
