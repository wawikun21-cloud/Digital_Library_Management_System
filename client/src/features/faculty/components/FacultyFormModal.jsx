/**
 * features/faculty/components/FacultyFormModal.jsx
 *
 * Add / edit faculty. Owns its form state, seeded per mode at mount.
 * Extracted from the former pages/Faculty.jsx.
 */

import { useState } from "react";
import { UserCheck, ChevronDown } from "lucide-react";
import { DEPARTMENTS, EMPTY_FORM } from "../constants/facultyUi";
import { validateFacultyForm } from "../validation/facultyValidation";

export default function FacultyFormModal({ mode, member, onClose, onSave }) {
  const [formData, setFormData] = useState(() =>
    mode === "edit" && member
      ? { faculty_name: member.faculty_name, department: member.department }
      : { ...EMPTY_FORM }
  );
  const [formErrors, setFormErrors] = useState({});

  const isEditMode = mode === "edit";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateFacultyForm(formData);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const ok = await onSave(formData);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)" }}
          >
            <UserCheck className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            {isEditMode ? "Edit Faculty Member" : "Add Faculty Member"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Faculty Name */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Faculty Name *
            </label>
            <input
              type="text"
              value={formData.faculty_name}
              onChange={e => {
                setFormData(p => ({ ...p, faculty_name: e.target.value }));
                setFormErrors(p => ({ ...p, faculty_name: "" }));
              }}
              placeholder="Enter full name"
              className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 transition-colors"
              style={{
                background: "var(--bg-input)",
                border: `1px solid ${formErrors.faculty_name ? "#ef4444" : "var(--border)"}`,
                color: "var(--text-primary)",
              }}
            />
            {formErrors.faculty_name && (
              <p className="text-xs text-red-500 mt-1">{formErrors.faculty_name}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Department *
            </label>
            <div className="relative">
              <select
                value={formData.department}
                onChange={e => {
                  setFormData(p => ({ ...p, department: e.target.value }));
                  setFormErrors(p => ({ ...p, department: "" }));
                }}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 appearance-none transition-colors"
                style={{
                  background: "var(--bg-input)",
                  border: `1px solid ${formErrors.department ? "#ef4444" : "var(--border)"}`,
                  color: formData.department ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d.code} value={d.code}>{d.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            </div>
            {formErrors.department && (
              <p className="text-xs text-red-500 mt-1">{formErrors.department}</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--bg-input)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)",
                boxShadow: "0 2px 6px rgba(30,58,123,0.35)",
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {isEditMode ? "Save Changes" : "Add Faculty"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
