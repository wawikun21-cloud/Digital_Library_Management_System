import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import { validateTool } from "../validators/tool.validator";
import { TOOL_CATEGORIES } from "../utils/toolsHelpers";
import ToolThumbnailInput from "./ToolThumbnailInput";
import ToolFileDropzone from "./ToolFileDropzone";

const FIELD_INPUT =
  "w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20";
const FIELD_LABEL =
  "mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300";

const FILE_ACCEPT = ".pdf,.doc,.docx,.zip,.rar,.jpg,.png,.mp4,.mov";
const FILE_HINT = "PDF, ZIP, DOCX, or media; maximum 50 MB.";

export default function ToolFormModal({ open, mode = "create", tool = null, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [isActive, setIsActive] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(tool?.title || "");
    setDescription(tool?.description || "");
    setCategory(tool?.category || "general");
    setIsActive(tool?.is_active !== false);
    setThumbnailUrl(tool?.thumbnail_url || "");
    setThumbnailFile(null);
    setFile(null);
    setErrors({});
    setSubmitError("");
    setSubmitting(false);
  }, [open, tool]);

  if (!open) return null;

  // A newly picked file previews locally; otherwise show the stored URL.
  const thumbnailPreview = thumbnailFile
    ? URL.createObjectURL(thumbnailFile)
    : thumbnailUrl || null;

  // Editing a tool that already has a file does not require re-uploading it.
  const requireFile = mode === "create";

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    const validation = validateTool({ title, description, category, file }, { requireFile });
    setErrors(validation.errors);
    if (!validation.isValid) return;

    setSubmitting(true);
    Promise.resolve(
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        is_active: isActive,
        thumbnail_url: thumbnailUrl || null,
        thumbnail: thumbnailFile,
        file,
      })
    )
      .then(() => setSubmitting(false))
      .catch(err => {
        setSubmitting(false);
        setSubmitError(err?.message || "Failed to save tool");
      });
  }

  function clearThumbnail() {
    setThumbnailFile(null);
    setThumbnailUrl("");
  }

  return (
    <Modal isOpen={open} onClose={onClose} title={mode === "create" ? "Create Tool" : "Edit Tool"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}

        <div>
          <label className={FIELD_LABEL}>Tool Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${FIELD_INPUT} ${errors.title ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-white dark:bg-neutral-800"}`}
            placeholder="e.g. Canva Template Pack"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>

        <div>
          <label className={FIELD_LABEL}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${FIELD_INPUT} ${errors.description ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-white dark:bg-neutral-800"}`}
            placeholder="Brief description of the tool"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>

        <div>
          <label className={FIELD_LABEL}>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={`${FIELD_INPUT} border-[var(--border)] bg-white dark:bg-neutral-800`}
          >
            {TOOL_CATEGORIES.map(({ key, label }) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <ToolThumbnailInput
          value={thumbnailPreview}
          fileName={thumbnailFile?.name}
          onChange={(picked) => { setThumbnailFile(picked); setThumbnailUrl(""); }}
          onClear={clearThumbnail}
        />

        <ToolFileDropzone
          label={`Downloadable File${mode === "edit" ? " (leave empty to keep existing)" : ""}`}
          hint={FILE_HINT}
          accept={FILE_ACCEPT}
          file={file}
          onChange={setFile}
          error={errors.file}
        />

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="is_active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label htmlFor="is_active" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Active — visible to students
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            {submitting ? "Saving..." : mode === "create" ? "Create Tool" : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
