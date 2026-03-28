import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  FileSpreadsheet, Upload, AlertCircle, Hash,
  CheckCircle2, XCircle, Loader2, ChevronRight, RefreshCw, X
} from "lucide-react";
import * as XLSX from "xlsx";

/* ─── Excel column indices ──────────────────────────────
   Row 1: Acc. No. | Date | Class | Title | Author |
          Vol./Ed. | Year | Publisher | Pages | Coll.
──────────────────────────────────────────────────────── */
const COL = { ACC:0, DATE:1, CLASS:2, TITLE:3, AUTHOR:4, VOL:5, YEAR:6, PUBLISHER:7, PAGES:8, COLL:9 };

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/* ── Parse Excel buffer → array of book objects ────────── */
function parseExcel(buffer) {
  const wb   = XLSX.read(buffer, { type:"array", cellDates:true });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

  const books   = [];
  let current   = null;

  // Skip first 2 header rows
  for (const row of rows.slice(2)) {
    if (!row || row.every(v => v == null)) continue;

    const acc       = row[COL.ACC]?.toString().trim()       || "";
    const cls       = row[COL.CLASS]?.toString().trim()     || "";
    const title     = row[COL.TITLE]?.toString().trim()     || "";
    const author    = row[COL.AUTHOR]?.toString().trim()    || "";
    const vol       = row[COL.VOL]?.toString().trim()       || "";
    const publisher = row[COL.PUBLISHER]?.toString().trim() || "";
    const pages     = row[COL.PAGES] ? String(row[COL.PAGES]).trim() : "";
    const coll      = row[COL.COLL]?.toString().trim()      || "";
    const yearRaw   = row[COL.YEAR];
    const dateRaw   = row[COL.DATE];

    // Parse year
    let year = "";
    if (yearRaw instanceof Date) year = String(yearRaw.getFullYear());
    else if (yearRaw)            year = String(yearRaw).trim();

    // Parse date acquired
    let dateAcquired = "";
    if (dateRaw instanceof Date)  dateAcquired = dateRaw.toISOString().split("T")[0];
    else if (dateRaw)             dateAcquired = String(dateRaw).trim();

    if (title) {
      // ── Main row: new book ──
      if (current) books.push(current);
      current = {
        // ── Fields that exist in the Excel ──
        title,
        authors:          author  || null,
        author:           author  || null,
        callNumber:       cls     || null,
        volume:           vol     || null,
        year:             year    ? (parseInt(year) || null) : null,
        date:             year    ? (parseInt(year) || null) : null,
        publisher:        publisher || null,
        pages:            pages   || null,
        collection:       coll    || null,
        dateAcquired:     dateAcquired || null,
        accessionNumbers: acc ? [acc] : [],
        // ── Fields NOT in Excel — always null ──
        shelf:        null,
        place:        null,
        edition:      null,
        materialType: null,
        genre:        null,
        isbn:         null,
        issn:         null,
        lccn:         null,
        subtitle:     null,
        extent:       null,
        size:         null,
        description:  null,
        otherDetails: null,
      };
    } else if (acc && current) {
      // ── Copy row: add accession to current book ──
      current.accessionNumbers.push(acc);
      // Pull callNumber from copy row if main row was missing it
      if (!current.callNumber && cls) current.callNumber = cls;
    };

  }
  if (current) books.push(current);

  return books;
}



/* ── Send all books to /api/books/bulk-import in one request ── */
async function sendBulkImport(books, onProgress) {
  // Report start
  onProgress(0, books.length, "Sending to server…");

  try {
    const res  = await fetch(`${API_BASE}/api/books/bulk-import`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ books }),
    });
    const data = await res.json();
    onProgress(books.length, books.length, "Done");
    return data;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* ── Step indicator ─────────────────────────────────────── */
function Step({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-1.5"
         style={{ color: done ? "#15803d" : active ? "var(--accent-amber)" : "var(--text-muted)",
                  opacity: active||done ? 1 : 0.4 }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
           style={{
             background: done ? "rgba(34,197,94,0.15)" : active ? "rgba(184,122,0,0.15)" : "var(--bg-subtle)",
             border: `1.5px solid ${done?"rgba(34,197,94,0.4)":active?"rgba(184,122,0,0.4)":"var(--border)"}`,
           }}>
        {done ? <CheckCircle2 size={12}/> : n}
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
const BookAddImport = forwardRef(function BookAddImport({ onImportComplete, onStepChange }, ref) {
  const fileRef                           = useRef(null);
  const [step, setStep]                   = useState(1);
  const [fileName, setFileName]           = useState("");
  const [parsed, setParsed]               = useState([]);
  const [preview, setPreview]             = useState([]);
  const [progress, setProgress]           = useState({ current:0, total:0, title:"" });
  const [results, setResults]             = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [parseError, setParseError]       = useState("");
  // Duplicate alert state
  const [dupAlert, setDupAlert]           = useState(null);  // { duplicateTitles, duplicateAccessions }
  const [checking, setChecking]           = useState(false);

  const setStepAndNotify = useCallback((s, books) => {
    setStep(s);
    onStepChange?.(s, books ?? parsed);
  }, [onStepChange, parsed]);

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
        const books = parseExcel(new Uint8Array(e.target.result));
        if (!books.length) {
          setParseError("No book records found. Check that the file matches the expected format.");
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
  }, []);

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop        = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver    = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave   = ()  => setDragOver(false);

  // ── Pre-flight duplicate check, then show alert or proceed ──
  const startImport = async () => {
    setChecking(true);
    try {
      const res  = await fetch(`${API_BASE}/api/books/check-duplicates`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ books: parsed }),
      });
      const data = await res.json();

      if (data.hasDuplicates) {
        // Show alert — let user decide
        setDupAlert({
          duplicateTitles:     data.duplicateTitles     || [],
          duplicateAccessions: data.duplicateAccessions || [],
        });
        return;
      }
    } catch (_) {
      // If check fails, proceed anyway — server will handle duplicates
    } finally {
      setChecking(false);
    }
    await runImport();
  };

  // ── Actual import (called after user confirms or no duplicates found) ──
  const runImport = async () => {
    setDupAlert(null);
    setStepAndNotify(3);
    setProgress({ current:0, total:parsed.length, title:"" });

    const res = await sendBulkImport(parsed, (current, total, title) => {
      setProgress({ current, total, title });
    });

    setResults(res);
    setStepAndNotify(4);

    if (res.success && res.data?.length > 0 && onImportComplete) {
      onImportComplete(res.data);
    }
  };

  const reset = () => {
    setStepAndNotify(1); setFileName(""); setParsed([]); setPreview([]);
    setProgress({ current:0, total:0, title:"" });
    setResults(null); setParseError(""); setDupAlert(null); setChecking(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Expose state + actions to parent (BookModal footer)
  useImperativeHandle(ref, () => ({
    step,
    parsed,
    startImport,
    reset,
    checking,
  }), [step, parsed, startImport, reset, checking]);

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ══ DUPLICATE ALERT DIALOG ══ */}
      {dupAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
             style={{ background: "rgba(10,22,34,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="flex flex-col gap-4 w-full max-w-[520px] rounded-2xl shadow-2xl overflow-hidden"
               style={{ background: "var(--bg-surface)", border: "1.5px solid var(--border)" }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                   style={{ background: "rgba(220,38,38,0.1)" }}>
                <AlertCircle size={18} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p className="text-[14px] font-black" style={{ color: "var(--text-primary)" }}>
                  Duplicates Detected
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  The following already exist in the database.
                </p>
              </div>
            </div>

            {/* Duplicate titles */}
            {dupAlert.duplicateTitles.length > 0 && (
              <div className="flex flex-col gap-1.5 px-5">
                <p className="text-[10px] font-black uppercase tracking-widest"
                   style={{ color: "var(--text-secondary)" }}>
                  Existing Titles ({dupAlert.duplicateTitles.length})
                </p>
                <div className="rounded-xl border overflow-hidden max-h-[140px] overflow-y-auto custom-scrollbar"
                     style={{ borderColor: "rgba(220,38,38,0.2)", background: "var(--bg-subtle)" }}>
                  {dupAlert.duplicateTitles.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 border-b text-[11px]"
                         style={{ borderColor: "var(--border-light)" }}>
                      <XCircle size={11} style={{ color: "#dc2626", flexShrink: 0 }} />
                      <span className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {d.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate accessions */}
            {dupAlert.duplicateAccessions.length > 0 && (
              <div className="flex flex-col gap-1.5 px-5">
                <p className="text-[10px] font-black uppercase tracking-widest"
                   style={{ color: "var(--text-secondary)" }}>
                  Existing Accession Numbers ({dupAlert.duplicateAccessions.length})
                </p>
                <div className="rounded-xl border overflow-hidden max-h-[120px] overflow-y-auto custom-scrollbar"
                     style={{ borderColor: "rgba(234,179,8,0.25)", background: "var(--bg-subtle)" }}>
                  {dupAlert.duplicateAccessions.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 border-b text-[11px]"
                         style={{ borderColor: "var(--border-light)" }}>
                      <Hash size={11} style={{ color: "var(--accent-amber)", flexShrink: 0 }} />
                      <span className="font-mono font-bold" style={{ color: "var(--accent-amber)" }}>
                        {d.accession}
                      </span>
                      <span style={{ color: "var(--text-muted)" }}>— {d.book}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info note */}
            <div className="mx-5 flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
                 style={{ background: "rgba(50,102,127,0.07)", border: "1.5px solid rgba(50,102,127,0.2)", color: "#32667F" }}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Existing titles will have their new copies added. Duplicate accession numbers will be skipped automatically.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 px-5 pb-5">
              <button
                onClick={() => setDupAlert(null)}
                className="px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:bg-subtle"
                style={{ color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={runImport}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white shadow-md transition-all"
                style={{ background: "var(--accent-amber)" }}
              >
                <FileSpreadsheet size={13} />
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
           style={{ background:"var(--bg-subtle)", border:"1px solid var(--border-light)" }}>
        <Step n="1" label="Upload"  active={step===1} done={step>1} />
        <ChevronRight size={11} style={{ color:"var(--text-muted)", opacity:0.4 }} />
        <Step n="2" label="Preview" active={step===2} done={step>2} />
        <ChevronRight size={11} style={{ color:"var(--text-muted)", opacity:0.4 }} />
        <Step n="3" label="Import"  active={step===3} done={step>3} />
        <ChevronRight size={11} style={{ color:"var(--text-muted)", opacity:0.4 }} />
        <Step n="4" label="Done"    active={step===4} done={false} />
      </div>

      {/* ══ STEP 1: Upload ══ */}
      {step === 1 && (
        <>
          <div className="flex items-start gap-3 p-3 rounded-xl"
               style={{ background:"rgba(184,122,0,0.07)", border:"1.5px solid rgba(184,122,0,0.18)" }}>
            <FileSpreadsheet size={15} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:2 }} />
            <div>
              <p className="text-[12px] font-semibold" style={{ color:"var(--text-primary)" }}>
                Bulk Import from Excel
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:"var(--text-secondary)" }}>
                Expected columns: <span className="font-mono text-[10px]">Acc. No. | Date | Class | Title | Author | Vol./Ed. | Year | Publisher | Pages | Coll.</span>
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:"var(--text-secondary)" }}>
                Copy rows (C2, C3…) are automatically detected and grouped under their book.
              </p>
            </div>
          </div>

          {/* Drop zone */}
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              background:   dragOver ? "rgba(184,122,0,0.05)" : "var(--bg-subtle)",
              borderColor:  dragOver ? "var(--accent-amber)"  : "var(--border)",
            }}
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          >
            <div className="w-13 h-13 rounded-full flex items-center justify-center"
                 style={{ background:"rgba(184,122,0,0.1)" }}>
              <Upload size={26} style={{ color:"var(--accent-amber)" }} />
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold" style={{ color:"var(--text-primary)" }}>
                {dragOver ? "Release to upload" : "Drop your Excel file here"}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:"var(--text-secondary)" }}>or click to browse</p>
            </div>
            <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Supported: .xlsx, .xls</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInputChange} />

          {parseError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
                 style={{ background:"rgba(220,38,38,0.07)", border:"1.5px solid rgba(220,38,38,0.2)", color:"#b91c1c" }}>
              <XCircle size={13} /> {parseError}
            </div>
          )}
        </>
      )}

      {/* ══ STEP 2: Preview ══ */}
      {step === 2 && (
        <>
          {/* File badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl"
               style={{ background:"rgba(34,197,94,0.07)", border:"1.5px solid rgba(34,197,94,0.2)" }}>
            <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color:"#15803d" }}>
              <CheckCircle2 size={13} />
              <span className="font-mono">{fileName}</span>
              <span style={{ color:"var(--text-muted)" }}>— {parsed.length} unique titles found</span>
            </div>
            <button onClick={reset} className="p-1 rounded-lg hover:bg-red-50 transition-colors">
              <X size={13} style={{ color:"var(--text-muted)" }} />
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background:"rgba(184,122,0,0.1)", color:"var(--accent-amber)" }}>
              {parsed.length} titles
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background:"rgba(34,197,94,0.1)", color:"#15803d" }}>
              {parsed.reduce((s,b) => s + b.accessionNumbers.length, 0)} total copies
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background:"var(--bg-subtle)", color:"var(--text-secondary)", border:"1px solid var(--border-light)" }}>
              {parsed.filter(b => b.accessionNumbers.length > 1).length} multi-copy titles
            </span>
          </div>

          {/* Preview table */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color:"var(--text-secondary)" }}>
              Preview — first {preview.length} of {parsed.length} titles
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor:"var(--border-light)", background:"var(--bg-surface)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background:"var(--bg-subtle)", borderBottom:"1.5px solid var(--border-light)" }}>
                      {["Call No.", "Title", "Author", "Year", "Publisher", "Pages", "Copies", "Accession Numbers"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold whitespace-nowrap"
                            style={{ color:"var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((b, i) => (
                      <tr key={i} className="border-t transition-colors hover:bg-amber-50/20"
                          style={{ borderColor:"var(--border-light)" }}>
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color:"var(--text-muted)" }}>
                          {b.callNumber || "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold max-w-[160px] truncate" style={{ color:"var(--text-primary)" }}
                            title={b.title}>{b.title}</td>
                        <td className="px-3 py-2 max-w-[110px] truncate" style={{ color:"var(--text-secondary)" }}
                            title={b.author}>{b.author || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color:"var(--text-secondary)" }}>
                          {b.year || "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[130px] truncate" style={{ color:"var(--text-secondary)" }}
                            title={b.publisher}>{b.publisher || "—"}</td>
                        <td className="px-3 py-2 text-center" style={{ color:"var(--text-secondary)" }}>
                          {b.pages || "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {b.accessionNumbers.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                  style={{ background:"rgba(184,122,0,0.1)", color:"var(--accent-amber)" }}>
                              {b.accessionNumbers.length}
                            </span>
                          ) : (
                            <span style={{ color:"var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {b.accessionNumbers.slice(0,4).map(a => (
                              <span key={a} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                                    style={{ background:"var(--bg-subtle)", color:"var(--text-secondary)", border:"1px solid var(--border-light)" }}>
                                {a}
                              </span>
                            ))}
                            {b.accessionNumbers.length > 4 && (
                              <span className="text-[9px]" style={{ color:"var(--text-muted)" }}>
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
            {parsed.length > 8 && (
              <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>
                + {parsed.length - 8} more titles not shown in preview
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
               style={{ background:"rgba(50,102,127,0.07)", border:"1.5px solid rgba(50,102,127,0.2)", color:"#32667F" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} />
            <span>
              Columns not in the Excel (ISBN, Genre, etc.) will be left blank.
              Each copy accession is saved individually in <span className="font-mono">book_copies</span> table.
            </span>
          </div>

        </>
      )}

      {/* ══ STEP 3: Importing ══ */}
      {step === 3 && (
        <div className="flex flex-col items-center gap-5 py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
               style={{ background:"rgba(184,122,0,0.1)" }}>
            <Loader2 size={32} style={{ color:"var(--accent-amber)" }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color:"var(--text-primary)" }}>
              Importing books…
            </p>
            <p className="text-[12px] mt-1" style={{ color:"var(--text-secondary)" }}>
              {progress.title || "Sending data to server…"}
            </p>
          </div>
          <div className="w-full max-w-[360px]">
            <div className="flex justify-between text-[10px] font-bold mb-1.5" style={{ color:"var(--text-muted)" }}>
              <span>{progress.current} of {progress.total}</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden"
                 style={{ background:"var(--bg-subtle)", border:"1px solid var(--border-light)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width:`${pct}%`, background:"var(--accent-amber)" }} />
            </div>
          </div>
          <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>
            Please wait — do not close this modal
          </p>
        </div>
      )}

      {/* ══ STEP 4: Done ══ */}
      {step === 4 && results && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Imported */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{ background:"rgba(34,197,94,0.08)", border:"1.5px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={26} style={{ color:"#15803d" }} />
              <p className="text-2xl font-black" style={{ color:"#15803d" }}>{results.imported ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"#15803d" }}>Titles Imported</p>
            </div>
            {/* Copies */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{ background:"rgba(184,122,0,0.08)", border:"1.5px solid rgba(184,122,0,0.2)" }}>
              <FileSpreadsheet size={26} style={{ color:"var(--accent-amber)" }} />
              <p className="text-2xl font-black" style={{ color:"var(--accent-amber)" }}>
                {results.data?.reduce((s,b) => s + (b.copies?.length ?? 0), 0) ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--accent-amber)" }}>Copies Saved</p>
            </div>
            {/* Failed */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{
                   background: (results.failedBooks??0) > 0 ? "rgba(220,38,38,0.07)" : "var(--bg-subtle)",
                   border: `1.5px solid ${(results.failedBooks??0)>0?"rgba(220,38,38,0.2)":"var(--border-light)"}`,
                 }}>
              <XCircle size={26} style={{ color:(results.failedBooks??0)>0?"#b91c1c":"var(--text-muted)" }} />
              <p className="text-2xl font-black"
                 style={{ color:(results.failedBooks??0)>0?"#b91c1c":"var(--text-muted)" }}>
                {results.failedBooks ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider"
                 style={{ color:(results.failedBooks??0)>0?"#b91c1c":"var(--text-muted)" }}>Failed</p>
            </div>
          </div>

          {/* Skipped copies */}
          {results.skippedCopies?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:"var(--text-secondary)" }}>
                Skipped duplicate accessions ({results.skippedCopies.length})
              </p>
              <div className="rounded-xl border max-h-[100px] overflow-y-auto custom-scrollbar"
                   style={{ borderColor:"rgba(234,179,8,0.3)", background:"var(--bg-surface)" }}>
                {results.skippedCopies.map((s,i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 border-b text-[11px]"
                       style={{ borderColor:"var(--border-light)" }}>
                    <span className="font-mono font-bold" style={{ color:"var(--accent-amber)" }}>{s.accession}</span>
                    <span style={{ color:"var(--text-muted)" }}>{s.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed books */}
          {results.errors?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:"#b91c1c" }}>
                Failed books
              </p>
              <div className="rounded-xl border max-h-[120px] overflow-y-auto custom-scrollbar"
                   style={{ borderColor:"rgba(220,38,38,0.2)", background:"var(--bg-surface)" }}>
                {results.errors.map((f,i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 border-b text-[11px]"
                       style={{ borderColor:"var(--border-light)" }}>
                    <XCircle size={11} style={{ color:"#b91c1c", flexShrink:0, marginTop:1 }} />
                    <div>
                      <p className="font-semibold truncate" style={{ color:"var(--text-primary)" }}>{f.title}</p>
                      <p style={{ color:"#b91c1c" }}>{f.error}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
});

export default BookAddImport;