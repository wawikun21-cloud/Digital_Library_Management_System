/**
 * features/transactions/hooks/useBorrowForm.js
 *
 * Borrow-modal state: borrower lookup (student / faculty), book search with
 * accession exclusion, copy selection, validation and submit. Extracted
 * from the former pages/Borrowed.jsx. The modal mounts per open, so the
 * form starts fresh each time — matching the original openBorrowModal().
 */

import { useState, useEffect, useCallback } from "react";
import useDebounce from "../../../hooks/useDebounce";
import {
  lookupStudent, lookupFaculty, searchBooks,
} from "../api/transactionsApi";
import { EMPTY_FORM, MAX_BOOKS } from "../constants/transactionRules";
import { today, tomorrow } from "../utils/transactionDates";
import { validateBorrowForm } from "../validation/borrowValidation";

export function useBorrowForm({ onBorrow, onClose }) {
  const [form, setForm]   = useState(() => ({ ...EMPTY_FORM, borrow_date: today(), due_date: tomorrow() }));
  const [errors, setErrors] = useState({});

  // ── Borrower search state ─────────────────────────────
  const [borrowerQuery,    setBorrowerQuery]    = useState("");
  const [borrowerResults,  setBorrowerResults]  = useState([]);
  const [borrowerLoading,  setBorrowerLoading]  = useState(false);
  const [borrowerSelected, setBorrowerSelected] = useState(false);
  const debouncedBorrower = useDebounce(borrowerQuery, 350);

  // ── Book search state ─────────────────────────────────
  const [bookQuery,   setBookQuery]   = useState("");
  const [bookResults, setBookResults] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);
  const debouncedBook = useDebounce(bookQuery, 350);

  // ── Borrower lookup ───────────────────────────────────
  // Handles both student (by ID number) and faculty (by name).
  // The student endpoint now returns an array when multiple matches exist.
  useEffect(() => {
    if (!debouncedBorrower.trim() || borrowerSelected) { setBorrowerResults([]); return; }
    const type = form.borrower_type;
    const run = async () => {
      setBorrowerLoading(true);
      try {
        let data;
        if (type === "student") {
          data = await lookupStudent(debouncedBorrower);
          if (data.success) {
            // Backend returns data as array (multiple) or single object (exact match)
            const results = Array.isArray(data.data) ? data.data : [data.data];
            setBorrowerResults(results);
          } else {
            setBorrowerResults([]);
          }
        } else {
          data = await lookupFaculty(debouncedBorrower);
          setBorrowerResults(data.success ? data.data : []);
        }
      } catch { setBorrowerResults([]); }
      finally  { setBorrowerLoading(false); }
    };
    run();
  }, [debouncedBorrower, form.borrower_type, borrowerSelected]);

  // ── Book search ───────────────────────────────────────
  useEffect(() => {
    if (!debouncedBook.trim()) { setBookResults([]); return; }
    const run = async () => {
      setBookLoading(true);
      try {
        const data = await searchBooks(debouncedBook);
        // Exclude already-selected ACCESSIONS (unique per copy)
        const selectedAccessions = form.books.map(b => b.accessionNumber).filter(Boolean);
        setBookResults(data.success ? data.data.filter(b => {
          const acc = b.first_available_accession || b.accessionNumber;
          return !selectedAccessions.includes(acc);
        }) : []);
      } catch { setBookResults([]); }
      finally  { setBookLoading(false); }
    };
    run();
  }, [debouncedBook, form.books]);

  // ── Borrower type toggle — resets the form, keeps the dates ──
  const setBorrowerType = useCallback((type) => {
    setForm(f => ({ ...EMPTY_FORM, borrow_date: f.borrow_date, due_date: f.due_date, borrower_type: type }));
    setBorrowerQuery("");
    setBorrowerSelected(false);
    setBorrowerResults([]);
  }, []);

  const selectBorrower = useCallback((person) => {
    if (form.borrower_type === "student") {
      const fullName = (person.first_name && person.last_name)
        ? `${person.first_name} ${person.last_name}`.trim()
        : (person.student_name || "");
      setForm(f => ({
        ...f,
        borrower_name:      fullName,
        borrower_id_number: person.student_id_number,
        borrower_contact:   person.student_contact  || "",
        borrower_email:     person.student_email    || "",
        borrower_course:    person.student_course   || "",
        borrower_yr_level:  person.student_yr_level || "",
      }));
      setBorrowerQuery(person.student_id_number);
    } else {
      setForm(f => ({
        ...f,
        borrower_name:    person.faculty_name,
        borrower_course:  person.department || "",
        borrower_id_number: "",
      }));
      setBorrowerQuery(person.faculty_name);
    }
    setBorrowerSelected(true);
    setBorrowerResults([]);
    setErrors(e => { const n = {...e}; delete n.borrower; return n; });
  }, [form.borrower_type]);

  const clearBorrower = useCallback(() => {
    setBorrowerQuery("");
    setBorrowerSelected(false);
    setForm(f => ({
      ...f,
      borrower_name: "", borrower_id_number: "",
      borrower_contact: "", borrower_email: "",
      borrower_course: "", borrower_yr_level: "",
    }));
  }, []);

  // ── Add book to list ──────────────────────────────────
  // accessionNumber starts null — user picks the specific copy via CopiesList below.
  const addBook = useCallback((book) => {
    if (form.borrower_type !== "faculty" && form.books.length >= MAX_BOOKS) return;
    if (form.books.some(b => b.id === book.id)) return;
    setForm(f => ({ ...f, books: [...f.books, { ...book, accessionNumber: null }] }));
    setBookQuery("");
    setBookResults([]);
    setErrors(e => { const n = { ...e }; delete n.books; return n; });
  }, [form.borrower_type, form.books]);

  // ── Update which copy accession is selected for a book ──
  const setBookAccession = useCallback((bookId, accession) => {
    setForm(f => ({
      ...f,
      books: f.books.map(b => b.id === bookId ? { ...b, accessionNumber: accession } : b),
    }));
    setErrors(e => { const n = { ...e }; delete n.books; return n; });
  }, []);

  const removeBook = useCallback((id) => {
    setForm(f => ({ ...f, books: f.books.filter(b => b.id !== id) }));
  }, []);

  const setBorrowDate = useCallback((borrow_date) => {
    setForm(f => ({ ...f, borrow_date }));
  }, []);

  const setDueDate = useCallback((due_date) => {
    setForm(f => ({ ...f, due_date }));
    setErrors(e => { const n = { ...e }; delete n.due_date; return n; });
  }, []);

  // ── Submit ────────────────────────────────────────────
  const submit = useCallback(async () => {
    const e = validateBorrowForm(form);
    if (Object.keys(e).length) { setErrors(e); return; }

    const ok = await onBorrow(form);
    if (ok) onClose();
  }, [form, onBorrow, onClose]);

  return {
    form, errors,
    borrowerQuery, setBorrowerQuery, borrowerResults, borrowerLoading, borrowerSelected,
    bookQuery, setBookQuery, bookResults, bookLoading,
    setBorrowerType, selectBorrower, clearBorrower,
    addBook, setBookAccession, removeBook,
    setBorrowDate, setDueDate,
    submit,
  };
}
