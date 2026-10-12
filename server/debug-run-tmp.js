const { detectTocEntries } = require("./debug-detect-tmp.js");

const pages = Array.from({ length: 2000 }, (_, i) => ({
  pageNumber: i + 1,
  lines: [
    { text: `Chapter ${i + 1}: Title ${i + 1}`, size: 15, bold: false, y: 0 },
    { text: "Body text", size: 14, bold: false, y: 0 },
    { text: "More body text", size: 14, bold: false, y: 0 },
  ],
}));

const r = detectTocEntries({ pages });
console.log("entries:", r.entries.length, "median:", r.stats.medianFontSize, "furniture:", r.stats.runningHeadersFiltered);
console.log("last:", JSON.stringify(r.entries[r.entries.length - 1]));
