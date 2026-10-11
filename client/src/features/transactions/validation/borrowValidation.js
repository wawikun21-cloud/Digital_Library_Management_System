/**
 * features/transactions/validation/borrowValidation.js
 *
 * Borrow form validation. Extracted verbatim from the `validate()` function
 * in the former pages/Borrowed.jsx so the modal (and tests) share it.
 */
export function validateBorrowForm(form) {
  const e = {};
  if (!form.borrower_name.trim()) e.borrower = "Please select a borrower";
  if (form.books.length === 0)    e.books    = "Please add at least 1 book";
  if (!form.due_date)             e.due_date = "Due date is required";

  // ✅ FIX: every added book must have a copy selected from CopiesList
  const missingAcc = form.books.find(b => !b.accessionNumber);
  if (missingAcc) e.books = `Please select a copy for "${missingAcc.title}"`;

  return e;
}
