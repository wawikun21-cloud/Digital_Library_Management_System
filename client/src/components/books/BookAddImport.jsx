import { useState, useRef, useCallback } from "react";
import {
  FileSpreadsheet, Upload, AlertCircle,
  FileText, CheckCircle2, XCircle, Loader2,
  ChevronRight, RefreshCw, X
} from "lucide-react";
import * as XLSX from "xlsx";

/* ─── column map from your Excel format ───────────────────
   Row 1 headers: Acc. No. | Date | Class | Title | Author |
                  Vol./Ed. | Copy/Year | Publisher | Pages | Coll.
──────────────────────────────────────────────────────────── */
const COL = {
  ACC:       0,   // Acc. No.
  DATE:      1,   // Date acquired
  CLASS:     2,   // Call Number / Class
  TITLE:     3,   // Title
  AUTHOR:    4,   // Author
  VOL:       5,   // Volume / Edition
  YEAR:      6,   // Copy year (also used as edition/year)
  PUBLISHER: 7,   // Publisher
  PAGES:     8,   // Pages
  COLL:      9,   // Collection
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ─── parse Excel buffer into book records ─────────────── */
function parseExcel(buffer) {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Skip header rows (rows 1 & 2) — data starts at row index 2
  const dataRows = rows.slice(2);

  const books = [];
  let current = null;

  for (const row of dataRows) {
    if (!row || row.every(v => v == null)) continue;

    const acc       = row[COL.ACC]?.toString().trim() || "";
    const cls       = row[COL.CLASS]?.toString().trim() || "";
    const title     = row[COL.TITLE]?.toString().trim() || "";
    const author    = row[COL.AUTHOR]?.toString().trim() || "";
    const vol       = row[COL.VOL]?.toString().trim() || "";
    const yearRaw   = row[COL.YEAR];
    const publisher = row[COL.PUBLISHER]?.toString().trim() || "";
    const pages     = row[COL.PAGES] ? String(row[COL.PAGES]).trim() : "";
    const coll      = row[COL.COLL]?.toString().trim() || "";
    const dateRaw   = row[COL.DATE];

    // Parse year
    let year = "";
    if (yearRaw instanceof Date) year = String(yearRaw.getFullYear());
    else if (yearRaw) year = String(yearRaw).trim();

    // Parse date
    let dateAcquired = "";
    if (dateRaw instanceof Date) {
      dateAcquired = dateRaw.toISOString().split("T")[0];
    } else if (dateRaw) {
      dateAcquired = String(dateRaw).trim();
    }

    if (title) {
      // Main record row
      if (current) books.push(current);
      current = {
        title,
        author,
        authors: author,
        callNumber: cls,
        accessionNumber: acc,       // first copy's acc no
        accessionNumbers: acc ? [acc] : [],
        volume: vol,
        year: year ? parseInt(year) || "" : "",
        date: year ? parseInt(year) || "" : "",
        publisher,
        pages,
        extent: "",
        collection: coll,
        dateAcquired,
        // required fields — will be blank if not in Excel
        genre:       "",
        isbn:        "",
        issn:        "",
        lccn:        "",
        subtitle:    "",
        edition:     vol || "",
        place:       extractPlace(publisher),
        materialType: "Book",
        status:      "Available",
        description: "",
        otherDetails: "",
        size:        "",
        shelf:       coll || "",
      };
    } else if (acc && current) {
      // Copy row — just additional accession number
      current.accessionNumbers.push(acc);
      // Update callNumber from copy row if missing on main row
      if (!current.callNumber && cls) current.callNumber = cls;
    }
  }

  if (current) books.push(current);

  // Set quantity from number of copy rows (C1, C2, etc.) only if >1 copy found
  return books.map(b => ({
    ...b,
    quantity: b.accessionNumbers.length > 0 ? b.accessionNumbers.length : "",
    accessionNumber: b.accessionNumbers[0] || "",
  }));
}

/* Extract city/place from publisher string like "..., Quezon City" */
function extractPlace(pub) {
  if (!pub) return "";
  const parts = pub.split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}

/* ─── import books to server one by one ────────────────── */
async function importBooksToServer(books, onProgress) {
  const results = { success: [], failed: [] };

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    onProgress(i + 1, books.length, book.title);

    try {
      const payload = {
        ...book,
        author:   book.author   || book.authors || "",
        genre:    book.genre    || "",
        isbn:     book.isbn     || "",
        year:     book.year     ? Number(book.year)     : null,
        quantity: book.quantity !== "" && book.quantity != null ? Number(book.quantity) : null,
      };

      const res = await fetch(`${API_BASE}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        results.success.push({ book, data: data.data });
      } else {
        results.failed.push({ book, error: data.error || "Unknown error" });
      }
    } catch (err) {
      results.failed.push({ book, error: err.message });
    }
  }

  return results;
}

/* ─── Step indicator ────────────────────────────────────── */
function Step({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${active ? "" : done ? "" : "opacity-40"}`}
         style={{ color: done ? "#15803d" : active ? "var(--accent-amber)" : "var(--text-muted)" }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black"
           style={{
             background: done ? "rgba(34,197,94,0.15)" : active ? "rgba(184,122,0,0.15)" : "var(--bg-subtle)",
             border: `1.5px solid ${done ? "rgba(34,197,94,0.4)" : active ? "rgba(184,122,0,0.4)" : "var(--border)"}`,
             color: done ? "#15803d" : active ? "var(--accent-amber)" : "var(--text-muted)",
           }}>
        {done ? <CheckCircle2 size={12} /> : n}
      </div>
      {label}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
export default function BookAddImport({ onImportComplete }) {
  const fileRef = useRef(null);
  const [step, setStep]               = useState(1); // 1=upload 2=preview 3=importing 4=done
  const [fileName, setFileName]       = useState("");
  const [parsed, setParsed]           = useState([]);   // all parsed books
  const [preview, setPreview]         = useState([]);   // first 8 for table
  const [progress, setProgress]       = useState({ current: 0, total: 0, title: "" });
  const [results, setResults]         = useState(null);
  const [dragOver, setDragOver]       = useState(false);
  const [parseError, setParseError]   = useState("");

  /* ── file handler ── */
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError("Only .xlsx or .xls files are supported.");
      return;
    }
    setParseError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = new Uint8Array(e.target.result);
        const books  = parseExcel(buffer);
        if (!books.length) {
          setParseError("No book records found. Make sure the file matches the expected format.");
          return;
        }
        setParsed(books);
        setPreview(books.slice(0, 8));
        setStep(2);
      } catch (err) {
        setParseError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const onInputChange  = (e) => handleFile(e.target.files[0]);
  const onDrop         = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver     = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave    = ()  => setDragOver(false);

  /* ── start import ── */
  const startImport = async () => {
    setStep(3);
    setProgress({ current: 0, total: parsed.length, title: "" });

    const res = await importBooksToServer(parsed, (current, total, title) => {
      setProgress({ current, total, title });
    });

    setResults(res);
    setStep(4);

    // Notify parent to refresh book list
    if (res.success.length > 0 && onImportComplete) {
      onImportComplete(res.success.map(r => r.data));
    }
  };

  /* ── reset ── */
  const reset = () => {
    setStep(1); setFileName(""); setParsed([]); setPreview([]);
    setProgress({ current: 0, total: 0, title: "" });
    setResults(null); setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Step header ── */}
      <div className="flex items-center gap-4 p-3 rounded-xl"
           style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
        <Step n="1" label="Upload"  active={step === 1} done={step > 1} />
        <ChevronRight size={12} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
        <Step n="2" label="Preview" active={step === 2} done={step > 2} />
        <ChevronRight size={12} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
        <Step n="3" label="Import"  active={step === 3} done={step > 3} />
        <ChevronRight size={12} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
        <Step n="4" label="Done"    active={step === 4} done={false} />
      </div>

      {/* ══ STEP 1: Upload ══ */}
      {step === 1 && (
        <>
          {/* Info banner */}
          <div className="flex items-start gap-3 p-3 rounded-xl"
               style={{ background: "rgba(184,122,0,0.07)", border: "1.5px solid rgba(184,122,0,0.18)" }}>
            <FileSpreadsheet size={16} style={{ color: "var(--accent-amber)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                Bulk Import from Excel
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Expected columns: <span className="font-mono">Acc. No. | Date | Class | Title | Author | Vol./Ed. | Year | Publisher | Pages | Coll.</span>
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              background: dragOver ? "rgba(184,122,0,0.06)" : "var(--bg-subtle)",
              borderColor: dragOver ? "var(--accent-amber)" : "var(--border)",
            }}
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
                 style={{ background: "rgba(184,122,0,0.1)" }}>
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
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInputChange} />

          {/* Parse error */}
          {parseError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
                 style={{ background: "rgba(220,38,38,0.07)", border: "1.5px solid rgba(220,38,38,0.2)", color: "#b91c1c" }}>
              <XCircle size={14} />
              {parseError}
            </div>
          )}

          {/* Template note */}
          <div className="flex items-center justify-between p-3 rounded-xl"
               style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border-light)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                   style={{ background: "rgba(45,122,71,0.1)" }}>
                <FileText size={16} style={{ color: "#2d7a47" }} />
              </div>
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>Expected format</p>
                <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  Match your Excel to the column order above
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ STEP 2: Preview ══ */}
      {step === 2 && (
        <>
          {/* File info */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl"
               style={{ background: "rgba(34,197,94,0.07)", border: "1.5px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "#15803d" }}>
              <CheckCircle2 size={14} />
              <span className="font-mono">{fileName}</span>
              <span style={{ color: "var(--text-muted)" }}>— {parsed.length} books found</span>
            </div>
            <button onClick={reset} className="p-1 rounded-lg hover:bg-red-50 transition-colors">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Preview table */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-secondary)" }}>
              Preview — first {preview.length} of {parsed.length} books
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border-light)" }}>
                      {["Acc. No.", "Call No.", "Title", "Author", "Year", "Publisher", "Pages", "Qty"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold whitespace-nowrap"
                            style={{ color: "var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((b, i) => (
                      <tr key={i} className="border-t transition-colors hover:bg-amber-50/20"
                          style={{ borderColor: "var(--border-light)" }}>
                        <td className="px-3 py-2 font-mono" style={{ color: "var(--text-muted)" }}>{b.accessionNumber}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: "var(--text-muted)" }}>{b.callNumber}</td>
                        <td className="px-3 py-2 font-semibold max-w-[160px] truncate" style={{ color: "var(--text-primary)" }}
                            title={b.title}>{b.title}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate" style={{ color: "var(--text-secondary)" }}
                            title={b.author}>{b.author}</td>
                        <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{b.year || "—"}</td>
                        <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "var(--text-secondary)" }}
                            title={b.publisher}>{b.publisher}</td>
                        <td className="px-3 py-2 text-center" style={{ color: "var(--text-secondary)" }}>{b.pages || "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {b.quantity !== "" && b.quantity != null ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                  style={{ background: "rgba(184,122,0,0.1)", color: "var(--accent-amber)" }}>
                              {b.quantity}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {parsed.length > 8 && (
              <p className="text-[10px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                + {parsed.length - 8} more books not shown in preview
              </p>
            )}
          </div>

          {/* Notice */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
               style={{ background: "rgba(50,102,127,0.07)", border: "1.5px solid rgba(50,102,127,0.2)", color: "#32667F" }}>
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Columns not present in this Excel (ISBN, ISSN, Genre, etc.) will be left blank.
              You can fill them in individually after import.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1 border-t border-border-light">
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 hover:bg-subtle"
                    style={{ color: "var(--text-secondary)" }}>
              <RefreshCw size={13} /> Change file
            </button>
            <button onClick={startImport}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white shadow-md transition-all duration-150"
                    style={{ background: "var(--accent-amber)" }}>
              <FileSpreadsheet size={14} />
              Import {parsed.length} Books
            </button>
          </div>
        </>
      )}

      {/* ══ STEP 3: Importing ══ */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
               style={{ background: "rgba(184,122,0,0.1)" }}>
            <Loader2 size={32} style={{ color: "var(--accent-amber)" }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
              Importing books…
            </p>
            <p className="text-[12px] mt-1 max-w-[300px] truncate" style={{ color: "var(--text-secondary)" }}>
              {progress.title || "Starting…"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[360px]">
            <div className="flex justify-between text-[10px] font-bold mb-1.5"
                 style={{ color: "var(--text-muted)" }}>
              <span>{progress.current} of {progress.total}</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden"
                 style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}>
              <div className="h-full rounded-full transition-all duration-300"
                   style={{ width: `${pct}%`, background: "var(--accent-amber)" }} />
            </div>
          </div>

          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            Please wait — do not close this modal
          </p>
        </div>
      )}

      {/* ══ STEP 4: Done ══ */}
      {step === 4 && results && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{ background: "rgba(34,197,94,0.08)", border: "1.5px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={28} style={{ color: "#15803d" }} />
              <p className="text-2xl font-black" style={{ color: "#15803d" }}>{results.success.length}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#15803d" }}>
                Imported
              </p>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{
                   background: results.failed.length > 0 ? "rgba(220,38,38,0.07)" : "var(--bg-subtle)",
                   border: `1.5px solid ${results.failed.length > 0 ? "rgba(220,38,38,0.2)" : "var(--border-light)"}`,
                 }}>
              <XCircle size={28} style={{ color: results.failed.length > 0 ? "#b91c1c" : "var(--text-muted)" }} />
              <p className="text-2xl font-black" style={{ color: results.failed.length > 0 ? "#b91c1c" : "var(--text-muted)" }}>
                {results.failed.length}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider"
                 style={{ color: results.failed.length > 0 ? "#b91c1c" : "var(--text-muted)" }}>
                Failed
              </p>
            </div>
          </div>

          {/* Failed list */}
          {results.failed.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                Failed entries
              </p>
              <div className="rounded-xl overflow-hidden border max-h-[140px] overflow-y-auto custom-scrollbar"
                   style={{ borderColor: "rgba(220,38,38,0.2)", background: "var(--bg-surface)" }}>
                {results.failed.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 border-b text-[11px]"
                       style={{ borderColor: "var(--border-light)" }}>
                    <XCircle size={12} style={{ color: "#b91c1c", flexShrink: 0, marginTop: 1 }} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{f.book.title}</p>
                      <p style={{ color: "#b91c1c" }}>{f.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-border-light">
            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {results.success.length > 0 && "Book list has been updated."}
            </p>
            <button onClick={reset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all"
                    style={{ background: "var(--bg-subtle)", color: "var(--text-secondary)", border: "1.5px solid var(--border-light)" }}>
              <RefreshCw size={12} /> Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}