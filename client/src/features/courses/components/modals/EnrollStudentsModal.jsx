import { useState } from "react";
import Modal from "../../../../components/ui/Modal";
import { useEnrollmentList } from "../../hooks/useEnrollmentList";
import { useEnrollStudent } from "../../hooks/useEnrollStudent";
import { useUnenrollStudent } from "../../hooks/useUnenrollStudent";

export default function EnrollStudentsModal({ open, onClose, courseId, onSuccess }) {
  const { data: enrollments = [], refetch } = useEnrollmentList({ courseId });
  const { enroll, loading: enrolling } = useEnrollStudent();
  const { unenroll, loading: unenrolling } = useUnenrollStudent();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("learner");
  const [error, setError] = useState("");

  const handleEnroll = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedUserId) return;
    try {
      const result = await enroll(courseId, selectedUserId, role);
      if (result?.success) {
        setSelectedUserId("");
        setRole("learner");
        refetch();
        onSuccess?.();
      } else {
        setError(result?.error || "Failed to enroll student");
      }
    } catch (err) {
      setError(err.message || "Failed to enroll student");
    }
  };

  const handleUnenroll = async (userId) => {
    try {
      const result = await unenroll(courseId, userId);
      if (result?.success) {
        refetch();
        onSuccess?.();
      }
    } catch (err) {
      console.error("Unenroll failed", err);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Manage Enrollments" maxWidth="max-w-xl">
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <form onSubmit={handleEnroll} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-neutral-700 mb-1">User ID</label>
            <input
              type="number"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
              placeholder="Enter user ID"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            >
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
              <option value="teaching_assistant">Teaching Assistant</option>
              <option value="guest">Guest</option>
            </select>
          </div>
          <button type="submit" disabled={enrolling} className="rounded-lg px-4 py-2 text-sm bg-[var(--color-primary)] text-white disabled:opacity-50">
            {enrolling ? "Saving..." : "Enroll"}
          </button>
        </form>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-[var(--border)]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-neutral-50/60 dark:bg-neutral-800/40">
                <th className="text-left px-3 py-2 font-medium text-neutral-500">User</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500">Role</th>
                <th className="text-left px-3 py-2 font-medium text-neutral-500">Status</th>
                <th className="text-right px-3 py-2 font-medium text-neutral-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{enrollment.username || enrollment.user_id}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{enrollment.role}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300 capitalize">{enrollment.status}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleUnenroll(enrollment.user_id)}
                      disabled={unenrolling}
                      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-neutral-500">
                    No enrollments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
