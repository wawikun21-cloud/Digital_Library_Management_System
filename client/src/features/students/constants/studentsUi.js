/**
 * features/students/constants/studentsUi.js
 *
 * Page size, form shape and option lists for student management. Extracted
 * from the module scope and render body of the former pages/Students.jsx.
 */

export const STUDENTS_PER_PAGE = 10;

/** Blank add-form shape (the modal seeds `student_school_year` separately). */
export const EMPTY_FORM = {
  student_id_number: "",
  student_name: "",
  student_course: "",
  student_yr_level: "",
  student_school_year: "",
  student_email: "",
  student_contact: "",
  display_name: "",
  first_name: "",
  last_name: "",
  senior_high_school: "",
  strand: "",
  school_address: "",
};

/** Number of school years offered in the import dropdown. */
export const IMPORT_SY_COUNT = 6;

export const COURSES = ["BSIT", "BEED", "BSED", "BA", "BSCRIM"];

export const YEAR_LEVEL_OPTIONS = ["", "1st Year", "2nd Year", "3rd Year", "4th Year"];

/** Field-config array that drives the add/edit form. */
export const FORM_FIELDS = [
  { label: "Student ID Number", key: "student_id_number", type: "text", required: true, placeholder: "Enter student ID number" },
  { label: "Student Name",      key: "student_name",      type: "text", required: true, placeholder: "Enter student name" },
  { label: "Course",            key: "student_course",    type: "text", required: true, placeholder: "Enter course (e.g., BSIT)" },
  { label: "Year Level",        key: "student_yr_level",  type: "select", options: YEAR_LEVEL_OPTIONS },
  { label: "School Year",       key: "student_school_year", type: "text", required: true, placeholder: "Enter school year (e.g., 2023-2024)" },
  { label: "Email",             key: "student_email",     type: "email", placeholder: "Enter email address" },
  { label: "Contact Number",    key: "student_contact",   type: "text", placeholder: "Enter contact number" },
  { label: "Senior High School", key: "senior_high_school", type: "text", required: false, placeholder: "Enter senior high school name" },
  { label: "Strand",            key: "strand",            type: "text", placeholder: "Enter strand (e.g., GAS, STEM, ABM)" },
  { label: "School Address",    key: "school_address",    type: "text", placeholder: "Enter address of senior high school" },
];

/** Sample row of the downloadable import template. */
export const SAMPLE_TEMPLATE_ROWS = [
  {
    Username: "202112345",
    Email: "john.doe@example.com",
    Password: "password123",
    "Display Name": "John Doe",
    Role: "student",
    "First Name": "John",
    "Last Name": "Doe",
    "Senior High School": "Sample Senior High School",
    Strand: "GAS",
    "School Address": "123 Sample Street, City",
  },
];

export const TEMPLATE_FILE_NAME = "student_import_template.xlsx";
