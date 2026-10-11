/**
 * features/faculty/utils/facultyImport.js
 *
 * Excel import helpers for the bulk-import modal. Extracted from the
 * page-body logic of the former pages/Faculty.jsx.
 */

import { DEPARTMENTS } from "../constants/facultyUi";

export const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/;

export function isExcelFile(name) {
  return EXCEL_EXTENSIONS.test(name);
}

/**
 * Parse the first worksheet of an uploaded workbook into faculty rows.
 * Accepts the `Faculty Name` / `faculty_name` / `Name` and
 * `Department` / `department` column aliases; rows missing either value
 * are dropped. Rejects on read/parse failure.
 */
export async function parseFacultyExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const wb   = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);
        const parsed = rows
          .map(row => ({
            faculty_name: (row["Faculty Name"] || row["faculty_name"] || row["Name"] || "").toString().trim(),
            department:   (row["Department"]   || row["department"]   || "").toString().trim(),
          }))
          .filter(r => r.faculty_name && r.department);
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

/** Download the sample import template (`faculty_import_template.xlsx`). */
export async function downloadFacultyTemplate() {
  const XLSX = await import("xlsx");
  const ws   = XLSX.utils.json_to_sheet([
    { "Faculty Name": "Juan Dela Cruz", "Department": "CIT" },
    { "Faculty Name": "Maria Santos",   "Department": "CEAS" },
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Faculty");
  XLSX.writeFile(wb, "faculty_import_template.xlsx");
}

/**
 * Pre-flight check: message naming the invalid department codes (up to 3,
 * unique, quoted) plus the valid list — or null when every row is valid.
 */
export function invalidDepartmentMessage(rows) {
  const validCodes = DEPARTMENTS.map(d => d.code);
  const invalidRows = rows.filter(r => !validCodes.includes(r.department));
  if (invalidRows.length === 0) return null;

  const names = [...new Set(invalidRows.map(r => `"${r.department}"`))]
    .slice(0, 3).join(", ");
  const extra = invalidRows.length > 3 ? ` and ${invalidRows.length - 3} more` : "";
  return `Invalid department code(s): ${names}${extra}. Valid: ${validCodes.join(", ")}.`;
}
