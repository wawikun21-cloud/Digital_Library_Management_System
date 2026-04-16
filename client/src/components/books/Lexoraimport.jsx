import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  FileSpreadsheet, Upload, AlertCircle,
  CheckCircle2, XCircle, Loader2, ChevronRight, X,
} from "lucide-react";
// xlsx loaded on-demand via dynamic import inside parseLexoraExcel()

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/* ── Parse Lexora multi-sheet Excel ────────────────────────────
   - Sheet name  = program/category (e.g. "BSIT", "FICTION NOVEL")
   - Header row  = auto-detected by searching for "Title of Book"
   - Columns     : Subject/Course Title | Title of Book | Source |
                   Author | Year of Publication | Resource Type | Format
   - Section rows (e.g. "First Year First Sem") have no Title of Book
──────────────────────────────────────────────────────────────── */
async function parseLexoraExcel(buffer) {
  const XLSX = await import("xlsx");
  const wb       = XLSX.read(buffer, { type:"array", cellDates:true });
  const seen     = new Map(); // title+author → global dedup
  const sheets   = [];        // [{ name, books }]
  const allBooks = [];         // flat list

  for (const sheetName of wb.SheetNames) {
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

    // Auto-detect header row
    let headerRowIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.some(v => v?.toString().toLowerCase().includes("title of book"))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) continue;

    // Map column positions
    const colIdx = {};
    rows[headerRowIdx].forEach((cell, i) => {
      if (!cell) return;
      const h = cell.toString().toLowerCase().trim();
      if      (h.includes("subject") || h.includes("course")) colIdx.subject      = i;
      else if (h.includes("title of book"))                    colIdx.title        = i;
      else if (h.includes("resource"))                         colIdx.resourceType = i;
      else if (h.includes("source"))                           colIdx.source       = i;
      else if (h.includes("author"))                           colIdx.author       = i;
      else if (h.includes("year"))                             colIdx.year         = i;
      else if (h.includes("format"))                           colIdx.format       = i;
    });
    if (colIdx.title === undefined) continue;

    const sheetBooks = [];

    for (const row of rows.slice(headerRowIdx + 1)) {
      if (!row || row.every(v => v == null)) continue;
      const rawTitle = row[colIdx.title];
      if (!rawTitle) continue;

      const title = rawTitle.toString().replace(/[\r\n]+/g, " ").trim();
      if (!title) continue;

      const author = colIdx.author !== undefined
        ? (row[colIdx.author]?.toString().replace(/[\r\n]+/g, " ").trim() || null)
        : null;

      const source = colIdx.source !== undefined
        ? (row[colIdx.source]?.toString().trim() || null)
        : null;

      const yearRaw = colIdx.year !== undefined ? row[colIdx.year] : null;
      let year = null;
      if (yearRaw instanceof Date) {
        year = yearRaw.getFullYear();
      } else if (yearRaw != null && yearRaw !== "") {
        const str = String(yearRaw).trim();
        // Handle full date strings like "10 Feb, 2021" or "Feb 2021" — extract 4-digit year
        const match = str.match(/\b(19|20)\d{2}\b/);
        if (match) year = parseInt(match[0]);
      }

      const resourceType = colIdx.resourceType !== undefined
        ? (row[colIdx.resourceType]?.toString().trim() || null)
        : null;

      const format = colIdx.format !== undefined
        ? (row[colIdx.format]?.toString().trim() || null)
        : null;

      const subjectCourse = colIdx.subject !== undefined
        ? (row[colIdx.subject]?.toString().replace(/[\r\n]+/g, " ").trim() || null)
        : null;

      // Dedup key: title + author + program.
      // Using title+author alone would wrongly collapse books that share a
      // title but have different authors across programs/sheets.
      // Using title+author+program keeps legitimate cross-sheet duplicates
      // while still preventing exact redundant rows within the same sheet.
      const key = `${title.toLowerCase()}||${(author || "").toLowerCase()}||${sheetName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.set(key, allBooks.length);

      const book = {
        title,
        author,
        authors:          author,
        source,
        year,
        resource_type:    resourceType,   // snake_case matches DB column
        format,
        subject_course:   subjectCourse,  // DB column: subject_course
        program:          sheetName,
        collection:       sheetName,
        // Fields not in Lexora Excel — left null for DB compatibility
        callNumber: null, isbn: null, publisher: null, pages: null,
        volume: null, shelf: null, place: null, edition: null,
        materialType: resourceType || null, genre: null, issn: null,
        lccn: null, subtitle: null, extent: null, size: null,
        description: null, otherDetails: null, dateAcquired: null,
        accessionNumbers: [],
      };

      sheetBooks.push(book);
      allBooks.push(book);
    }

    if (sheetBooks.length > 0) sheets.push({ name: sheetName, books: sheetBooks });
  }

  return { sheets, books: allBooks };
}

/* ── Step indicator ─────────────────────────────────────────── */
function Step({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-1.5"
         style={{ color: done ? "#15803d" : active ? "var(--accent-amber)" : "var(--text-muted)",
                  opacity: active || done ? 1 : 0.4 }}>
      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
           style={{
             background: done ? "rgba(34,197,94,0.15)" : active ? "rgba(184,122,0,0.15)" : "var(--bg-subtle)",
             border: `1.5px solid ${done ? "rgba(34,197,94,0.4)" : active ? "rgba(184,122,0,0.4)" : "var(--border)"}`,
           }}>
        {done ? <CheckCircle2 size={12} /> : n}
      </div>
      <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ══ LexoraImport — for LexoraBooks.jsx only ════════════════ */
const LexoraImport = forwardRef(function LexoraImport({ onImportComplete, onStepChange }, ref) {
  const fileRef                           = useRef(null);
  const [step, setStep]                   = useState(1);
  const [fileName, setFileName]           = useState("");
  const [parsed, setParsed]               = useState([]);
  const [parsedSheets, setParsedSheets]   = useState([]);
  const [selectedSheets, setSelectedSheets] = useState([]);
  const [progress, setProgress]           = useState({ current:0, total:0, title:"" });
  const [results, setResults]             = useState(null);
  const [dragOver, setDragOver]           = useState(false);
  const [parseError, setParseError]       = useState("");

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
    reader.onload = async (e) => {
      try {
        const result = await parseLexoraExcel(new Uint8Array(e.target.result));
        if (result.books.length === 0) {
          setParseError("No book records found. Check that the file matches the Lexora format.");
          return;
        }
        setParsedSheets(result.sheets);
        setSelectedSheets(result.sheets.map(s => s.name)); // select all by default
        setParsed(result.books);
        setStepAndNotify(2, result.books);
      } catch (err) {
        setParseError(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [setStepAndNotify]);

  const onInputChange = (e) => handleFile(e.target.files[0]);
  const onDrop        = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); };
  const onDragOver    = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave   = ()  => setDragOver(false);

  const startImport = async () => {
    const booksToImport = parsedSheets
      .filter(s => selectedSheets.includes(s.name))
      .flatMap(s => s.books)
      .slice(0, 1000);

    if (booksToImport.length === 0) {
      setParseError("No sheet selected. Please select at least one program to import.");
      return;
    }
    await runImport(booksToImport);
  };

  const runImport = async (booksToImport) => {
    setStepAndNotify(3);

    const CHUNK_SIZE = 10;
    const total      = booksToImport.length;
    setProgress({ current: 0, total, title: "" });

    let importedCount = 0;
    let updatedCount  = 0;
    const allFailed   = [];
    const allImported = [];

    for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
      const chunk    = booksToImport.slice(offset, offset + CHUNK_SIZE);
      const chunkEnd = Math.min(offset + CHUNK_SIZE, total);

      // Show first title of this chunk while in-flight
      setProgress({ current: offset, total, title: chunk[0]?.title || "" });

      try {
        const res  = await fetch(`${API_BASE}/books/lexora-import`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ books: chunk }),
        });
        const data = await res.json();

        if (data.success) {
          allImported.push(...(data.data ?? []));
          importedCount += data.imported ?? 0;
          updatedCount  += data.updated  ?? 0;
          if (data.errorsDetail?.length) allFailed.push(...data.errorsDetail);
        } else {
          chunk.forEach(b => allFailed.push({ title: b.title, error: data.error || "Unknown error" }));
        }
      } catch (err) {
        chunk.forEach(b => allFailed.push({ title: b.title, error: err.message }));
      }

      // Tick progress after chunk completes
      setProgress({ current: chunkEnd, total, title: chunk[chunk.length - 1]?.title || "" });
    }

    const summary = {
      success:      true,
      imported:     importedCount,
      updated:      updatedCount,
      errors:       allFailed.length,
      errorsDetail: allFailed,
      data:         allImported,
    };

    setResults(summary);
    setStepAndNotify(4);
    if (allImported.length > 0) onImportComplete?.(allImported);
  };

  const reset = () => {
    setStepAndNotify(1);
    setFileName(""); setParsed([]); setParsedSheets([]); setSelectedSheets([]);
    setProgress({ current:0, total:0, title:"" });
    setResults(null); setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  useImperativeHandle(ref, () => ({ step, parsed, startImport, reset }), [step, parsed, startImport, reset]);

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  // Books from currently selected sheets (for preview)
  const selectedBooks = parsedSheets
    .filter(s => selectedSheets.includes(s.name))
    .flatMap(s => s.books);

  return (
    <div className="flex flex-col gap-4">

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
                Import Lexora E-Library Excel
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:"var(--text-secondary)" }}>
                Multi-sheet format — each sheet is a program (e.g. BSIT, FICTION NOVEL).
              </p>
              <p className="text-[11px] mt-0.5" style={{ color:"var(--text-secondary)" }}>
                Columns:{" "}
                <span className="font-mono text-[10px]">
                  Subject/Course Title | Title of Book | Source | Author | Year | Resource Type | Format
                </span>
              </p>
            </div>
          </div>

          <div
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer"
            style={{
              background:  dragOver ? "rgba(184,122,0,0.05)" : "var(--bg-subtle)",
              borderColor: dragOver ? "var(--accent-amber)"  : "var(--border)",
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
                {dragOver ? "Release to upload" : "Drop your Lexora Excel file here"}
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

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background:"rgba(184,122,0,0.1)", color:"var(--accent-amber)" }}>
              {parsed.length} titles
            </span>
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{ background:"rgba(34,197,94,0.1)", color:"#15803d" }}>
              {[...new Set(parsed.map(b => b.program))].length} programs / categories
            </span>
          </div>

          {/* Sheet selector */}
          {parsedSheets.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:"var(--text-secondary)" }}>
                  Select Programs / Sheets to Import
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedSheets(parsedSheets.map(s => s.name))}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ color:"var(--accent-amber)", background:"rgba(184,122,0,0.08)", border:"1px solid rgba(184,122,0,0.2)" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedSheets([])}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                    style={{ color:"var(--text-secondary)", background:"var(--bg-subtle)", border:"1px solid var(--border-light)" }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {parsedSheets.map(sheet => {
                  const checked = selectedSheets.includes(sheet.name);
                  return (
                    <label
                      key={sheet.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                      style={{
                        background: checked ? "rgba(184,122,0,0.08)" : "var(--bg-subtle)",
                        border: `1.5px solid ${checked ? "rgba(184,122,0,0.3)" : "var(--border-light)"}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedSheets(prev =>
                            checked ? prev.filter(n => n !== sheet.name) : [...prev, sheet.name]
                          )
                        }
                        className="accent-amber-500 w-3.5 h-3.5 shrink-0"
                      />
                      <span className="text-[11px] font-semibold truncate" style={{ color:"var(--text-primary)" }}>
                        {sheet.name}
                      </span>
                      <span className="ml-auto text-[10px] font-bold shrink-0"
                            style={{ color: checked ? "var(--accent-amber)" : "var(--text-muted)" }}>
                        {sheet.books.length}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Selected count */}
              {(() => {
                const total  = selectedBooks.length;
                const capped = Math.min(total, 1000);
                return total > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                       style={{ background:"rgba(34,197,94,0.07)", border:"1.5px solid rgba(34,197,94,0.2)", color:"#15803d" }}>
                    <CheckCircle2 size={12} style={{ flexShrink:0 }} />
                    <span>
                      <strong>{capped}</strong> title{capped !== 1 ? "s" : ""} selected for import
                      {total > 1000 && (
                        <span className="ml-1" style={{ color:"#b45309" }}>
                          (capped at 1,000 — {total - 1000} will be excluded)
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]"
                       style={{ background:"rgba(220,38,38,0.07)", border:"1.5px solid rgba(220,38,38,0.2)", color:"#b91c1c" }}>
                    <XCircle size={12} style={{ flexShrink:0 }} />
                    <span>No program selected. Select at least one sheet to enable import.</span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Preview table */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color:"var(--text-secondary)" }}>
              Preview — first {Math.min(8, selectedBooks.length)} of {selectedBooks.length} selected titles
            </p>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor:"var(--border-light)", background:"var(--bg-surface)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ background:"var(--bg-subtle)", borderBottom:"1.5px solid var(--border-light)" }}>
                      {["Subject/Course", "Title", "Author", "Year", "Type", "Format", "Source"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-bold whitespace-nowrap"
                            style={{ color:"var(--text-secondary)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBooks.slice(0, 8).map((b, i) => (
                      <tr key={i} className="border-t transition-colors hover:bg-amber-50/20"
                          style={{ borderColor:"var(--border-light)" }}>
                        <td className="px-3 py-2 text-[10px] max-w-[120px] truncate" style={{ color:"var(--text-muted)" }}
                            title={b.subject_course}>
                          {b.subject_course || "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold max-w-[160px] truncate" style={{ color:"var(--text-primary)" }}
                            title={b.title}>{b.title}</td>
                        <td className="px-3 py-2 max-w-[110px] truncate" style={{ color:"var(--text-secondary)" }}
                            title={b.author}>{b.author || "—"}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color:"var(--text-secondary)" }}>
                          {b.year || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color:"var(--text-secondary)" }}>
                          {b.resource_type || "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color:"var(--text-secondary)" }}>
                          {b.format || "—"}
                        </td>
                        <td className="px-3 py-2 max-w-[120px] truncate" style={{ color:"var(--text-muted)" }}
                            title={b.source}>
                          {b.source
                            ? <a href={b.source} target="_blank" rel="noopener noreferrer"
                                 className="underline text-blue-500 hover:text-blue-700">Link</a>
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {selectedBooks.length > 8 && (
              <p className="text-[10px] mt-1" style={{ color:"var(--text-muted)" }}>
                + {selectedBooks.length - 8} more titles not shown in preview
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]"
               style={{ background:"rgba(50,102,127,0.07)", border:"1.5px solid rgba(50,102,127,0.2)", color:"#32667F" }}>
            <AlertCircle size={13} style={{ flexShrink:0, marginTop:1 }} />
            <span>
              Books are saved to the Lexora e-library table. Each sheet (program) becomes the collection label.
              Duplicates are updated automatically — existing records will be refreshed, not skipped.
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
            <p className="text-[14px] font-bold" style={{ color:"var(--text-primary)" }}>Importing Lexora books…</p>
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
          <p className="text-[10px]" style={{ color:"var(--text-muted)" }}>Please wait — do not close this modal</p>
        </div>
      )}

      {/* ══ STEP 4: Done ══ */}
      {step === 4 && results && (
        <div className="flex flex-col gap-4">

          {/* ── FIX: Total processed banner so users know all books were handled ── */}
          {(() => {
            const total     = (results.imported ?? 0) + (results.updated ?? 0);
            const hasErrors = (results.errors ?? 0) > 0;
            return (
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
                   style={{
                     background: hasErrors ? "rgba(184,122,0,0.07)" : "rgba(34,197,94,0.07)",
                     border: `1.5px solid ${hasErrors ? "rgba(184,122,0,0.25)" : "rgba(34,197,94,0.25)"}`,
                   }}>
                <CheckCircle2 size={16} style={{ color: hasErrors ? "var(--accent-amber)" : "#15803d", flexShrink:0 }} />
                <p className="text-[12px] font-semibold" style={{ color: hasErrors ? "#92400e" : "#15803d" }}>
                  <strong>{total}</strong> of <strong>{total + (results.errors ?? 0)}</strong> titles processed successfully
                  {results.updated > 0 && (
                    <span className="ml-1 font-normal" style={{ color:"var(--text-secondary)" }}>
                      ({results.imported ?? 0} new · {results.updated} already existed &amp; were updated)
                    </span>
                  )}
                </p>
              </div>
            );
          })()}

          <div className="grid grid-cols-3 gap-3">
            {/* ── FIX: Renamed from "Titles Imported" → "New Titles" to avoid confusion with "updated" books ── */}
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{ background:"rgba(34,197,94,0.08)", border:"1.5px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={26} style={{ color:"#15803d" }} />
              <p className="text-2xl font-black" style={{ color:"#15803d" }}>{results.imported ?? 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"#15803d" }}>New Titles</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{ background:"rgba(184,122,0,0.08)", border:"1.5px solid rgba(184,122,0,0.2)" }}>
              <FileSpreadsheet size={26} style={{ color:"var(--accent-amber)" }} />
              <p className="text-2xl font-black" style={{ color:"var(--accent-amber)" }}>
                {results.updated ?? 0}
              </p>
              {/* ── FIX: "Updated" label now has a subtitle so users understand these were already in the DB ── */}
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color:"var(--accent-amber)" }}>Updated</p>
              <p className="text-[9px] text-center leading-tight" style={{ color:"var(--text-muted)" }}>already in library</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-4 rounded-xl"
                 style={{
                   background: (results.errors ?? 0) > 0 ? "rgba(220,38,38,0.07)" : "var(--bg-subtle)",
                   border: `1.5px solid ${(results.errors ?? 0) > 0 ? "rgba(220,38,38,0.2)" : "var(--border-light)"}`,
                 }}>
              <XCircle size={26} style={{ color:(results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)" }} />
              <p className="text-2xl font-black" style={{ color:(results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)" }}>
                {results.errors ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider"
                 style={{ color:(results.errors ?? 0) > 0 ? "#b91c1c" : "var(--text-muted)" }}>Failed</p>
            </div>
          </div>

          {(results.errorsDetail ?? []).length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:"#b91c1c" }}>Failed books</p>
              <div className="rounded-xl border max-h-[120px] overflow-y-auto"
                   style={{ borderColor:"rgba(220,38,38,0.2)", background:"var(--bg-surface)" }}>
                {results.errorsDetail.map((f, i) => (
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

export default LexoraImport;