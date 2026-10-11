/**
 * features/faculty/constants/facultyUi.js
 *
 * Departments, palette and page size for faculty management. Extracted from
 * the module scope of the former pages/Faculty.jsx.
 */

export const FACULTY_PER_PAGE = 10;

export const DEPARTMENTS = [
  { code: 'CIT',  label: 'CIT – College of Information Technology' },
  { code: 'CCJE', label: 'CCJE – College of Criminal Justice Education' },
  { code: 'CEAS', label: 'CEAS – College of Education, Arts and Sciences' },
  { code: 'CBE',  label: 'CBE – College of Business Education' },
  { code: 'HS',   label: 'HS – Highschool' },
];

// Department color palette — navy/gold brand theme
export const DEPT_COLORS = {
  CIT:  { bg: 'rgba(30,58,123,0.1)',   text: '#2d4fa3', badge: 'rgba(30,58,123,0.08)'   },
  CCJE: { bg: 'rgba(238,162,58,0.12)', text: '#b87a1a', badge: 'rgba(238,162,58,0.1)'   },
  CEAS: { bg: 'rgba(30,58,123,0.07)',  text: '#1e3a7b', badge: 'rgba(30,58,123,0.06)'   },
  CBE:  { bg: 'rgba(238,162,58,0.08)', text: '#c8860e', badge: 'rgba(238,162,58,0.08)'  },
  HS:   { bg: 'rgba(45,79,163,0.1)',   text: '#3a5fbf', badge: 'rgba(45,79,163,0.08)'   },
};
export const DEFAULT_COLOR = { bg: 'rgba(30,58,123,0.08)', text: '#2d4fa3', badge: 'rgba(30,58,123,0.06)' };

export const EMPTY_FORM = { faculty_name: '', department: '' };
