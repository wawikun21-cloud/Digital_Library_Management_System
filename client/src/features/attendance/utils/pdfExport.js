/**
 * features/attendance/utils/pdfExport.js
 *
 * Shared jsPDF + autoTable export for the attendance dashboard modals.
 * Extracted from the former pages/AttendanceDashboard.jsx (the two modals
 * had identical document scaffolding with different tables).
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * @param {object}   opts
 * @param {string}   opts.title          Document heading.
 * @param {string[]} opts.headers        autoTable head row.
 * @param {Array[]}  opts.rows           autoTable body rows.
 * @param {string}   opts.fileName       Save-as filename.
 * @param {object}   [opts.columnStyles] autoTable columnStyles.
 */
export function exportTablePdf({ title, headers, rows, fileName, columnStyles }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 35,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [19, 47, 69] },
    columnStyles,
  });

  doc.save(fileName);
}
