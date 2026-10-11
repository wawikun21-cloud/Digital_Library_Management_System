/**
 * features/transactions/constants/transactionRules.js
 *
 * Transaction business-rule constants and shared form shape.
 *
 * NOTE (single source of truth): the backend transaction service is the
 * authoritative owner of these rules. MAX_BOOKS caps how many titles a
 * student may borrow at once and FINE_PER_DAY is the overdue fine rate —
 * both are mirrored here only for instant UI feedback and validation;
 * the server re-enforces both on every mutation.
 */

export const MAX_BOOKS    = 2;
export const FINE_PER_DAY = 5; // ₱5 per day overdue

/** Status pill styles for the detail modal (was an unused page-level constant). */
export const STATUS_STYLE = {
  Borrowed: { bg: "rgba(50,102,127,0.12)",  color: "#32667F" },
  Returned: { bg: "rgba(50,127,79,0.12)",   color: "#2d7a4f" },
  Overdue:  { bg: "rgba(234,139,51,0.12)",  color: "#c05a0a" },
};

/** Blank borrow form. `borrow_date` / `due_date` seed from today / tomorrow. */
import { today, tomorrow } from "../utils/transactionDates";

export const EMPTY_FORM = {
  borrower_type:    "student",  // "student" | "faculty"
  borrower_name:    "",
  borrower_id_number: "",
  borrower_contact: "",
  borrower_email:   "",
  borrower_course:  "",
  borrower_yr_level:"",
  borrow_date:      today(),
  due_date:         tomorrow(),
  // books: array of { id, title, author, accessionNumber }
  books: [],
};
