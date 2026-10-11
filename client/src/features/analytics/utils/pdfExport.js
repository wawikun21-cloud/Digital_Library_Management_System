/**
 * features/analytics/utils/pdfExport.js
 *
 * Shared jsPDF export for the book dashboard modals. Each caller prepares
 * its rows as arrays of three text lines; the pagination and document
 * mechanics live here so the two modals cannot drift apart.
 */

import jsPDF from "jspdf";

/**
 * @param {object}   opts
 * @param {string}   opts.title    Document heading.
 * @param {string}   opts.fileName Save-as filename.
 * @param {string[][]} opts.rows   Each entry is the 3 text lines of one record.
 */
export function exportRowsPdf({ title, fileName, rows }) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 10, 10);
  doc.setFontSize(12);
  let y = 20;
  rows.forEach((row) => {
    if (y > 270) { doc.addPage(); y = 10; }
    doc.text(row[0], 10, y); y += 6;
    doc.text(row[1], 10, y); y += 6;
    doc.text(row[2], 10, y); y += 10;
  });
  doc.save(fileName);
}
