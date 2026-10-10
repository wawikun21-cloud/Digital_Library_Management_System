import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

const FIELD_LABEL = "mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300";
const DROPZONE_ACTIVE = "border-[var(--color-primary)] bg-[var(--bg-hover)]";
const DROPZONE_IDLE = "border-[var(--border)] bg-neutral-50 dark:bg-neutral-800";

/**
 * Thumbnail input with live preview, file upload, and drag & drop.
 * Mirrors courses/components/CourseThumbnailInput.jsx.
 */
export default function ToolThumbnailInput({ value, fileName, onChange, onClear }) {
  const [dragging, setDragging] = useState(false);
  const hasValue = Boolean(value);

  return (
    <div>
      <label className={FIELD_LABEL}>Tool Thumbnail</label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-neutral-100 dark:bg-neutral-800">
          {hasValue ? (
            <img src={value} alt="Tool thumbnail preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-neutral-400">
              <ImagePlus size={24} />
              <span className="text-xs">No thumbnail</span>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) onChange(dropped);
            }}
            className={`w-full rounded-lg border border-dashed px-3 py-3 text-center transition-colors ${dragging ? DROPZONE_ACTIVE : DROPZONE_IDLE}`}
          >
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--color-primary)]">
              <ImagePlus size={16} />
              {hasValue ? "Replace thumbnail" : "Upload or drop image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  if (picked) onChange(picked);
                }}
                className="sr-only"
              />
            </label>
            <p className="mt-1 text-xs text-neutral-500">
              {fileName ? `${fileName} — ` : ""}JPEG, PNG, or WebP; maximum 5 MB.
            </p>
          </div>

          {hasValue && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-red-600"
            >
              <X size={13} /> Remove thumbnail
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
