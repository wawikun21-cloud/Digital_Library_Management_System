import { useState, useEffect } from "react";
import { ROLES, ROLE_LABELS, ROLE_HIERARCHY, DEFAULT_SEED_PASSWORD } from "../../../constants/roles";
import { validateUserForm } from "../validation/userValidation";

export default function UserForm({ initialData, currentUserRole, onSubmit, onCancel, submitLabel = "Create User" }) {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    role: ROLES.STUDENT,
    full_name: "",
    email: "",
    position_title: "",
    employee_id: "",
    contact_number: "",
    date_hired: "",
    birthdate: "",
    address: "",
    employment_status: "",
    student_id_number: "",
    student_course: "",
    student_yr_level: "",
    student_email: "",
    student_contact: "",
    is_active: 1,
  });

  const [errors, setErrors] = useState({});

  const isEditMode = Boolean(initialData);

  useEffect(() => {
    if (initialData) {
      setFormData({
        username: initialData.username || "",
        password: "",
        confirmPassword: "",
        role: initialData.role || ROLES.STUDENT,
        full_name: initialData.full_name || "",
        email: initialData.email || "",
        position_title: initialData.position_title || "",
        employee_id: initialData.employee_id || "",
        contact_number: initialData.contact_number || "",
        date_hired: initialData.date_hired || "",
        birthdate: initialData.birthdate || "",
        address: initialData.address || "",
        employment_status: initialData.employment_status || "",
        student_id_number: initialData.student_id_number || "",
        student_course: initialData.student_course || "",
        student_yr_level: initialData.student_yr_level || "",
        student_email: initialData.student_email || "",
        student_contact: initialData.student_contact || "",
        is_active: initialData.is_active ?? 1,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { errors: validationErrors, isValid } = validateUserForm(formData, initialData);
    setErrors(validationErrors);
    if (!isValid) return;
    onSubmit(formData);
  };

  const handleReset = () => {
    if (isEditMode && initialData) {
      setFormData({
        username: initialData.username || "",
        password: "",
        confirmPassword: "",
        role: initialData.role || ROLES.STUDENT,
        full_name: initialData.full_name || "",
        email: initialData.email || "",
        position_title: initialData.position_title || "",
        employee_id: initialData.employee_id || "",
        contact_number: initialData.contact_number || "",
        date_hired: initialData.date_hired || "",
        birthdate: initialData.birthdate || "",
        address: initialData.address || "",
        employment_status: initialData.employment_status || "",
        student_id_number: initialData.student_id_number || "",
        student_course: initialData.student_course || "",
        student_yr_level: initialData.student_yr_level || "",
        student_email: initialData.student_email || "",
        student_contact: initialData.student_contact || "",
        is_active: initialData.is_active ?? 1,
      });
    } else {
      setFormData({
        username: "",
        password: "",
        confirmPassword: "",
        role: ROLES.STUDENT,
        full_name: "",
        email: "",
        position_title: "",
        employee_id: "",
        contact_number: "",
        date_hired: "",
        birthdate: "",
        address: "",
        employment_status: "",
        student_id_number: "",
        student_course: "",
        student_yr_level: "",
        student_email: "",
        student_contact: "",
        is_active: 1,
      });
    }
    setErrors({});
  };

  const roleOptions = ROLE_HIERARCHY[currentUserRole] || [];

  const renderField = (label, name, type = "text", options = {}) => {
    const hasError = errors[name];
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label} {options.required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          name={name}
          value={formData[name] ?? ""}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
            hasError ? "border-red-400 dark:border-red-500" : "border-gray-300"
          }`}
          {...options}
        />
        {hasError && <p className="text-xs text-red-500 mt-1">{hasError}</p>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Default password for new users: <strong>{DEFAULT_SEED_PASSWORD}</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        {renderField("Username / ID No", "username", "text", { required: true })}
        {renderField("Password", "password", "password", { required: !isEditMode })}
        {renderField("Confirm Password", "confirmPassword", "password", { required: !isEditMode })}
        {
          !isEditMode && roleOptions.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
                  errors.role ? "border-red-400" : "border-gray-300"
                }`}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role}</p>}
            </div>
          )
        }

        {renderField("Full Name", "full_name")}
        {renderField("Email", "email", "email")}
        {renderField("Position Title", "position_title")}
        {renderField("Employee ID", "employee_id")}
        {renderField("Contact Number", "contact_number")}
        {renderField("Date Hired", "date_hired", "date")}
        {renderField("Birthdate", "birthdate", "date")}
      </div>

      {renderField("Address", "address")}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Employment Status
        </label>
        <select
          name="employment_status"
          value={formData.employment_status}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="">Select status</option>
          <option value="Regular">Regular</option>
          <option value="Probationary">Probationary</option>
          <option value="Part-time">Part-time</option>
          <option value="Contract">Contract</option>
        </select>
      </div>

      {formData.role === ROLES.STUDENT && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          {renderField("Student ID Number", "student_id_number")}
          {renderField("Student Course", "student_course")}
          {renderField("Student Year Level", "student_yr_level")}
          {renderField("Student Email", "student_email", "email")}
          {renderField("Student Contact", "student_contact")}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
