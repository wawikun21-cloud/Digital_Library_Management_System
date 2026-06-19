/**
 * BookWordImport.jsx - DOCX Bulk Importer using mammoth
 * Parses Word documents assuming library catalog format:
 * Title: Foo
 * Author: Bar
 * Publisher: Pub
 * Year: 2023
 * Pages: 250
 * (blank line or --- separator)
 */

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import mammoth from "mammoth/mammoth.browser";
import { FileText, Upload, AlertCircle, CheckCircle2, XCircle, Loader2, X, Info } from "lucide-react";
import { StepBar, ProgressBar, ImportSpinner, ImportResults, ErrorList } from "./ImportSteps";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const CHUNK_SIZE = 10;

function parseWordDoc(arrayBuffer) {
  return mammoth.convertToHtml({ arrayBuffer })
    .then(({ value }) => {
      // Strip HTML tags, normalize whitespace
      const text = value
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/[\r\n]+/g, "\n")
        .trim();

      const books = [];
      const seenTitles = new Set();

      // Split into potential book blocks by double newlines or page breaks
      const blocks = text.split(/\n\s*\n||\-\-+/).map(b => b.trim()).filter(Boolean);

      let currentBook = {};

      for (const block of blocks) {
        const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

        // Skip short blocks or obvious non-book content
        if (lines.length < 2) continue;

        // Pattern match common library formats
        const titleMatch = lines.find(l => /^(title|book title)[:\s\-]/i.test(l)) || 
                          lines[0].match(/^[A-Z][^.!?]{10,}/); // Likely title (capitalized, long)

        if (titleMatch) {
          // Save previous book if exists
          if (currentBook.title) {
            if (!seenTitles.has(currentBook.title.toLowerCase())) {
              books.push(normalizeBook(currentBook));
              seenTitles.add(currentBook.title.toLowerCase());
            }
          }

          currentBook = { title: extractValue(titleMatch) || lines[0] };
          continue;
        }

        // Extract fields from remaining lines
        const authorMatch = lines.find(l => /^(author|writer)[:\s\-]/i.test(l));
        if (authorMatch) currentBook.author = extractValue(authorMatch);

        const yearMatch = lines.find(l => /^\d{4}$/.test(l) || /^(year|pub\.?\s*year?)[:\s\-]\d{4}/i.test(l));
        if (yearMatch) currentBook.year = parseInt(extractValue(yearMatch));

        const publisherMatch = lines.find(l => /^(publisher|pub)[:\s\-]/i.test(l));
        if (publisherMatch) currentBook.publisher = extractValue(publisherMatch);

        const pagesMatch = lines.find(l => /^(pages?|p\.)[:\s\-]\d+|^(\d+)\s+pages?/i.test(l));
        if (pagesMatch) currentBook.pages = extractValue(pagesMatch);

        // Genre/collection from capitalized short phrases
        const genreMatch = lines.find(l => /^[A-Z][a-z]{2,}\s*[A-Z]?$/);
        if (genreMatch && !currentBook.genre) currentBook.genre = genreMatch;
      }

      // Final book
      if (currentBook.title) {
        books.push(normalizeBook(currentBook));
      }

      return books;
    })
    .catch(err => {
      throw new Error(`DOCX parsing failed: ${err.message}`);
    });
}

function extractValue(match) {
  const clean = String(match).replace(/^[^:]+[:\s\-]+/i, "").trim();
  return clean || null;
}

function normalizeBook(raw) {
  return {
    title: raw.title?.trim(),
    author: raw.author?.trim(),
    authors: raw.author?.trim(),
    publisher: raw.publisher?.trim(),
    year: raw.year,
    pages: raw.pages,
    genre: raw.genre,
    // Defaults/nulls for DB compatibility
    isbn: null, callNumber: null, collection: null, volume: null,
    edition: null, place: null, shelf: null, materialType: "Book",
    accessionNumbers: [], // Single title, no copies from Word
    quantity: 1,
    status: "Available",
  };
}

const BookWordImport = forwardRef(function BookWordImport({ onImportComplete, onStepChange }, ref) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState([]);
  const [preview, setPreview] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0, title: "" });
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState("");

  const steps = [
    { n: "1", label: "Upload" },
    { n: "2", label: "Preview" },
    { n: "3", label: "Import" },
    { n: "4", label: "Done" },
  ];

  const setStepAndNotify = useCallback((s) => {
    setStep(s);
    onStepChange?.(s, parsed);
  }, [parsed, onStepChange]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!/\.(docx|doc)$/i.test(file.name)) {
      setParseError("Only .docx files supported (Word Document)");
      return;
    }
    setParseError("");
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const books = await parseWordDoc(e.target.result);
        if (!books?.length) {
          setParseError("No books found. Expected format: 'Title: Foo\\nAuthor: Bar\\nYear: 2023'");
          return;
        }
        setParsed(books);
        setPreview(books.slice(0, 8));
        setStepAndNotify(2);
      } catch (err) {
        setParseError(err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [setStepAndNotify]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const startImport = async () => {
    setStepAndNotify(3);
    await runImport();
  };

  const runImport = async () => {
    const total = parsed.length;
    setProgress({ current: 0, total, title: "" });

    const allImported = [];
    const allFailed = [];

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = parsed.slice(i, i + CHUNK_SIZE);
      setProgress({ current: i, total, title: chunk[0]?.title });

      try {
        const res = await fetch(`${API_BASE}/books/bulk-import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ books: chunk }),
        });
        const data = await res.json();

        if (data.success) {
          allImported.push(...(data.data || []));
          if (data.errorsDetail?.length) allFailed.push(...data.errorsDetail);
        } else {
          chunk.forEach(b => allFailed.push({ title: b.title, error: data.error }));
        }
      } catch (err) {
        chunk.forEach(b => allFailed.push({ title: b.title, error: err.message }));
      }

      setProgress({ current: Math.min(i + CHUNK_SIZE, total), total });
    }

    const summary = {
      imported: allImported.length,
      existing: 0,
      errors: allFailed.length,
      errorsDetail: allFailed,
      data: allImported,
    };

    setResults(summary);
    setStepAndNotify(4);
    onImportComplete?.(allImported);
  };

  const reset = () => {
    setStepAndNotify(1);
    setParsed([]);
    setPreview([]);
    // ... reset others
  };

  useImperativeHandle(ref, () => ({ step, parsed, startImport, reset, checking: false }));

  return (
    <div className="flex flex-col gap-4">
      <StepBar steps={steps} currentStep={step} />

      {step === 1 && (
        <>
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(184,122,0,0.07)", border: "1.5px solid rgba(184,122,0,0.18)" }}>
            <FileText size={15} style={{ color: "var(--accent-amber)" }} />
            <div>
              <p style={{ color: "var(--text-primary)" }} className="font-semibold text-[12px]">
                Import from Microsoft Word (.docx)
              </p>
              <p style={{ color: "var(--text-secondary)" }} className="text-[11px] mt-0.5">
                Extracts books using patterns like "Title: ", "Author: ", "Year: ".
              </p>
            </div>
          </div>
          <div
            className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed"
            style={{
              background: dragOver ? "rgba(184,122,0,0.05)" : "var(--bg-subtle)",
              borderColor: dragOver ? "var(--accent-amber)" : "var(--border)",
            }}
            onClick={() => fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragOver(false)}
          >
            <Upload size={26} style={{ color: "var(--accent-amber)" }} />
            <p style={{ color: "var(--text-primary)" }} className="font-semibold text-[13px]">
              Drop .docx file or click
            </p>
            <p style={{ color: "var(--text-muted)" }} className="text-[10px]">
              Word Document only
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {parseError && (
            <div style={{ background: "rgba(220,38,38,0.07)", border: "1.5px solid rgba(220,38,38,0.2)", color: "#b91c1c" }} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]">
              <XCircle size={13} />
              {parseError}
            </div>
          )}
        </>
      )}

      {step === 2 && parsed.length > 0 && (
        <>
          <div style={{ background: "rgba(34,197,94,0.07)", border: "1.5px solid rgba(34,197,94,0.2)" }} className="flex items-center justify-between px-3 py-2 rounded-xl">
            <div style={{ color: "#15803d" }} className="flex items-center gap-2 text-[12px] font-semibold">
              <CheckCircle2 size={13} />
              <span>{fileName}</span>
              <span style={{ color: "var(--text-muted)" }}>{parsed.length} titles extracted</span>
            </div>
            <button onClick={reset} className="p-1 rounded-lg hover:bg-red-50">
              <X size={13} style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Preview table */}
          <div>
            <p style={{ color: "var(--text-secondary)" }} className="text-[10px] font-black uppercase tracking-widest mb-1.5">
              Preview — first 8 books
            </p>
            {/* Simplified preview table similar to BookImport */}
            <div style={{ borderColor: "var(--border-light)" }} className="rounded-xl overflow-hidden border">
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ background: "var(--bg-subtle)" }}>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Publisher</th>
                    <th>Year</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((b, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-primary)" }} className="font-semibold px-3 py-2">{b.title}</td>
                      <td style={{ color: "var(--text-secondary)" }} className="px-3 py-2">{b.author || "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }} className="px-3 py-2">{b.publisher || "—"}</td>
                      <td style={{ color: "var(--text-secondary)" }} className="px-3 py-2">{b.year || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {step === 3 && <ImportSpinner title="Importing Word documents..." />}

      {step === 4 && results && (
        <>
          <ImportResults results={results} />
          <ErrorList errorsDetail={results.errorsDetail} />
        </>
      )}
    </div>
  );
});

export default BookWordImport;

