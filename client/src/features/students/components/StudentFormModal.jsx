/**
 * features/students/components/StudentFormModal.jsx
 *
 * Add / edit student. Owns its form state, the ID blur-check and the
 * duplicate-ID wiring. Extracted from the former pages/Students.jsx.
 */

import { useState } from "react";
import { GraduationCap, XCircle, AlertCircle, ChevronDown } from "lucide-react";
import ModalAnimations from "../../../components/ui/ModalAnimations";
import { FORM_FIELDS, EMPTY_FORM } from "../constants/studentsUi";
import { currentSchoolYear } from "../utils/studentFilters";

const seedForm = (student) => {
  if (!student) {
    return {
      ...EMPTY_FORM,
      student_id_number: "",
      student_name: "",
      student_course: "",
      student_yr_level: "",
      student_school_year: currentSchoolYear(),
      student_email: "",
      student_contact: "",
      display_name: "",
      first_name: "",
      last_name: "",
      senior_high_school: "",
      strand: "",
      school_address: "",
    };
  }
  return {
    ...student,
    student_school_year: student.student_school_year || currentSchoolYear(),
  };
};

export default function StudentFormModal({ mode, student, onClose, onCreate, onUpdate, onCheckId }) {
  const isEditMode = mode === "edit";
  const [formData, setFormData] = useState(() => seedForm(student));
  const [idExists, setIdExists] = useState(false);
  const [idChecking, setIdChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditMode) {
      const ok = await onUpdate(student.id, formData);
      if (ok) onClose();
    } else {
      const result = await onCreate(formData);
      if (result === "created") onClose();
      if (result === "duplicate") setIdExists(true);
    }
  };

  const close = () => onClose();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.65)", backdropFilter: "blur(4px)" }}>
      <div
        className="rounded-2xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 60px rgba(0,0,0,0.28)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)" }}>
              <GraduationCap size={16} className="text-white" />
            </div>
            <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
              {isEditMode ? "Edit Student" : "Add New Student"}
            </h2>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
            style={{ color: "var(--text-muted)" }}
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORM_FIELDS.map(({ label, key, type, required, placeholder, options }) => (
              <div key={key}>
                <label className="block text-[12.5px] font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>
                  {label}{required && <span style={{ color: "#dc2626" }}> *</span>}
                </label>
                {type === "select" ? (
                  <div className="relative">
                    <select
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 appearance-none"
                      style={{ background: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                    >
                      <option value="">Select {label.toLowerCase()}</option>
                      {options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : key === "student_id_number" ? (
                  <div>
                    <input
                      type={type}
                      value={formData[key]}
                      onChange={(e) => {
                        setFormData({ ...formData, [key]: e.target.value });
                        setIdExists(false);
                      }}
                      onBlur={async (e) => {
                        setIdChecking(true);
                        const exists = await onCheckId(e.target.value);
                        setIdExists(exists);
                        setIdChecking(false);
                      }}
                      placeholder={placeholder}
                      className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                      style={{ background: "var(--bg-input)", border: idExists ? "1.5px solid #dc2626" : "1.5px solid var(--border)", color: "var(--text-primary)" }}
                    />
                    {idChecking && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Checking...</p>
                    )}
                    {idExists && !idChecking && (
                      <p className="text-[11px] font-semibold mt-1 flex items-center gap-1" style={{ color: "#dc2626" }}>
                        <AlertCircle size={12} /> Student ID already exists
                      </p>
                    )}
                  </div>
                ) : (
                  <input
                    type={type}
                    value={formData[key]}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none transition-all focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                    style={{ background: "var(--bg-input)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── Modal footer ──────────────────────────── */}
          <div className="flex items-center justify-end gap-2.5 mt-6 pt-4"
            style={{ borderTop: "1px solid var(--border-light)" }}>
            <button
              type="button"
              onClick={close}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 active:scale-[.98]"
              style={{ background: "var(--bg-hover)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 active:scale-[.98]"
              style={{ background: "linear-gradient(135deg, #1e3a7b 0%, #2d4fa3 100%)", boxShadow: "0 2px 8px rgba(30,58,123,0.35)" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              {isEditMode ? "Update Student" : "Add Student"}
            </button>
          </div>
        </form>
      </div>
      <ModalAnimations />
    </div>
  );
}
