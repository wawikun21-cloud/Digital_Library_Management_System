import { useState, useEffect } from "react";
import Modal from "../../../../components/ui/Modal";
import { useCreateCourse } from "../../hooks/useCreateCourse";
import { validateCourse } from "../../validators/course.validator";

export default function CreateCourseModal({ open, onClose, onSuccess }) {
  const { create, loading } = useCreateCourse();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setCategory("");
      setDifficulty("beginner");
      setErrors({});
      setSubmitError("");
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    const validation = validateCourse({ title, description, difficulty });
    setErrors(validation.errors);
    if (!validation.isValid) return;

    try {
      const result = await create({ title, description, category, difficulty });
      if (result?.success) {
        onSuccess?.(result.data);
        onClose?.();
      } else {
        setSubmitError(result?.error || "Failed to create course");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to create course");
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Create Course">
      <form onSubmit={handleSubmit} className="space-y-4">
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {submitError}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.title ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-white dark:bg-neutral-800"}`}
            placeholder="Course title"
          />
          {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${errors.description ? "border-red-300 bg-red-50" : "border-[var(--border)] bg-white dark:bg-neutral-800"}`}
            placeholder="Brief description of the course"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Category</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="e.g. Library Science"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all_levels">All Levels</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm border border-[var(--border)]">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="rounded-lg px-4 py-2 text-sm bg-[var(--color-primary)] text-white disabled:opacity-50">
            {loading ? "Creating..." : "Create Course"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
