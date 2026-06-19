// generateReport.js
// Usage: node generateReport.js <type> <dataJson> <outputPath>
// type: "general" | "individual"

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, AlignmentType, PageOrientation, BorderStyle, WidthType,
  ShadingType, VerticalAlign, Header,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ── Page settings (matching template: landscape, custom margins) ──────────────
// Template: w:pgSz w:h="12240" w:w="20160" orient="landscape"
// margins: top=1440 bottom=720 left=720 right=2160
const PAGE = {
  width: 20160,   // landscape long edge
  height: 12240,  // landscape short edge
  marginTop: 1440,
  marginBottom: 720,
  marginLeft: 720,
  marginRight: 2160,
};
// Content width = 20160 - 720 - 2160 = 17280 DXA
const CONTENT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight; // 17280

// ── Colors ────────────────────────────────────────────────────────────────────
const COLOR_NAVY  = "132F45";
const COLOR_AMBER = "EEA23A";
const COLOR_GREY  = "666666";
const COLOR_WHITE = "FFFFFF";
const COLOR_ROW_ALT = "F3F6F9";
const COLOR_HEADER_BG = "132F45";

// ── Helpers ───────────────────────────────────────────────────────────────────
function cell(text, opts = {}) {
  const {
    bold = false, size = 18, color = "1a1a1a", bg = null,
    align = AlignmentType.LEFT, width, isHeader = false,
  } = opts;

  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      left:   { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      right:  { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    },
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text: String(text ?? "—"), bold, size, color, font: "Arial" })],
      }),
    ],
  });
}

function headerCell(text, width) {
  return cell(text, {
    bold: true, size: 17, color: COLOR_WHITE,
    bg: COLOR_HEADER_BG, isHeader: true, width,
  });
}

function dataRow(cells, isAlt) {
  return new TableRow({
    children: cells.map(([text, width, opts = {}]) =>
      cell(text, { size: 17, bg: isAlt ? COLOR_ROW_ALT : COLOR_WHITE, width, ...opts })
    ),
  });
}

function spacer(pts = 80) {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [] });
}

function sectionTitle(text) {
  return new Paragraph({
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({ text, bold: true, size: 22, color: COLOR_NAVY, font: "Arial" }),
    ],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_AMBER, space: 1 },
    },
  });
}

// ── Letterhead image (embedded from template) ─────────────────────────────────
function makeLetterhead(imgBuffer) {
  // Original image: 1309×193 px. Scale to fit content width in landscape.
  // Content width = 17280 DXA = 17280/1440 * 914400 EMU = 10,973,520 EMU
  // Preserve aspect ratio: height = width * (193/1309)
  const imgWidthEMU  = 10_973_520;
  const imgHeightEMU = Math.round(imgWidthEMU * (193 / 1309));

  return new Paragraph({
    spacing: { before: 0, after: 160 },
    children: [
      new ImageRun({
        data: imgBuffer,
        transformation: { width: Math.round(imgWidthEMU / 9144), height: Math.round(imgHeightEMU / 9144) },
        type: "png",
      }),
    ],
  });
}

function dividerLine() {
  return new Paragraph({
    spacing: { before: 0, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_AMBER, space: 1 },
    },
    children: [],
  });
}

// ── Report metadata block ─────────────────────────────────────────────────────
function metaRow(label, value) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18, color: COLOR_NAVY, font: "Arial" }),
      new TextRun({ text: value, size: 18, color: COLOR_GREY, font: "Arial" }),
    ],
  });
}

// ── GENERAL REPORT ────────────────────────────────────────────────────────────
function buildGeneral(data, imgBuffer) {
  const { records, generatedAt, totalRecords } = data;

  // Column widths must sum to CONTENT_WIDTH (17280)
  // #(600) | Name(2800) | ID(1800) | Course(2200) | Year(1200) | CheckIn(2480) | CheckOut(2400) | Duration(1500) | Status(1800) = 16780... adjust
  const cols = [
    { label: "#",            w: 550  },
    { label: "Student Name", w: 2900 },
    { label: "ID Number",    w: 1900 },
    { label: "Course",       w: 2200 },
    { label: "Year Level",   w: 1300 },
    { label: "Check In",     w: 2530 },
    { label: "Check Out",    w: 2530 },
    { label: "Duration",     w: 1570 },
    { label: "Status",       w: 1800 },
  ];
  // Verify sum: 550+2900+1900+2200+1300+2530+2530+1570+1800 = 17280 ✓

  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map(c => headerCell(c.label, c.w)),
  });

  const dataRows = records.map((r, i) =>
    dataRow([
      [i + 1,                         cols[0].w],
      [r.student_name,                cols[1].w],
      [r.student_id_number,           cols[2].w],
      [r.student_course || "—",       cols[3].w],
      [r.student_yr_level || "—",     cols[4].w],
      [r.check_in_time,               cols[5].w],
      [r.check_out_time || "—",       cols[6].w],
      [r.duration,                    cols[7].w],
      [r.status,                      cols[8].w],
    ], i % 2 === 1)
  );

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.LANDSCAPE },
          margin: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
        },
      },
      children: [
        makeLetterhead(imgBuffer),
        dividerLine(),
        spacer(120),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "LIBRARY ATTENDANCE REPORT", bold: true, size: 28, color: COLOR_NAVY, font: "Arial" }),
          ],
        }),
        spacer(80),
        metaRow("Generated",     generatedAt),
        metaRow("Total Records", String(totalRecords)),
        spacer(120),
        sectionTitle("Attendance Records"),
        spacer(80),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: cols.map(c => c.w),
          rows: [headerRow, ...dataRows],
        }),
        spacer(160),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Lexora Digital Library Management System", size: 16, color: COLOR_GREY, font: "Arial", italics: true }),
          ],
        }),
      ],
    }],
  });
}

// ── INDIVIDUAL REPORT ─────────────────────────────────────────────────────────
function buildIndividual(data, imgBuffer) {
  const { person, history, generatedAt } = data;
  const totalMins  = history.reduce((a, r) => a + (r.duration_mins || 0), 0);
  const totalHours = (totalMins / 60).toFixed(1);

  const cols = [
    { label: "#",         w: 700  },
    { label: "Date",      w: 2200 },
    { label: "Check In",  w: 3500 },
    { label: "Check Out", w: 3500 },
    { label: "Duration",  w: 2080 },
    { label: "Status",    w: 5300 },
  ];
  // 700+2200+3500+3500+2080+5300 = 17280 ✓

  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map(c => headerCell(c.label, c.w)),
  });

  const dataRows = history.map((r, i) =>
    dataRow([
      [i + 1,                   cols[0].w],
      [r.date,                  cols[1].w],
      [r.check_in_time,         cols[2].w],
      [r.check_out_time || "—", cols[3].w],
      [r.duration,              cols[4].w],
      [r.status,                cols[5].w],
    ], i % 2 === 1)
  );

  return new Document({
    sections: [{
      properties: {
        page: {
          size: { width: PAGE.width, height: PAGE.height, orientation: PageOrientation.LANDSCAPE },
          margin: { top: PAGE.marginTop, bottom: PAGE.marginBottom, left: PAGE.marginLeft, right: PAGE.marginRight },
        },
      },
      children: [
        makeLetterhead(imgBuffer),
        dividerLine(),
        spacer(120),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "STUDENT ATTENDANCE HISTORY", bold: true, size: 28, color: COLOR_NAVY, font: "Arial" }),
          ],
        }),
        spacer(80),
        metaRow("Student Name", person.student_name),
        metaRow("ID Number",    person.student_id_number),
        ...(person.student_course  ? [metaRow("Course",    person.student_course)]  : []),
        ...(person.student_yr_level ? [metaRow("Year Level", person.student_yr_level)] : []),
        metaRow("Total Visits",  String(history.length)),
        metaRow("Total Hours",   `${totalHours}h`),
        metaRow("Generated",     generatedAt),
        spacer(120),
        sectionTitle("Visit History"),
        spacer(80),
        new Table({
          width: { size: CONTENT_WIDTH, type: WidthType.DXA },
          columnWidths: cols.map(c => c.w),
          rows: [headerRow, ...dataRows],
        }),
        spacer(160),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Lexora Digital Library Management System", size: 16, color: COLOR_GREY, font: "Arial", italics: true }),
          ],
        }),
      ],
    }],
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const [,, type, dataJson, outputPath] = process.argv;
  if (!type || !dataJson || !outputPath) {
    console.error("Usage: node generateReport.js <general|individual> <dataJson> <outputPath>");
    process.exit(1);
  }

  const data      = JSON.parse(dataJson);
  const imgBuffer = fs.readFileSync(path.join(__dirname, "letterhead.png"));
  const doc       = type === "general" ? buildGeneral(data, imgBuffer) : buildIndividual(data, imgBuffer);
  const buffer    = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log("OK");
}

main().catch(err => { console.error(err); process.exit(1); });
