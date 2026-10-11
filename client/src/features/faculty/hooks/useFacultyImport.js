/**
 * features/faculty/hooks/useFacultyImport.js
 *
 * Bulk-import state machine: file selection, Excel parsing, preview,
 * department pre-flight and the import call. Extracted from the page body
 * of the former pages/Faculty.jsx.
 */

import { useState, useCallback, useRef } from "react";
import { bulkImportFaculty } from "../../../services/api/studentsApi";
import {
  isExcelFile, parseFacultyExcel, downloadFacultyTemplate, invalidDepartmentMessage,
} from "../utils/facultyImport";

export function useFacultyImport({ showToast, onImported }) {
  const [importFile,   setImportFile]   = useState(null);
  const [parsedData,   setParsedData]   = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const resetFileInput = () => {
    setImportFile(null);
    setParsedData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /** Full reset used when the modal closes. */
  const reset = useCallback(() => {
    resetFileInput();
    setImportResult(null);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isExcelFile(file.name)) {
      showToast("Please select a valid Excel file (.xlsx or .xls)", "error");
      return;
    }
    setImportFile(file);
    parseFacultyExcel(file)
      .then(parsed => {
        if (parsed.length === 0) {
          showToast("No valid faculty data found in the file", "error");
          return;
        }
        setParsedData(parsed);
        showToast(`Parsed ${parsed.length} faculty records`, "success");
      })
      .catch(() => showToast("Failed to parse Excel file", "error"));
  }, [showToast]);

  const removeFile = useCallback(() => {
    resetFileInput();
  }, []);

  const downloadTemplate = useCallback(() => {
    downloadFacultyTemplate().catch(() => showToast("Failed to download template", "error"));
  }, [showToast]);

  const handleBulkImport = useCallback(async () => {
    if (!parsedData) return;

    const invalid = invalidDepartmentMessage(parsedData);
    if (invalid) { showToast(invalid, "error"); return; }

    try {
      const data = await bulkImportFaculty(parsedData);
      if (data.success) {
        setImportResult(data.data);
        setParsedData(null);
        showToast(`Imported ${data.data.successful} faculty records`, "success");
        onImported?.();
      } else {
        showToast(data.error || "Import failed", "error");
      }
    } catch { showToast("Failed to connect to server", "error"); }
  }, [parsedData, showToast, onImported]);

  return {
    importFile, parsedData, importResult, fileInputRef,
    handleFileChange, removeFile, downloadTemplate, handleBulkImport, reset,
  };
}
