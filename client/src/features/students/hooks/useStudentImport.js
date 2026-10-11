/**
 * features/students/hooks/useStudentImport.js
 *
 * Bulk-import state machine: file selection, Excel parsing, course / school
 * year selection, the simulated progress bar, the import call and results.
 * Extracted from the component body of the former pages/Students.jsx.
 */

import { useState, useCallback, useRef } from "react";
import { bulkImportStudents } from "../../../services/api/studentsApi";
import { parseStudentsExcel, downloadStudentTemplate } from "../utils/studentExcel";
import { validateImportFields } from "../validation/studentValidation";
import { schoolYearOptions } from "../utils/studentFilters";
import { IMPORT_SY_COUNT } from "../constants/studentsUi";

const EXCEL_EXTENSIONS = /\.(xlsx|xls)$/;

export function useStudentImport({ showToast, onImported }) {
  const [importFile, setImportFile]           = useState(null);
  const [parsedStudentsData, setParsedStudentsData] = useState(null);
  const [importResult, setImportResult]       = useState(null);
  const [importCourse, setImportCourse]       = useState("");
  const [importSchoolYear, setImportSchoolYear] = useState("");
  const [isImporting, setIsImporting]         = useState(false);
  const [importProgress, setImportProgress]   = useState(0);
  const [importErrors, setImportErrors]       = useState({});
  const fileInputRef = useRef(null);

  const clearFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Full reset — used when closing the modal and by "Import Again". */
  const reset = useCallback(() => {
    setImportFile(null);
    setParsedStudentsData(null);
    setImportResult(null);
    setImportCourse("");
    setImportSchoolYear("");
    setImportProgress(0);
    setImportErrors({});
    clearFileInput();
  }, []);

  const removeFile = useCallback(() => {
    setImportFile(null);
    setParsedStudentsData(null);
    clearFileInput();
  }, []);

  // ── Handle file upload for bulk import ──────────────
  const handleFileChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.match(EXCEL_EXTENSIONS)) {
        showToast("Please select a valid Excel file", "error");
        return;
      }
      setImportFile(file);
      parseStudentsExcel(file)
        .then(allStudentsData => {
          if (allStudentsData.length > 0) {
            setParsedStudentsData(allStudentsData);
            showToast(`Successfully parsed ${allStudentsData.length} students from Excel file`, "success");
          } else {
            showToast("No valid student data found in the Excel file", "error");
          }
        })
        .catch(error => {
          console.error("Error parsing Excel file:", error);
          showToast("Failed to parse Excel file", "error");
        });
    }
  }, [showToast]);

  // ── Handle bulk import ───────────────────────────────
  const handleBulkImport = useCallback(async (studentsData) => {
    // ── Validate required import fields before touching the server ──
    const errs = validateImportFields({ importCourse, importSchoolYear });
    if (Object.keys(errs).length) {
      setImportErrors(errs);
      return;
    }
    setImportErrors({});
    setIsImporting(true);
    setImportProgress(0);

    // Simulate progress ticks while the real request is in-flight
    const totalSteps = 90; // advance to 90% then jump to 100 on success
    const interval = setInterval(() => {
      setImportProgress(prev => {
        if (prev >= totalSteps) {
          clearInterval(interval);
          return prev;
        }
        // slow down as it approaches 90 so it never "finishes" early
        const increment = prev < 60 ? 4 : prev < 80 ? 2 : 0.5;
        return Math.min(prev + increment, totalSteps);
      });
    }, 200);

    try {
      const studentsWithCourse = studentsData.map(student => ({
        ...student,
        student_course: importCourse,
        student_school_year: importSchoolYear
      }));

      const response = await bulkImportStudents(studentsWithCourse);
      clearInterval(interval);

      if (response.success) {
        setImportProgress(100);
        setImportResult(response.data);
        setParsedStudentsData(null);
        showToast(`Successfully imported ${response.data.successful} students`, "success");
        if (response.data.failed > 0) {
          showToast(`Failed to import ${response.data.failed} students. Check the results for details.`, "warning");
        }
        onImported?.();
      } else {
        setImportProgress(0);
        showToast(response.error || "Import failed", "error");
      }
    } catch (error) {
      clearInterval(interval);
      setImportProgress(0);
      showToast("Failed to import students", "error");
    } finally {
      setIsImporting(false);
    }
  }, [importCourse, importSchoolYear, showToast, onImported]);

  const setCourse = useCallback((value) => {
    setImportCourse(value);
    setImportErrors(p => ({ ...p, importCourse: "" }));
  }, []);

  const setSchoolYear = useCallback((value) => {
    setImportSchoolYear(value);
    setImportErrors(p => ({ ...p, importSchoolYear: "" }));
  }, []);

  const downloadTemplate = useCallback(() => {
    downloadStudentTemplate().catch(() => showToast("Failed to download template", "error"));
  }, [showToast]);

  /** Seed the modal-open default school year (June-based rule, verbatim). */
  const openWithDefaults = useCallback(() => {
    const now = new Date();
    const syStart = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    setImportSchoolYear(`${syStart}-${syStart + 1}`);
  }, []);

  const schoolYearChoices = schoolYearOptions(IMPORT_SY_COUNT);

  return {
    importFile, parsedStudentsData, importResult,
    importCourse, setCourse, importSchoolYear, setSchoolYear,
    isImporting, importProgress, importErrors,
    schoolYearChoices,
    fileInputRef,
    handleFileChange, removeFile, handleBulkImport, downloadTemplate,
    openWithDefaults, reset,
  };
}
