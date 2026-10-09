import { ROLES, ROLE_LABELS, ROLE_HIERARCHY, DEFAULT_SEED_PASSWORD } from "../../../constants/roles";

export function validateUserForm(formData, currentUser = null) {
  const errors = {};

  if (!formData.username || formData.username.trim().length < 2) {
    errors.username = "Username must be at least 2 characters";
  }
  if (formData.username && formData.username.trim().length > 100) {
    errors.username = "Username must be at most 100 characters";
  }

  if (!currentUser && (!formData.password || formData.password.length < 6)) {
    errors.password = "Password must be at least 6 characters";
  }
  if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }
  if (formData.password !== formData.confirmPassword && formData.password) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Must be a valid email address";
  }

  if (formData.full_name && formData.full_name.length > 255) {
    errors.full_name = "Full name must be at most 255 characters";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}

export function getRoleOptions(currentUserRole) {
  const allowedRoles = ROLE_HIERARCHY[currentUserRole] || [];
  return allowedRoles.map((role) => ({
    value: role,
    label: ROLE_LABELS[role] || role,
    description: role,
  }));
}

export function formatUserForDisplay(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    fullName: user.full_name || user.username,
    email: user.email || "",
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    avatarUrl: user.avatar_url || null,
  };
}

export const defaultFormValues = {
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
  avatar_url: null,
};

export { DEFAULT_SEED_PASSWORD, ROLES, ROLE_LABELS };
