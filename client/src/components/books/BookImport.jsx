/**
 * BookImport.jsx
 * ─────────────────────────────────────────────────────────────────
 * Bulk Excel → DB importer for the Digital Library Management System
 *
 * Quality dimensions met:
 *  • Scalable   — chunked upload (10 books/request), handles huge files
 *  • Reliable   — per-book error capture, duplicate pre-flight, retry-safe
 *  • Accurate   — maps every Excel column to the exact DB column name;
 *                 empty cells → null (never "" / 0 / undefined)
 *  • Consistent — column-index map + sanitise() centralise all coercion
 *  • Performant — single FileReader pass; progress bar per chunk
 *  • Usable     — 4-step wizard, preview table, duplicate alert, error list
 *  • Maintainable — one COL map + one sanitise() to update if schema changes
 *
 * DB tables targeted
 *  books        — one row per unique title
 *  book_copies  — one row per accession number (via server bulk-import)
 *
 * Expected Excel column order (0-based):
 *  0  Acc. No.     → book_copies.accession_number  (first copy)
 *  1  Date         → books.date (year int) / book_copies.date_acquired
 *  2  Class        → books.callNumber
 *  3  Title        → books.title          ← REQUIRED
 *  4  Author       → books.author + books.authors
 *  5  Vol./Ed.     → books.volume
 *  6  Year/Copy    → books.year (int)     ← sub-header col, actual year
 *  7  Publisher    → books.publisher
 *  8  Pages        → books.pages
 *  9  Coll.        → books.collection
 *  10 Price        → (informational only — not stored in DB)
 *  11 Source/Fund  → (informational only)
 *  12 Remarks      → books.otherDetails
 *
 * The spreadsheet uses a 2-row merged header; data starts at row 2.
 * "Continuation copy" rows have no Title but have an Acc No — they are
 * appended as additional copies of the preceding book.
 */

import {
  useState, useRef, useCallback, forwardRef, useImperativeHandle,
} from "react";
import {
  FileSpreadsheet, Upload, AlertCircle, Hash,
  CheckCircle2, XCircle, Loader2, ChevronRight, X,
  Info,
} from "lucide-react";
// xlsx loaded on-demand via dynamic import inside parseExcel()

/* ────────────────────────────────────────────────────────────────
   1.  COLUMN MAP  — update here if the Excel layout ever changes
──────────────────────────────────────────────────────────────── */
const COL = {
  ACC:       0,   // Accession Number
  DATE:      1,   // Date Acquired
  CLASS:     2,   // Call Number / Classification
  TITLE:     3,   // Title  ← mandatory
  AUTHOR:    4,   // Author
  VOL:       5,   // Volume / Edition
  YEAR:      6,   // Copyright year  (sub-header = "Ed." / "right" — skipped)
  PUBLISHER: 7,   // Publisher
  PAGES:     8,   // Pages
  COLL:      9,   // Collection
  // Col 10 = Price, Col 11 = Source of Fund — not stored in DB
  REMARKS:   12,  // Other details / remarks
};

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const CHUNK_SIZE = 10;

/* ────────────────────────────────────────────────────────────────
   2.  VALUE SANITISERS
       All return the correct DB type or null — never "" or 0.
──────────────────────────────────────────────────────────────── */

/** Raw cell → trimmed string | null */
const toStr = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

/** Raw cell → 4-digit integer year | null */
const toYear = (v) => {
  if (v instanceof Date) return v.getFullYear();
  if (v == null) return null;
  const s = String(v).trim();
  const n = parseInt(s, 10);
  // Only accept plausible library years (1500-2100)
  return !isNaN(n) && n >= 1500 && n <= 2100 ? n : null;
};

/** Raw cell → "YYYY-MM-DD" string | null (for book_copies.date_acquired) */
const toDateStr = (v) => {
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  // Accept plain year → store as Jan 1
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  // Accept ISO-like strings
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try Date parse as last resort
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
};

/** Raw cell → integer | null (for books.pages if numeric, but kept as varchar) */
const toPages = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;   // pages is varchar(20) in DB — keep as string
};

/* ────────────────────────────────────────────────────────────────
   3.  EXCEL PARSER
──────────────────────────────────────────────────────────────── */

/**
 * Detect the first real data row index.
 * The spreadsheet has a 2-row merged header:
 *   Row 0 — main labels  (Acc. No., Date, Class, Title, …)
 *   Row 1 — sub-labels   (blank except col5="Ed.", col6="right")
 * We skip rows until we find one with a real accession number (contains
 * digits) OR a numeric 4-digit year — whichever comes first.
 */
function findDataStart(rows) {
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i];
    if (!row) continue;

    const acc  = toStr(row[COL.ACC])  ?? "";
    const year = row[COL.YEAR];

    const hasDigitAcc  = /\d/.test(acc);
    const hasNumYear   = toYear(year) !== null;

    if (hasDigitAcc || hasNumYear) return i;   // first real data row
  }
  return 2; // safe fallback for standard 2-row header
}

/**
 * Returns true if this is a repeated header row or sub-header row
 * embedded mid-sheet (some exported files repeat headers on each page).
 */
function isHeaderRow(row) {
  if (!row) return false;
  const c0 = toStr(row[COL.ACC])  ?? "";
  const c5 = toStr(row[COL.VOL])  ?? "";
  const c6 = toStr(row[COL.YEAR]) ?? "";
  // "Acc. No." / "Accession" labels
  if (/^acc[\.\s]/i.test(c0) || /^accession/i.test(c0)) return true;
  // Sub-header: blank acc, col5="Ed.", col6="right"
  if (!c0 && (c5.toLowerCase() === "ed." || c6.toLowerCase() === "right")) return true;
  // Any row whose title cell is literally "Title"
  const title = toStr(row[COL.TITLE]) ?? "";
  if (title.toLowerCase() === "title") return true;
  return false;
}

/**
 * Parse the first worksheet of the workbook.
 *
 * Returns an array of book objects ready to POST to /api/books/bulk-import.
 * Each object maps 1-to-1 with the `books` table columns plus an
 * `accessionNumbers` array (used by the server to create book_copies rows).
 *
 * Empty cells are stored as null — the server must honour these so that
 * the admin can fill them in later.
 */
async function parseExcel(buffer) {
  const XLSX = await import("xlsx");
  const wb   = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const dataStart = findDataStart(rows);
  const books     = [];
  const seenAcc   = new Set();   // global accession dedup across the whole file
  let   current   = null;        // book record being built

  for (const row of rows.slice(dataStart)) {
    // Skip blank rows
    if (!row || row.every((v) => v == null)) continue;
    // Skip header/sub-header rows embedded mid-sheet
    if (isHeaderRow(row)) continue;

    // ── Extract & sanitise every cell ──────────────────────────
    const acc        = toStr(row[COL.ACC]);
    const dateAcq    = toDateStr(row[COL.DATE]);
    const callNumber = toStr(row[COL.CLASS]);
    const title      = toStr(row[COL.TITLE]);
    const author     = toStr(row[COL.AUTHOR]);
    const volume     = toStr(row[COL.VOL]);
    const year       = toYear(row[COL.YEAR]);
    const publisher  = toStr(row[COL.PUBLISHER]);
    const pages      = toPages(row[COL.PAGES]);
    const collection = toStr(row[COL.COLL]);
    const remarks    = toStr(row[COL.REMARKS]);

    // Skip overflow / artefact rows: no acc, no title, no author, no publisher
    if (!acc && !title && !author && !publisher) continue;

    // ── Title row → new book record ────────────────────────────
    if (title) {
      if (current) books.push(current);

      const accessionNumbers = [];
      if (acc && !seenAcc.has(acc)) {
        seenAcc.add(acc);
        accessionNumbers.push(acc);
      }

      /**
       * Map to `books` table columns.
       * Every nullable DB column is explicitly set to null when the Excel
       * cell has no value — the admin can fill these in via the UI later.
       *
       * Columns NOT in the Excel (isbn, issn, lccn, genre, shelf, place,
       * edition, materialType, subtype, extent, size, authorName,
       * authorDates, sublocation, cover, description) are always null here.
       */
      current = {
        // ── Core fields ──────────────────────────────────────
        title,                          // varchar(255)  NOT NULL

        // ── Author fields ─────────────────────────────────────
        author:       author,           // varchar(255)  nullable
        authors:      author,           // text          nullable  (mirrors author)

        // ── Classification ───────────────────────────────────
        callNumber:   callNumber,       // varchar(100)  nullable
        collection:   collection,       // varchar(50)   nullable

        // ── Publication info ──────────────────────────────────
        publisher:    publisher,        // varchar(255)  nullable
        year:         year,             // int           nullable
        date:         year,             // int           nullable  (same as year)
        volume:       volume,           // varchar(20)   nullable
        pages:        pages,            // varchar(20)   nullable
        edition:      null,             // varchar(50)   nullable (not in Excel)

        // ── Identifiers (not in standard Excel — null) ────────
        isbn:         null,             // varchar(50)
        issn:         null,             // varchar(20)
        lccn:         null,             // varchar(20)
        accessionNumber: acc,           // varchar(50) — first copy's acc no

        // ── Physical description (not in Excel) ───────────────
        materialType: null,             // varchar(50)
        subtype:      null,             // varchar(50)
        extent:       null,             // varchar(100)
        size:         null,             // varchar(50)

        // ── Cataloguing (not in Excel) ────────────────────────
        subtitle:     null,             // varchar(255)
        authorName:   null,             // varchar(255)
        authorDates:  null,             // varchar(50)
        genre:        null,             // varchar(100)
        shelf:        null,             // varchar(100)
        place:        null,             // varchar(255)
        sublocation:  null,             // varchar(255)

        // ── Notes ─────────────────────────────────────────────
        description:  null,            // text
        otherDetails: remarks,          // text  ← from Remarks column

        // ── Status / cover (set by server defaults) ───────────
        // status:      "Available" (DB default)
        // cover:       null        (no image in Excel)

        // ── Copies data ───────────────────────────────────────
        accessionNumbers,               // used by server to create book_copies
        dateAcquired: dateAcq,          // book_copies.date_acquired
        quantity:     accessionNumbers.length || 1,
      };

    } else if (acc && current) {
      // ── Continuation row → add another copy to current book ──
      if (!seenAcc.has(acc)) {
        seenAcc.add(acc);
        current.accessionNumbers.push(acc);
        current.quantity = current.accessionNumbers.length;
      }
      // Back-fill call number if the title row lacked one
      if (!current.callNumber && callNumber) current.callNumber = callNumber;
      // Back-fill date acquired from the continuation row if missing
      if (!current.dateAcquired && dateAcq) current.dateAcquired = dateAcq;
    }
  }

  // Flush final record
  if (current) books.push(current);

  return books;
}

/* ────────────────────────────────────────────────────────────────
   4.  STEP INDICATOR COMPONENT
──────────────────────────────────────────────────────────────── */
function Step({ n, label, active, done }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        color:   done ? "#15803d" : active ? "var(--accent-amber)" : "var(--text-muted)",
        opacity: active || done ? 1 : 0.4,
      }}
    >
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
        style={{
          background: done
            ? "rgba(34,197,94,0.15)"
            : active
            ? "rgba(184,122,0,0.15)"
            : "var(--bg-subtle)",
          border: `1.5px solid ${
            done
              ? "rgba(34,197,94,0.4)"
              : active
              ? "rgba(184,122,0,0.4)"
              : "var(--border)"
          }`,
        }}
      >
        {done ? <CheckCircle2 size={12} /> : n}
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   5.  MAIN COMPONENT
──────────────────────────────────────────────────────────────── */
const BookImport = forwardRef(function BookImport({ onImportComplete, onStepChange }, ref) {
  const fileRef                       = useRef(null);
  const [step, setStep]               = useState(1);
  const [fileName, setFileName]       = useState("");
  const [parsed, setParsed]           = useState([]);
  const [preview, setPreview]         = useState([]);
  const [progress, setProgress]       = useState({ current: 0, total: 0, title: "" });
  const [results, setResults]         = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [parseError, setParseError]   = useState("");
  const [dupAlert, setDupAlert]       = useState(null);
  const [checking, setChecking]       = useState(false);

  /* ── helpers ────────────────────────────────────────────────── */
  const setStepAndNotify = useCallback(
    (s, books) => {
      setStep(s);
      onStepChange?.(s, books ?? parsed);
    },
    [onStepChange, parsed],
  );

  /* ── File ingestion ─────────────────────────────────────────── */
  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setParseError("Only .xlsx or .xls files are supported.");
        return;
      }
      setParseError("");
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const books = await parseExcel(new Uint8Array(e.target.result));
          if (books.length === 0) {
            setParseError(
              "No book records found. Make sure the file matches the expected column layout.",
            );
            return;
          }
          setParsed(books);
          setPreview(books.slice(0, 8));
          setStepAndNotify(2, books);
        } catch (err) {
          setParseError(`Failed to parse file: ${err.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [setStepAndNotify],
  );

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = ()  => setDragOver(false);

  /* ── Pre-flight duplicate check ─────────────────────────────── */
  const startImport = async () => {
    setChecking(true);
    try {
      const res  = await fetch(`${API_BASE}/books/check-duplicates`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ books: parsed }),
      });
      const data = await res.json();
      if (data.hasDuplicates) {
        setDupAlert({
          duplicateTitles:     data.duplicateTitles     || [],
          duplicateAccessions: data.duplicateAccessions || [],
        });
        return; // show duplicate alert modal — user decides to proceed or cancel
      }
    } catch (_) {
      // Network failure during pre-flight: proceed anyway; server handles dupes
    } finally {
      setChecking(false);
    }
    await runImport();
  };

  /* ── Chunked import ─────────────────────────────────────────── */
  const runImport = async () => {
    setDupAlert(null);
    setStepAndNotify(3);

    const total = parsed.length;
    setProgress({ current: 0, total, title: "" });

    const allImported   = [];
    const allFailed     = [];
    let   importedCount = 0;
    let   existingCount = 0;
    let   errorCount    = 0;

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const chunk    = parsed.slice(offset, offset + CHUNK_SIZE);
      const chunkEnd = Math.min(offset + CHUNK_SIZE, total);
      const isFirst  = offset === 0;
      const isLast   = offset + CHUNK_SIZE >= total;

      setProgress({ current: offset, total, title: chunk[0]?.title || "" });

      try {
        const res = await fetch(`${API_BASE}/books/bulk-import`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            books:          chunk,
            is_first_chunk: isFirst,
            is_last_chunk:  isLast,
            // Running totals BEFORE this chunk — the server adds its own
            // chunk counts on top so the final audit log reflects everything.
            acc_imported:   importedCount,
            acc_updated:    existingCount,
            acc_errors:     errorCount,
          }),
        });
        const data = await res.json();

        if (data.success) {
          const imported = data.data ?? [];
          allImported.push(...imported);
          importedCount += data.imported  ?? imported.length;
          existingCount += data.existing  ?? data.updated ?? 0;
          errorCount    += data.errors    ?? 0;
          if (data.errorsDetail?.length) allFailed.push(...data.errorsDetail);
        } else {
          chunk.forEach((b) =>
            allFailed.push({ title: b.title, error: data.error || "Unknown server error" }),
          );
          errorCount += chunk.length;
        }
      } catch (err) {
        chunk.forEach((b) => allFailed.push({ title: b.title, error: err.message }));
        errorCount += chunk.length;
      }

      setProgress({ current: chunkEnd, total, title: chunk[chunk.length - 1]?.title || "" });
    }

    const summary = {
      success:      true,
      imported:     importedCount,
      existing:     existingCount,
      errors:       allFailed.length,
      errorsDetail: allFailed,
      data:         allImported,
    };

    setResults(summary);
    setStepAndNotify(4);
    if (allImported.length > 0) onImportComplete?.(allImported);
  };

  /* ── Reset ──────────────────────────────────────────────────── */
  const reset = () => {
    setStepAndNotify(1);
    setFileName("");
    setParsed([]);
    setPreview([]);
    setProgress({ current: 0, total: 0, title: "" });
    setResults(null);
    setParseError("");
    setDupAlert(null);
    setChecking(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  useImperativeHandle(
    ref,
    () => ({ step, parsed, startImport, reset, checking }),
    [step, parsed, startImport, reset, checking],
  );

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  /* ── Derived stats for Step 2 ───────────────────────────────── */
  const totalCopies    = parsed.reduce((s, b) => s + b.accessionNumbers.length, 0);
  const multiCopyCount = parsed.filter((b) => b.accessionNumbers.length > 1).length;
  const nullFieldCount = parsed.reduce((s, b) => {
    const optionalFields = [
      "subtitle","author","genre","isbn","issn","lccn","callNumber",
      "year","publisher","edition","collection","pages","volume",
      "otherDetails","shelf","place","description",
    ];
    return s + optionalFields.filter((f) => b[f] == null).length;
  }, 0);

  /* ────────────────────────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">

      {/* ══ DUPLICATE ALERT OVERLAY ══════════════════════════════ */}
      {dupAlert && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(10,22,34,0.75)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="flex flex-col gap-4 w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 px-5 pt-5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(220,38,38,0.1)" }}
              >
                <AlertCircle size={18} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p className="text-[14px] font-black" style={{ color: "var(--text-primary)" }}>
                  Duplicate Accession Numbers Detected
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  These accession numbers already exist in the database.
                </p>
              </div>
            </div>

            {dupAlert.duplicateAccessions.length > 0 && (
              <div className="flex flex-col gap-1.5 px-5">
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Existing Accession Numbers ({dupAlert.duplicateAccessions.length})
                </p>
                <div
                  className="rounded-xl border overflow-hidden max-h-[160px] overflow-y-auto"
                  style={{ borderColor: "rgba(234,179,8,0.25)", background: "var(--bg-subtle)" }}
                >
                  {dupAlert.duplicateAccessions.map((acc, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 border-b text-[11px]"
                      style={{ borderColor: "var(--border-light)" }}
                    >
                      <Hash size={11} style={{ color: "var(--accent-amber)", flexShrink: 0 }} />
                      <span
                        className="font-mono font-bold"
                        style={{ color: "var(--accent-amber)" }}
                      >
                        {acc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div
              className="mx-5 flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
              style={{
                background: "rgba(50,102,127,0.07)",
                border: "1.5px solid rgba(50,102,127,0.2)",
                color: "#32667F",
              }}
            >
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Books with the same title and author are imported as separate records — each with
                their own accession number. Duplicate accession numbers will be skipped automatically.
              </span>
            </div>

            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                onClick={() => setDupAlert(null)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold"
                style={{ color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={runImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white shadow-md"
                style={{ background: "var(--accent-amber)" }}
              >
                <FileSpreadsheet size={13} /> Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP BAR ═════════════════════════════════════════════ */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
      >
        <Step n="1" label="Upload"  active={step === 1} done={step > 1} />
        <ChevronRight size={11} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
        <Step n="2" label="Preview" active={step === 2} done={step > 2} />
        <ChevronRight size={11} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
        <Step n="3" label="Import"  active={step === 3} done={step > 3} />
        <ChevronRight size={11} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
        <Step n="4" label="Done"    active={step === 4} done={false} />
      </div>

      {/* ══ STEP 1: UPLOAD ═══════════════════════════════════════ */}
      {step === 1 && (
        <>
          {/* Column guide banner */}
          <div
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{ background: "rgba(184,122,0,0.07)", border: "1.5px solid rgba(184,122,0,0.18)" }}
          >
            <FileSpreadsheet size={15} style={{ color: "var(--accent-amber)", flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Bulk Import from Excel
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Expected columns:{" "}
                <span className="font-mono text-[10px]">
                  Acc. No. | Date | Class | Title | Author | Vol./Ed. | Year | Publisher | Pages | Coll. | Price | Fund | Remarks
                </span>
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Empty cells are stored as <span className="font-mono text-[10px]">NULL</span> — the admin can fill them in later.
                Each row with a unique accession number is imported as its own book record. Continuation rows (no title, new Acc No.) are grouped under the same book.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              background:  dragOver ? "rgba(184,122,0,0.05)" : "var(--bg-subtle)",
              borderColor: dragOver ? "var(--accent-amber)" : "var(--border)",
            }}
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div
              className="w-13 h-13 rounded-full flex items-center justify-center"
              style={{ background: "rgba(184,122,0,0.1)" }}
            >
              <Upload size={26} style={{ color: "var(--accent-amber)" }} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {dragOver ? "Release to upload" : "Drop your Excel file here"}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                or click to browse
              </p>
            </div>
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Supported: .xlsx, .xls
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onInputChange}
          />

          {parseError && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
              style={{
                background: "rgba(220,38,38,0.07)",
                border: "1.5px solid rgba(220,38,38,0.2)",
                color: "#b91c1c",
              }}
            >
              <XCircle size={13} /> {parseError}
            </div>
          )}
        </>
      )}

      {/* ══ STEP 2: PREVIEW ══════════════════════════════════════ */}
      {step === 2 && (
        <>
          {/* File confirmed banner */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-xl"
            style={{ background: "rgba(34,197,94,0.07)", border: "1.5px solid rgba(34,197,94,0.2)" }}
          >
            <div
              className="flex items-center gap-2 text-[12px] font-semibold"
              style={{ color: "#15803d" }}
            >
              <CheckCircle2 size={13} />
              <span className="font-mono">{fileName}</span>
              <span style={{ color: "var(--text-muted)" }}>
                — {parsed.length} unique title{parsed.length !== 1 ? "s" : ""} found
              </span>
            </div>
            <button
              onClick={reset}
              className="p-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              <X size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(184,122,0,0.1)", color: "var(--accent-amber)" }}
            >
              {parsed.length} titles
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: "rgba(34,197,94,0.1)", color: "#15803d" }}
            >
              {totalCopies} total copies
            </span>
            <span
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{
                background: "var(--bg-subtle)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-light)",
              }}
            >
              {multiCopyCount} multi-copy titles
            </span>
            {nullFieldCount > 0 && (
              <span
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                style={{ background: "rgba(100,116,139,0.08)", color: "var(--text-muted)", border: "1px solid var(--border-light)" }}
                title="These cells were empty in the Excel. They will be stored as NULL so the admin can fill them in."
              >
                <Info size={10} /> {nullFieldCount} empty fields → NULL
              </span>
            )}
          </div>

          {/* Preview table */}
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Preview — first {preview.length} of {parsed.length} titles
            </p>
            <div
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg-subtle)",
                        borderBottom: "1.5px solid var(--border-light)",
                      }}
                    >
                      {[
                        "Call No.", "Title", "Author", "Year",
                        "Publisher", "Pages", "Collection", "Copies", "Accession Nos.",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-bold whitespace-nowrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((b, i) => (
                      <tr
                        key={i}
                        className="border-t transition-colors hover:bg-amber-50/20"
                        style={{ borderColor: "var(--border-light)" }}
                      >
                        {/* Call No. */}
                        <td
                          className="px-3 py-2 font-mono text-[10px]"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {b.callNumber ?? <span className="italic opacity-40">—</span>}
                        </td>

                        {/* Title */}
                        <td
                          className="px-3 py-2 font-semibold max-w-[160px] truncate"
                          style={{ color: "var(--text-primary)" }}
                          title={b.title}
                        >
                          {b.title}
                        </td>

                        {/* Author */}
                        <td
                          className="px-3 py-2 max-w-[110px] truncate"
                          style={{ color: "var(--text-secondary)" }}
                          title={b.author}
                        >
                          {b.author ?? <span className="italic opacity-40">NULL</span>}
                        </td>

                        {/* Year */}
                        <td
                          className="px-3 py-2 whitespace-nowrap"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {b.year ?? <span className="italic opacity-40">NULL</span>}
                        </td>

                        {/* Publisher */}
                        <td
                          className="px-3 py-2 max-w-[130px] truncate"
                          style={{ color: "var(--text-secondary)" }}
                          title={b.publisher}
                        >
                          {b.publisher ?? <span className="italic opacity-40">NULL</span>}
                        </td>

                        {/* Pages */}
                        <td
                          className="px-3 py-2 text-center"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {b.pages ?? <span className="italic opacity-40">NULL</span>}
                        </td>

                        {/* Collection */}
                        <td
                          className="px-3 py-2"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {b.collection ?? <span className="italic opacity-40">NULL</span>}
                        </td>

                        {/* Copies count */}
                        <td className="px-3 py-2 text-center" style={{ color: "var(--text-secondary)" }}>
                          {b.accessionNumbers.length > 0 ? (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-black"
                              style={{
                                background: "rgba(184,122,0,0.1)",
                                color: "var(--accent-amber)",
                              }}
                            >
                              {b.accessionNumbers.length}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>

                        {/* Accession number chips */}
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {b.accessionNumbers.slice(0, 4).map((a) => (
                              <span
                                key={a}
                                className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                                style={{
                                  background: "var(--bg-subtle)",
                                  color: "var(--text-secondary)",
                                  border: "1px solid var(--border-light)",
                                }}
                              >
                                {a}
                              </span>
                            ))}
                            {b.accessionNumbers.length > 4 && (
                              <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                                +{b.accessionNumbers.length - 4} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {parsed.length > 8 && (
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              + {parsed.length - 8} more titles not shown in preview
            </p>
          )}

          {/* Info note */}
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
            style={{
              background: "rgba(50,102,127,0.07)",
              border: "1.5px solid rgba(50,102,127,0.2)",
              color: "#32667F",
            }}
          >
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Columns absent from the Excel (ISBN, Genre, Shelf, etc.) will be stored as{" "}
              <strong>NULL</strong> in the database — the admin can complete them via the book
              editor. Each title row creates a separate book record; continuation rows (no title,
              new Acc No.) add copies to the preceding book. Books with the same title and author
              are <strong>not merged</strong> — each accession number gets its own record.
              Duplicate accession numbers across the file are skipped automatically.
            </span>
          </div>
        </>
      )}

      {/* ══ STEP 3: IMPORTING ════════════════════════════════════ */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(184,122,0,0.1)" }}
          >
            <Loader2 size={32} style={{ color: "var(--accent-amber)" }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
              Importing books…
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
              {progress.title || "Sending data to server…"}
            </p>
          </div>
          <div className="w-full max-w-[360px]">
            <div
              className="flex justify-between text-[10px] font-bold mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              <span>
                {progress.current} of {progress.total}
              </span>
              <span>{pct}%</span>
            </div>
            <div
              className="w-full h-2.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "var(--accent-amber)" }}
              />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Please wait — do not close this modal
          </p>
        </div>
      )}

      {/* ══ STEP 4: DONE ═════════════════════════════════════════ */}
      {step === 4 && results && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Imported */}
            <div
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1.5px solid rgba(34,197,94,0.2)",
              }}
            >
              <CheckCircle2 size={26} style={{ color: "#15803d" }} />
              <p className="text-2xl font-black" style={{ color: "#15803d" }}>
                {results.imported ?? 0}
              </p>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "#15803d" }}
              >
                Titles Imported
              </p>
            </div>

            {/* Existing / skipped */}
            <div
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
              style={{
                background: "rgba(184,122,0,0.08)",
                border: "1.5px solid rgba(184,122,0,0.2)",
              }}
            >
              <FileSpreadsheet size={26} style={{ color: "var(--accent-amber)" }} />
              <p className="text-2xl font-black" style={{ color: "var(--accent-amber)" }}>
                {results.existing ?? 0}
              </p>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--accent-amber)" }}
              >
                Already Existed
              </p>
            </div>

            {/* Failed */}
            <div
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
              style={{
                background:
                  (results.errors ?? 0) > 0
                    ? "rgba(220,38,38,0.07)"
                    : "var(--bg-subtle)",
                border: `1.5px solid ${
                  (results.errors ?? 0) > 0
                    ? "rgba(220,38,38,0.2)"
                    : "var(--border-light)"
                }`,
              }}
            >
              <XCircle
                size={26}
                style={{
                  color:
                    (results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)",
                }}
              />
              <p
                className="text-2xl font-black"
                style={{
                  color:
                    (results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)",
                }}
              >
                {results.errors ?? 0}
              </p>
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{
                  color:
                    (results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)",
                }}
              >
                Failed
              </p>
            </div>
          </div>

          {/* Error detail list */}
          {(results.errorsDetail ?? []).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: "#b91c1c" }}
              >
                Failed books
              </p>
              <div
                className="rounded-xl border max-h-[120px] overflow-y-auto"
                style={{
                  borderColor: "rgba(220,38,38,0.2)",
                  background: "var(--bg-surface)",
                }}
              >
                {results.errorsDetail.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 border-b text-[11px]"
                    style={{ borderColor: "var(--border-light)" }}
                  >
                    <XCircle
                      size={11}
                      style={{ color: "#b91c1c", flexShrink: 0, marginTop: 1 }}
                    />
                    <div>
                      <p
                        className="font-semibold truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {f.title}
                      </p>
                      <p style={{ color: "#b91c1c" }}>{f.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import again button */}
          <button
            onClick={reset}
            className="self-start flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
            style={{
              background: "var(--bg-subtle)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-light)",
            }}
          >
            <Upload size={12} /> Import another file
          </button>
        </div>
      )}
    </div>
  );
});

export default BookImport;