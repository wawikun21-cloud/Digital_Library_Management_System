# Anti-Spaghetti Rules — File Size, Responsibility & Page Composition

## Purpose

This file defines the **feature-based structure** the application must use, **when to split code, what must never be mixed, and how to stop a file from growing out of control**.

The application uses React, Vite, JavaScript, Node.js, Express, and MySQL.

The coding agent MUST follow these rules when creating, modifying, or reviewing code.

> **A file should have one reason to change. If you can describe it only with "and", it is doing too much.**

---

# 1. Feature-Based Structure

The application MUST use a **feature-based architecture**. Organize code around business features, not around file types.

> **Everything specific to a feature lives inside that feature. Only genuinely shared code lives outside.**

## 1.1 Frontend Structure

```text
src/
├── features/
│   ├── auth/
│   ├── users/
│   ├── books/
│   ├── transactions/
│   └── reports/
│
├── components/ui/      // generic shared UI only
├── layouts/
├── routes/
├── hooks/              // generic shared hooks only (useDebounce, etc.)
├── utils/              // focused shared utils (dateUtils, formatUtils)
└── api/                // shared HTTP client / base config
```

Each feature owns its code:

```text
features/transactions/
├── pages/
│   └── BorrowedPage.jsx
├── components/
│   ├── BorrowModal.jsx
│   ├── BorrowedTable.jsx
│   └── TransactionSummary.jsx
├── hooks/
│   └── useTransactions.js
├── api/
│   └── transactionsApi.js
├── services/
│   └── transactionService.js    // only if real business logic exists
├── utils/
│   └── transactionHelpers.js
├── validation/
│   └── borrowValidation.js
└── index.js                     // public API of the feature
```

## 1.2 Backend Structure

```text
server/src/
├── features/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.repository.js
│   │   ├── auth.routes.js
│   │   └── auth.validation.js
│   ├── transactions/
│   │   ├── transaction.controller.js
│   │   ├── transaction.service.js
│   │   ├── transaction.repository.js
│   │   ├── transaction.routes.js
│   │   └── transaction.validation.js
│   └── books/
│
├── middleware/
├── config/
├── database/
└── shared/
```

Do NOT organize the backend as global `controllers/`, `services/`, `models/`, and `routes/` folders holding dozens of unrelated files.

## 1.3 Layer Flow

Every feature follows the same traceable path:

```text
Page → Component → Hook → (Service) → API module
        ↓ HTTP
Route → Controller → Service → Repository → MySQL
```

- Component: renders UI
- Hook: React state + calls
- Frontend service: UX-level transformation (only when needed)
- API module: HTTP only
- Controller: thin, request in / response out
- Backend service: business rules and transactions
- Repository: SQL only

## 1.4 Where Does New Code Go?

```text
Is it specific to one feature?
    YES → put it inside that feature.
    NO  → Is it genuinely used by multiple unrelated features?
            YES → shared (components/ui, utils, shared/)
            NO  → reconsider whether the abstraction is needed.
```

Do not move code to a shared folder just because two files currently import it. A `TrainingCard` or `TransactionHelpers` is not "shared" because it is a component or a util.

## 1.5 Feature Boundaries

- A feature MUST be removable with minimal impact on other features.
- Features MUST NOT import another feature's internal files. Import through the feature's `index.js`.
- Circular dependencies between features are forbidden.
- Shared code never imports from a feature. Dependencies point toward shared, not away from it.

Bad:

```js
import TrainingCard from "../../features/trainings/components/cards/internal/TrainingCard";
```

Good:

```js
import { TrainingCard } from "../../features/trainings";
```

## 1.6 Feature Public API

Each feature exposes only what others need through `index.js`:

```js
export { BorrowedPage } from "./pages/BorrowedPage";
export { useTransactions } from "./hooks/useTransactions";
```

Everything else is internal.

## 1.7 Shared Code Rules

- `components/ui/` holds generic UI only: `Button`, `Modal`, `ModalShell`, `Input`, `DateInput`, `FieldLabel`, `Table`.
- Feature UI (`BookCard`, `BorrowModal`) stays in the feature.
- `utils/` holds focused files (`dateUtils.js`, `formatUtils.js`). Never a single `utils.js`.
- Feature-specific helpers stay in `features/<name>/utils/`.

## 1.8 Scale the Structure to the Feature

Architecture should match complexity. Do not create 20 files for a small feature.

```text
features/announcements/
├── AnnouncementsPage.jsx
└── announcementsApi.js
```

is fine when that is all the feature needs. Add `hooks/`, `services/`, and `validation/` when the feature grows into needing them.

## 1.9 Before Creating New Code

Inspect the project first:

1. Does this already exist (component, hook, util, API function, query)?
2. Can an existing one be extended?
3. Which feature owns this?
4. Is it genuinely shared?

Do not create duplicate implementations.

---

# 2. Review Triggers (not hard limits)

Line count is a signal, not a rule. When a file crosses these thresholds, STOP and review its responsibilities before adding more code.

| File type | Review at | Action |
|---|---|---|
| Page (`*Page.jsx`) | ~150 lines | Must be composition only. Extract anything else. |
| Component | ~250 lines | Look for sections with their own state or purpose. |
| Hook | ~150 lines | Probably doing more than one job. Split by concern. |
| Backend controller / service / repository | ~250 lines | Split by use case or resource. |
| Any file | ~400 lines | Do not add features. Refactor first. |

Do not split purely to hit a number. Split when the file mixes responsibilities.

---

# 3. Pages Are Composition Only

A page MUST only:

- Call feature hooks
- Hold UI-level state (which modal is open, which row is selected)
- Arrange child components
- Pass props and callbacks down

A page MUST NOT contain:

- Raw `fetch` / Axios calls
- Validation rules
- Data transformation or normalization
- Business calculations (fines, totals, statuses)
- Large JSX blocks for modals, forms, or cards
- Helper functions or sub-components defined in the same file

Target shape:

```jsx
function BorrowedPage() {
  const { txns, loading, returnBook, removeTxn } = useTransactions();
  const { filtered, summary, filters, setFilters } = useTransactionFilters(txns);
  const [activeModal, setActiveModal] = useState(null);

  return (
    <>
      <TransactionSummary summary={summary} />
      <TransactionToolbar filters={filters} onChange={setFilters} onBorrow={() => setActiveModal("borrow")} />
      <BorrowedTable transactions={filtered} loading={loading} />
      <BorrowModal open={activeModal === "borrow"} onClose={() => setActiveModal(null)} />
    </>
  );
}
```

---

# 4. Extract Components When

Extract a component when ANY of these is true:

- It owns its own state (search box, dropdown, form section)
- It is a modal, drawer, or dialog
- It appears more than once, or is mapped over a list
- It has its own loading/empty/error states
- The JSX block is longer than ~60 lines
- It is wrapped in an IIFE inside JSX (`{(() => { ... })()}`)

An IIFE in JSX is a signal that a component is missing. Extract it.

Do NOT extract when the block is a few lines, used once, and has no state of its own.

---

# 5. No Sub-Components in Page Files

Do not define helper components at the bottom of a page file.

Bad:

```text
BorrowedPage.jsx
├── BorrowedPage()
├── ModalShell()
├── FieldLabel()
├── DateInput()
└── ModalFooter()
```

Good:

- Generic UI (`ModalShell`, `FieldLabel`, `DateInput`, `ModalFooter`) → `components/ui/`
- Feature-specific pieces → `features/<feature>/components/`

---

# 6. Hooks Are Thin Glue

Hooks MUST:

- Manage React state (data, loading, error)
- Call API modules or services
- Return data and actions to components
- Subscribe to effects (WebSocket, timers, debounce)

Hooks MUST NOT contain:

- Business rules
- Validation logic
- Data transformation that could run without React
- Large inline calculations

If logic inside a hook could run without React, move it to `services/` or `utils/` in the same feature.

Split hooks by concern, not by page:

```text
useTransactions()          // load, mutate, real-time sync
useTransactionFilters()    // query, status, type, filtered list, summary
useBorrowForm()            // form state, errors, submit
useBorrowerLookup()        // debounced search
useBookSearch()            // debounced search
```

One giant `usePageLogic()` hook is the same spaghetti in a different file. Do not create it.

---

# 7. State Limits

If a single component has more than **~8 `useState` calls**, review it.

Common fixes:

- Group related state into one hook (`useBorrowForm`)
- Use `useReducer` when state transitions depend on each other
- Move modal-specific state into the modal component itself, so the page does not hold state it does not use
- Keep state as low in the tree as possible

Page-level state should be limited to what multiple children genuinely share.

---

# 8. API Access Rules

- ALL HTTP calls go through the feature's `api/` module.
- Raw `fetch("/api/...")` or Axios calls inside components, pages, or hooks are forbidden.
- The API module owns: base URL handling, headers, auth, response parsing, and normalization of returned data.
- Transport errors MUST throw. Business failures MAY return `{ success: false, error }`. Keep the two distinct so the UI can show the right message.

Reason: a raw relative path works in development but breaks silently in production when frontend and backend are on different domains.

Normalize data **once**, in the API layer (dates, number casting), not in every component that uses it.

---

# 9. No Name Shadowing

Never declare a local variable or function with the same name as an imported one.

Bad:

```js
import { fetchTransactions } from "../api/transactionsApi";

const fetchTransactions = useCallback(async () => {
  const data = await fetchTransactions(); // calls itself
}, []);
```

Prefer distinct names:

```js
import { fetchTransactions } from "../api/transactionsApi";

const loadTransactions = useCallback(async () => {
  const data = await fetchTransactions();
}, []);
```

Naming convention:

- API module: `fetchX`, `createX`, `updateX`, `deleteX`
- Hook actions: `loadX`, `addX`, `removeX`, `saveX`

---

# 10. Single Source of Truth for Business Rules

- A business rule (fine amount, overdue status, borrow limits, permissions) MUST have **one authoritative implementation**.
- Authoritative rules live in the **backend service**.
- The frontend displays server-computed values. It MUST NOT silently recompute them with its own constants.
- If a client-side calculation is unavoidable (instant preview), name it clearly as display-only (`previewFine`) and never use it as the source of truth.
- Constants shared by rules (`FINE_PER_DAY`, `MAX_BOOKS`) must not be duplicated across frontend and backend without a comment pointing to the owner.

---

# 11. Centralize Repeated Patterns

If the same block appears three or more times, extract it.

Common cases:

- `try { ... } catch { showToast("Failed to connect") }` repeated in every handler
- The same `style={{ ... }}` object repeated across elements
- The same modal header/footer markup
- The same "map over rows, replace by id" state update

Fixes:

- Error + toast handling: one helper or hook-level handler
- Repeated inline styles: a shared component, a CSS class, or a style constant
- Row update by id: one `replaceTxn(id, data)` function

Do NOT build a universal abstraction after only two similar blocks. Wait for three, and confirm they truly share behavior.

---

# 12. Utilities Placement

- Generic helpers (dates, formatting, string handling) → `utils/dateUtils.js`, `utils/formatUtils.js` (focused files, never one `utils.js`)
- Feature-specific helpers (`isOverdue`, `calcFine`, `sanitizeTxns`) → `features/<feature>/utils/`
- Constants used by one feature → inside that feature
- Never leave helper functions at the top of a component file. Component files contain components.

---

# 13. Modals and Forms

- Each modal is its own component with its own file.
- A modal receives `open`, `onClose`, and the data/callbacks it needs.
- Form state, validation, and submit logic go in a feature hook (`useBorrowForm`), not in the page.
- Validation rules live in `validation/` (or the hook) and are reusable by the form and tests.
- Backend validation is mandatory regardless of frontend validation.
- A form with search, selection lists, and multiple sections is split by section (`BorrowerSearch`, `BookPicker`, `DateFields`).

---

# 14. Backend Rules

- Controllers: parse request, call service, return response. Nothing else.
- Services: business rules, workflows, transactions.
- Repositories: SQL only.
- No SQL in controllers. No HTTP concerns (`req`, `res`) in services or repositories.
- Route files list routes only. No logic inside route definitions.
- Real-time events (WebSocket/Socket.io) are emitted from the service layer through a small event module, not scattered through controllers.

---

# 15. Refactoring an Oversized File

When asked to modify a file that is already too large:

1. Read the whole file first. List every responsibility it has.
2. Do NOT mix the refactor with a new feature. Do them in separate steps.
3. Extract in this order, running the app between steps:
   1. Constants and pure helpers
   2. Generic UI components (to `components/ui/`)
   3. Data-fetching and mutation logic (to a hook)
   4. Filter/derived-data logic (to a hook)
   5. Modals and large JSX sections (to feature components)
   6. Form logic (to a form hook)
4. Preserve behavior. No visual or functional changes during a refactor.
5. Update imports and delete the old code. Do not leave duplicate implementations.
6. Confirm nothing else imported what you moved.

If the refactor is too large to do safely at once, say so and propose the steps instead of attempting everything.

---

# 16. Anti-Patterns to Reject

The agent MUST NOT produce:

- A page file over ~400 lines
- A page that contains its own modals' full JSX
- Helper components defined in the same file as the page
- IIFEs inside JSX for non-trivial blocks
- Raw `fetch` or Axios in components
- Local names shadowing imports
- Business constants duplicated on client and server
- `usePageLogic()` / `useEverything()` mega-hooks
- A single `utils.js`, `helpers.js`, or `common.js`
- Comments like `// FIX`, `// TODO later` left as the only explanation for a hack
- Copy-pasted blocks with small edits instead of a shared component
- A new abstraction with more than ~6 props created to serve a single caller
- Feature-specific components, hooks, or utils placed in global folders
- Global `controllers/`, `services/`, `routes/` dumps on the backend
- Deep imports into another feature's internal files

---

# 17. Before Writing Code

The agent MUST answer these before adding code:

1. Which feature owns this?
2. Does a component, hook, util, or API function for this already exist?
3. Will this push an existing file past a review trigger (section 2)?
4. Is this UI, state, business logic, or data access? Each belongs in a different place.
5. Will another developer know where to find this in six months?

If any answer is unclear, fix the structure first.

---

# 18. Completion Checklist

Before declaring work done:

### Structure
- [ ] Code is inside the correct feature folder (frontend and backend)
- [ ] Feature-specific code is not in global folders
- [ ] Shared code is genuinely used by multiple unrelated features
- [ ] Cross-feature imports go through `index.js`
- [ ] No circular dependencies between features

### Files
- [ ] No page over ~150 lines without a justified reason
- [ ] No file over ~400 lines
- [ ] No helper components inside page files
- [ ] No giant `utils` file

### Responsibilities
- [ ] Pages only compose
- [ ] Components render and delegate
- [ ] Hooks hold state and call services/API, with no business rules
- [ ] Business rules live in the backend service
- [ ] SQL lives only in repositories

### Data
- [ ] All HTTP goes through the feature API module
- [ ] Data is normalized once, in the API layer
- [ ] No local name shadows an import
- [ ] No business constant is duplicated without an owner

### Quality
- [ ] Repeated error/toast/style blocks are extracted
- [ ] Modals are separate components
- [ ] Imports verified, obsolete code removed
- [ ] No new dependency added without need

---

# 19. Golden Rule

> **If a file is hard to scroll, hard to summarize in one sentence, or hard to change without breaking something unrelated, it is already spaghetti. Split it before adding to it.**

Do not sacrifice structure for speed. A feature added to a clean file is cheap. A feature added to a 1,000-line file is a debt.
