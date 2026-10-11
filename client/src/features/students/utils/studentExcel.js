/**
 * features/students/utils/studentExcel.js
 *
 * Excel parsing + template generation for the student bulk import.
 * Extracted verbatim from the page body of the former pages/Students.jsx,
 * including the year-level detection from sheet names.
 */

import { SAMPLE_TEMPLATE_ROWS, TEMPLATE_FILE_NAME } from "../constants/studentsUi";

/** Year level implied by a worksheet name ("1st Year", "Year 2", "First", …). */
function yearLevelFromSheetName(sheetName) {
  const sheetNameLower = sheetName.toLowerCase();

  const numericMatch = sheetNameLower.match(/(\d+)/);
  if (numericMatch) {
    const sheetNumber = parseInt(numericMatch[1]);
    if (sheetNumber === 1) return "1st Year";
    if (sheetNumber === 2) return "2nd Year";
    if (sheetNumber === 3) return "3rd Year";
    if (sheetNumber === 4) return "4th Year";
  }

  if (sheetNameLower.includes("1st") || sheetNameLower.includes("first")) return "1st Year";
  if (sheetNameLower.includes("2nd") || sheetNameLower.includes("second")) return "2nd Year";
  if (sheetNameLower.includes("3rd") || sheetNameLower.includes("third")) return "3rd Year";
  if (sheetNameLower.includes("4th") || sheetNameLower.includes("fourth")) return "4th Year";
  return "";
}

/** Map one worksheet row onto a student record. */
function rowToStudent(row, yearLevel) {
  let studentName = row["Display Name"] || row["display_name"] || "";
  if (!studentName) {
    const firstName = row["First Name"] || row["first_name"] || "";
    const lastName  = row["Last Name"]  || row["last_name"]  || "";
    studentName = `${firstName} ${lastName}`.trim();
  }

  return {
    student_id_number: row["Username"] || row["username"] || "",
    student_name: studentName,
    student_course: "",
    student_yr_level: yearLevel,
    student_email: row["Email"] || row["email"] || "",
    student_contact: "",
    display_name: row["Display Name"] || row["display_name"] || "",
    first_name: row["First Name"] || row["first_name"] || "",
    last_name: row["Last Name"] || row["last_name"] || "",
    senior_high_school: row["Senior High School"] || row["senior_high_school"] || "",
    strand: row["Strand"] || row["strand"] || "",
    school_address: row["School Address"] || row["school_address"] || "",
  };
}

/**
 * Parse every worksheet of the uploaded workbook into student rows.
 * Rejects on read/parse failure.
 */
export async function parseStudentsExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(data, { type: "array" });

        let allStudentsData = [];
        for (let sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const yearLevel = yearLevelFromSheetName(sheetName);

          const studentsData = jsonData
            .map(row => rowToStudent(row, yearLevel))
            .filter(student => student.student_id_number && student.student_name);

          allStudentsData = [...allStudentsData, ...studentsData];
        }

        resolve(allStudentsData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsArrayBuffer(file);
  });
}

/** Download the sample import template. */
export async function downloadStudentTemplate() {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  XLSX.writeFile(workbook, TEMPLATE_FILE_NAME);
}
