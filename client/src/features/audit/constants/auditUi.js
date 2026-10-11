/**
 * features/audit/constants/auditUi.js
 *
 * Filter options and table configuration for the audit trail.
 * Extracted from the module scope of the former pages/AuditLog.jsx.
 */

export const ENTITY_TYPES = ["book", "student", "faculty", "transaction", "attendance", "lexora_book", "auth"];

export const ACTIONS = [
  "CREATE", "UPDATE", "DELETE", "RESTORE", "BULK_IMPORT",
  "LOGIN", "LOGIN_FAILED", "LOGOUT",
  "BORROW", "RETURN",
  "CHECK_IN", "CHECK_OUT",
];

export const PAGE_SIZE        = 50;
export const TEXT_DEBOUNCE_MS = 450; // ms to wait after last keystroke before fetching

export const TABLE_HEADERS = ["ID", "Timestamp", "User", "Entity", "Record ID", "Action", "IP Address"];

export const EMPTY_FILTERS = {
  entity_type  : "",
  action       : "",
  user_username: "",
  date_from    : "",
  date_to      : "",
};
