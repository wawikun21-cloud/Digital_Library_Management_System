import { useState } from "react";
import { Upload, FileText } from "lucide-react";

const DROPZONE_ACTIVE = "border-[var(--color-primary)] bg-[var(--bg-hover)]";
const DROPZONE_IDLE = "border-[var(--border)] bg-neutral-50 dark:bg-neutral-800";

/**
 * Downloadable file dropzone with drag & drop support.
 * `file` is the File object pending upload (not yet sent to the server).
 */
export default function ToolFileDropzone({ label, hint, accept, file, onChange, error }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onChange(dropped);
        }}
        className={`rounded-lg border border-dashed p-4 text-center transition-colors ${dragging ? DROPZONE_ACTIVE : DROPZONE_IDLE}`}
      >
        <label className="inline-flex cursor-pointer flex-col items-center gap-1.5">
          {file ? <FileText size={22} className="text-[var(--color-primary)]" /> : <Upload size={22} className="text-neutral-400" />}
          <span className="text-sm text-[var(--text-primary)]">
            {file ? "Replace file" : "Click or drop a file here"}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={(e) => onChange(e.target.files?.[0] || null)}
            className="sr-only"
          />
        </label>
        {file ? (
          <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-300">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        ) : (
          hint && <p className="mt-2 text-xs text-neutral-500">{hint}</p>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
