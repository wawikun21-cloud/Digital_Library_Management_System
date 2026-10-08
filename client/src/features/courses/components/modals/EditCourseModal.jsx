import { useState, useEffect } from "react";
import Modal from "../../../../components/ui/Modal";
import CourseThumbnailInput from "../CourseThumbnailInput";
import RichTextEditor from "../RichTextEditor";
import { useUpdateCourse } from "../../hooks/useUpdateCourse";
import { validateCourse } from "../../validators/course.validator";

export default function EditCourseModal({ open, onClose, course, onSuccess }) {
  const { update, loading } = useUpdateCourse();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [status, setStatus] = useState("draft");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (open && course) {
      setTitle(course.title || "");
      setDescription(course.description || "");
      setThumbnailUrl(course.thumbnail_url || "");
      setUploadingThumbnail(false);
      setCategory(course.category || "");
      setDifficulty(course.difficulty || "beginner");
      setStatus(course.status || "draft");
      setErrors({});
      setSubmitError("");
    }
  }, [open, course]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const validation = validateCourse({ title, description, difficulty });
    setErrors(validation.errors);
    if (!validation.isValid) return;

    try {
      const result = await update(course.id, {
        title,
        description,
        category,
        difficulty,
        status,
        thumbnail_url: thumbnailUrl || null,
      });
      if (result?.success) {
        onSuccess?.();
        onClose?.();
      } else {
        setSubmitError(result?.error || "Failed to update course");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to update course");
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit Course">
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 ${errors.title ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-white dark:bg-neutral-800"}`}
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description</label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            minHeight="7rem"
            invalid={Boolean(errors.description)}
            placeholder="Brief description of the course"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>
        <CourseThumbnailInput value={thumbnailUrl} onChange={setThumbnailUrl} onUploadingChange={setUploadingThumbnail} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all_levels">All Levels</option>
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="under_review">Under Review</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
            Cancel
          </button>
          <button type="submit" disabled={loading || uploadingThumbnail} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50">
            {uploadingThumbnail ? "Uploading thumbnail..." : loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
