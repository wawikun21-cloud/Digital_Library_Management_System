import { useEffect, useState } from "react";
import { BookOpen, ImagePlus, Loader2, X } from "lucide-react";
import coursesApi from "../api/coursesApi";

export default function CourseThumbnailInput({ value, onChange, onUploadingChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => setPreviewFailed(false), [value]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const result = await coursesApi.uploadCourseThumbnail(file);
      onChange(result.data.thumbnail_url);
    } catch (uploadError) {
      setError(uploadError.message || "Unable to upload the course thumbnail.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Course Thumbnail</label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-neutral-100 dark:bg-neutral-800">
          {value && !previewFailed ? (
            <img
              src={value}
              alt="Course thumbnail preview"
              onError={() => setPreviewFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-neutral-400">
              <BookOpen size={24} />
              <span className="text-xs">No thumbnail</span>
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] ${uploading ? "cursor-wait opacity-60" : ""}`}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {uploading ? "Uploading..." : value ? "Replace thumbnail" : "Upload thumbnail"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
          </label>
          <p className="text-xs text-neutral-500">JPEG, PNG, or WebP; maximum 5 MB.</p>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-red-600 disabled:opacity-50"
            >
              <X size={13} /> Remove thumbnail
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
