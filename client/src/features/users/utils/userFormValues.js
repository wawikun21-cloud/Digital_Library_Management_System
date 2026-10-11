import { ROLES } from "../../../constants/roles";
import { defaultFormValues } from "../validation/userValidation";

/**
 * Empty add-user form. `defaultFormValues` is the validation module's
 * canonical shape — the blank password fields and is_active default are
 * added here so both the field list and the form stay in sync.
 */
export const EMPTY_USER_FORM = {
  ...defaultFormValues,
  password: "",
  confirmPassword: "",
  is_active: 1,
};

/** Keep only the YYYY-MM-DD part a date input can display. */
function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

/**
 * Maps a user record (or null for create mode) onto form values.
 *
 * One implementation shared by the initial state and the Reset button —
 * they used to be two copies of the same 20-key literal, which drifted
 * whenever a field was added to one and not the other.
 */
export function toUserFormValues(initialData) {
  if (!initialData) return { ...EMPTY_USER_FORM };

  return {
    ...EMPTY_USER_FORM,
    username: initialData.username || "",
    role: initialData.role || ROLES.STUDENT,
    full_name: initialData.full_name || "",
    email: initialData.email || "",
    position_title: initialData.position_title || "",
    employee_id: initialData.employee_id || "",
    contact_number: initialData.contact_number || "",
    date_hired: toDateInput(initialData.date_hired),
    birthdate: toDateInput(initialData.birthdate),
    address: initialData.address || "",
    employment_status: initialData.employment_status || "",
    student_id_number: initialData.student_id_number || "",
    student_course: initialData.student_course || "",
    student_yr_level: initialData.student_yr_level || "",
    student_email: initialData.student_email || "",
    student_contact: initialData.student_contact || "",
    is_active: initialData.is_active ?? 1,
  };
}
