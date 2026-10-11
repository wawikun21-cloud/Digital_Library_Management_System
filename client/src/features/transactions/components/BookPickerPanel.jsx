/**
 * features/transactions/components/BookPickerPanel.jsx
 *
 * Book search dropdown + selected-books list with inline copy picker.
 * Extracted from the borrow modal of the former pages/Borrowed.jsx.
 */

import { BookOpen, Loader2, X } from "lucide-react";
import CopiesList from "../../../components/books/CopiesList";
import { MAX_BOOKS } from "../constants/transactionRules";
import FieldLabel from "./FieldLabel";

export default function BookPickerPanel({ borrowForm }) {
  const {
    form, errors,
    bookQuery, setBookQuery, bookResults, bookLoading,
    addBook, removeBook, setBookAccession,
  } = borrowForm;

  return (
    <>
      {/* ── Book search ── */}
      <div className="flex items-center justify-between">
        <FieldLabel label="Books to Borrow" required />
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            background: form.books.length >= MAX_BOOKS ? "rgba(234,139,51,0.15)" : "rgba(50,102,127,0.1)",
            color:      form.books.length >= MAX_BOOKS ? "#c05a0a" : "#32667F",
          }}>
          {form.books.length}/{MAX_BOOKS} books
        </span>
      </div>

      {form.books.length < MAX_BOOKS && (
        <div className="relative">
          <div className="relative flex items-center">
            <BookOpen size={14} className="absolute left-3" style={{ color: "var(--text-muted)" }} />
            <input
              value={bookQuery}
              onChange={e => setBookQuery(e.target.value)}
              placeholder="Search by accession no. or title…"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-[13px] border outline-none"
              style={{
                background:  "var(--bg-main)",
                borderColor: errors.books ? "#EA8B33" : "var(--border)",
                color:       "var(--text-primary)",
              }}
            />
            {bookLoading && <Loader2 size={13} className="absolute right-3 animate-spin" style={{ color: "var(--text-muted)" }} />}
          </div>

          {bookResults.length > 0 && (
            <div className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-lg"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
              {bookResults.map(b => (
                <button key={b.id} onClick={() => addBook(b)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-amber-500/10 transition-colors">
                  <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(50,102,127,0.12)" }}>
                    <BookOpen size={12} style={{ color: "#32667F" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {b.accessionNumber && `Acc: ${b.accessionNumber} · `}{b.author}
                    </p>
                  </div>
                  <span className="ml-auto text-[11px] shrink-0" style={{ color: "#2d7a4f" }}>{b.quantity} avail.</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {errors.books && <p className="text-[11px] text-orange-500 -mt-2">{errors.books}</p>}

      {/* Selected books — with inline copy picker */}
      {form.books.length > 0 && (
        <div className="flex flex-col gap-3">
          {form.books.map(b => (
            <div key={b.id} className="flex flex-col rounded-lg overflow-hidden"
              style={{ background: "var(--bg-main)", border: "1px solid var(--border)" }}>

              {/* Book header row */}
              <div className="flex items-center gap-3 px-3 py-2.5">
                <BookOpen size={14} style={{ color: "#32667F" }} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>{b.title}</p>
                  {b.accessionNumber ? (
                    <p className="text-[11px]" style={{ color: "#2d7a4f" }}>
                      ✓ Copy selected: <strong>{b.accessionNumber}</strong>
                    </p>
                  ) : (
                    <p className="text-[11px]" style={{ color: "#c05a0a" }}>
                      ⚠ Select a copy below
                    </p>
                  )}
                </div>
                <button onClick={() => removeBook(b.id)} style={{ color: "var(--text-muted)" }} title="Remove book">
                  <X size={14} />
                </button>
              </div>

              {/* ✅ CopiesList — user picks the specific copy here */}
              <div className="px-3 pb-3">
                <CopiesList
                  bookId={b.id}
                  selectedAccession={b.accessionNumber}
                  onSelectCopy={(accession) => setBookAccession(b.id, accession)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
