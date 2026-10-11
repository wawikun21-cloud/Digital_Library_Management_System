# Dashboard Pages Refactor Plan — Anti-Spaghetti Compliance

## 1. Audit Findings

### `client/src/pages/Dashboard.jsx` — 883 lines (routed at `/dashboard`)
| Rule violated | Evidence |
|---|---|
| §2 (page review at ~150 lines) / §16 (page over 400 lines) | 883-line page file |
| §3 (pages are composition only) | 12 helper components defined in-file: `ChartTooltip`, `Card`, `StatPills`, `ChartSkeleton`, `ChartError`, `FilterBar`, `MostBorrowedBooks`, `AttendanceCount`, `TotalFinesCollected`, `OverdueBooks`, `SkeletonRows`, `HoldingsBreakdown` |
| §5 (no sub-components in page files) | Same list above |
| §8 (no raw fetch in pages) | Line 766: `fetch("/api/auth/me", …)` |
| §12 (no helpers at top of component file) | `generateSchoolYears()`, `fmtK`, `fmtPeso` at module top |
| §1.4 (feature ownership) | Lives in global `pages/`, not a feature |

Dead code inside: `mostBorrowedTotal` destructured but never used (line 779); `PieChart, Pie, Cell` imported but unused; `fmtK` unused; `semester`/`month` props passed to `AttendanceCount`/`TotalFinesCollected` are never consumed.

### `client/src/pages/DashboardAnalytics.jsx` — 883 lines (NOT routed anywhere)
Identical structure and violations to `Dashboard.jsx`, plus: **dead file**. Grep confirms it is imported by nothing (the only match is its own `export default`). It is an older variant of `Dashboard.jsx` ("NEMCO" labels instead of "SCHOOL", smaller `h1`). App.jsx line 20 imports `./pages/Dashboard`, never this file.

### `client/src/pages/BookDashboard.jsx` — 1166 lines (routed at `/dashboard/books/dashboard`)
| Rule violated | Evidence |
|---|---|
| §2 / §16 | 1166-line page file |
| §3 / §5 | In-file helpers `normalizeStatus`, `getISOWeek`; in-file components `KpiCard`, `SCard`, `ChartTip`, `PieTooltip`, `TabBtn`, `TopBorrowedModal`, `LowStockModal`, `GenreBadge` |
| §7 (more than ~8 `useState`) | 15 `useState` calls in one component |
| §6 (hooks thin glue) | `fetchAllData` + genre/collection/arrivals/low-stock derivations + KPI mapping all live in the page body |
| §12 | Helpers at module top |

Also: low-stock threshold `(Number(b.available_copies) || 0) <= 1` is duplicated in two places (page + `LowStockModal`).

**Conclusion: none of the three files follows the rules. All three need refactoring.**

## 2. Target Architecture

Create one feature, `client/src/features/analytics/`, owning both dashboards. Rationale:
- Both pages consume the same `analytics` API domain and both are "library analytics" screens; the backend serves them from one `analytics` controller/service.
- One feature avoids cross-feature imports: `analyticsApi` and `useDashboard` are used by **both** pages (verified: `analyticsApi` importers = `useDashboard` + `BookDashboard` only; `useDashboard` importers = the two Dashboard pages only).
- `booksApi` stays shared in `services/api/` — it is used by the legacy `Books` page and by the feature (genuinely multi-consumer, §1.4).
- Generic hooks `useWebSocket`, `useDebounce`, `useToast` stay in `hooks/` (used by unrelated features, §1.7).

```
client/src/features/analytics/
├── index.js                        # public API only
├── pages/
│   ├── AnalyticsDashboardPage.jsx  # from Dashboard.jsx — composition only (~130 lines)
│   └── BookDashboardPage.jsx       # from BookDashboard.jsx — composition only (~180 lines)
├── api/
│   └── analyticsApi.js             # MOVED verbatim from services/api/ (path comment updated)
├── hooks/
│   ├── useDashboard.js             # MOVED verbatim from hooks/ (only the dashboards use it)
│   ├── useBookDashboardData.js     # NEW — fetchAllData + all data state + WS reload handle
│   └── useIsAdmin.js               # NEW — replaces raw fetch("/api/auth/me") via authApi.me()
├── constants/
│   ├── dashboardPalette.js         # NEMCO_COLOR, LEXORA_COLOR, RANK_COLORS, MEDAL, fmtPeso
│   ├── schoolCalendar.js           # SEMESTERS, SEM_MONTHS, generateSchoolYears, SCHOOL_YEARS
│   └── bookDashboardPalette.js     # C palette + GENRE_COLORS (from BookDashboard inline)
├── utils/
│   ├── dashboardKpiCards.js        # buildKpiCardModels() — pure, returns {label,value,change,accent,percentage,route}
│   ├── bookStatus.js               # normalizeStatus (was in-file helper)
│   ├── isoWeek.js                  # getISOWeek (was in-file helper)
│   ├── bookChartData.js            # pure derivations: genreMap, collectionMap, arrivals grouping, low-stock filter+map (single owner of the <=1 threshold)
│   └── pdfExport.js                # jsPDF export shared by TopBorrowedModal + LowStockModal
└── components/
    ├── chart/                      # feature chart primitives (NOT components/ui — they use the dashboard design system)
    │   ├── ChartCard.jsx           # was Card
    │   ├── ChartTooltip.jsx        # was ChartTooltip (prefix/suffix aware)
    │   ├── ChartSkeleton.jsx
    │   ├── ChartError.jsx
    │   ├── StatPills.jsx
    │   └── SkeletonRows.jsx
    ├── dashboard/                  # main analytics page components
    │   ├── DashboardFilterBar.jsx
    │   ├── KpiStatsSection.jsx     # KPI row + kpiStats error banner (uses StatsCard — stays shared)
    │   ├── MostBorrowedBooks.jsx
    │   ├── AttendanceChart.jsx     # was AttendanceCount
    │   ├── FinesChart.jsx          # was TotalFinesCollected
    │   ├── OverdueChart.jsx        # was OverdueBooks
    │   └── HoldingsBreakdown.jsx
    └── book-dashboard/
        ├── BookKpiCard.jsx         # was KpiCard
        ├── SectionCard.jsx         # was SCard
        ├── BookChartTip.jsx        # was ChartTip
        ├── BookPieTooltip.jsx      # was PieTooltip
        ├── TabButton.jsx           # was TabBtn
        ├── GenreBadge.jsx
        ├── BookFilterControls.jsx  # date-range / genre / collection + Clear Filters
        ├── GenreChart.jsx
        ├── StatusDonut.jsx
        ├── TopBorrowedCard.jsx     # in-page top-5 table card
        ├── CollectionChart.jsx
        ├── ArrivalsChart.jsx
        ├── TopBorrowedModal.jsx
        └── LowStockModal.jsx
```

`features/analytics/index.js` (public API only):
```js
export { default as AnalyticsDashboardPage } from "./pages/AnalyticsDashboardPage";
export { default as BookDashboardPage } from "./pages/BookDashboardPage";
export { useDashboard } from "./hooks/useDashboard";
```

## 3. Behavior-Preservation Contract (must hold after refactor)

Copied verbatim, no visual or functional change (§15.4):
1. All Bug-F guards: `data = []` destructuring defaults + `Array.isArray(data) ? data : []` in `MostBorrowedBooks`, `AttendanceCount`, `TotalFinesCollected`, `OverdueBooks`, `HoldingsBreakdown`.
2. All BookDashboard FIX 1–8 and FIX D logic: stable `fetchAllData` with passed-in args, `|| 0` low-stock fallback, normalized "Out of Stock" comparisons, single debounced load effect, `try/finally` spinner resets, ISO week function, ref-based stable WS callbacks.
3. Exact strings/palette: school-year strings keep Unicode en-dash "–" (U+2013) and auto-generated 5-year list; "SCHOOL" label (Dashboard.jsx variant) — not "NEMCO"; all colors, medal emojis, `fmtPeso` formatting, skeleton shapes.
4. `useWebSocket({ isAdmin, onStatsUpdate })` wiring on the analytics page unchanged; `useWebSocket` hook itself untouched.
5. Modals keep their own `open`/`onClose` props, `TopBorrowedModal`'s `data`-prop sync effect, filters, and `LowStockModal`'s own `fetchBooks()` load.
6. `useDashboard` hook and `analyticsApi` move **verbatim** (only the file-path comment line changes).
7. `isAdmin` detection keeps checking the **server session** (`/api/auth/me` equivalent) — do not switch to the localStorage-based `useAuth` (different source of truth). The raw fetch is replaced by `authApi.me()` from the shared API module (§8), with `.catch(() => {})`.

Allowed cleanups (behavior-neutral): drop unused `mostBorrowedTotal` destructuring, unused `PieChart/Pie/Cell` and `fmtK` imports, and the never-consumed `semester`/`month` props.

## 4. Files To Delete

- `client/src/pages/Dashboard.jsx` — replaced by feature page
- `client/src/pages/DashboardAnalytics.jsx` — dead code, zero importers
- `client/src/pages/BookDashboard.jsx` — replaced by feature page
- `client/src/hooks/useDashboard.js` — moved into feature
- `client/src/services/api/analyticsApi.js` — moved into feature
- `client/src/constants/dashboard.js` — dead code, zero importers (flagged: contains stub `KPI_ICONS` and an unused `COLORS`/`GENRE_COLORS` set that differs from BookDashboard's inline palette; nothing imports it)

## 5. Edits To Existing Files

- `client/src/App.jsx`
  - Line 20: `lazy(() => import("./pages/Dashboard"))` → `lazy(() => import("./features/analytics/pages/AnalyticsDashboardPage"))`
  - Line 36: `lazy(() => import("./pages/BookDashboard"))` → `lazy(() => import("./features/analytics/pages/BookDashboardPage"))`
- `client/src/services/api/index.js` — remove `export * from "./analyticsApi"` and `export { default as analyticsApi }` (verified: no file imports the barrel; safe)

## 6. Execution Order (verifiable steps)

1. Create `features/analytics/constants/` — move `SEMESTERS`/`SEM_MONTHS`/`generateSchoolYears`/`SCHOOL_YEARS` → `schoolCalendar.js`; `RANK_COLORS`/`MEDAL`/`fmtPeso`/`NEMCO_COLOR`/`LEXORA_COLOR` → `dashboardPalette.js`; BookDashboard `C` + `GENRE_COLORS` → `bookDashboardPalette.js`.
2. Create `features/analytics/utils/` — `bookStatus.js` (`normalizeStatus`), `isoWeek.js` (`getISOWeek`), `bookChartData.js` (genre map, collection map, arrivals grouping, `getLowStockBooks` — single owner of the `<= 1` threshold), `pdfExport.js` (one `exportBooksPdf(title, rows)` used by both modals), `dashboardKpiCards.js` (`buildKpiCardModels`).
3. Move `analyticsApi.js` → `features/analytics/api/` (verbatim); move `useDashboard.js` → `features/analytics/hooks/` (verbatim); update `services/api/index.js`.
4. Create `features/analytics/components/chart/` primitives and `components/dashboard/` widgets — copy JSX verbatim from Dashboard.jsx, adjusting imports only.
5. Create `features/analytics/components/book-dashboard/` — same approach for BookDashboard.jsx pieces; `TopBorrowedModal`/`LowStockModal` become self-contained components using `bookChartData`/`pdfExport`/`bookStatus`.
6. Create `hooks/useBookDashboardData.js` — owns the 15 state fields, debounced load effect, `try/finally`, `reload()` (ref-based, stable for WS), and `applyStatsUpdate()`; page keeps only filter state + modal-open state.
7. Create `hooks/useIsAdmin.js` (authApi-based) and `pages/AnalyticsDashboardPage.jsx` — composition only.
8. Create `pages/BookDashboardPage.jsx` — composition only, wires `useBookDashboardData` + `useWebSocket` (stable `reload`).
9. Write `features/analytics/index.js`; update `App.jsx` lazy imports.
10. Delete the 6 files listed in §4.
11. Verify: grep for leftover references; `npm run build` (client); `npm test` (client); smoke-test both routes in the dev server.

## 7. Verification Checklist

- [ ] `grep -r "pages/Dashboard\|pages/BookDashboard\|hooks/useDashboard\|services/api/analyticsApi\|DashboardAnalytics" client/src` returns nothing (outside plan docs)
- [ ] No raw `fetch(` in any file under `features/analytics/pages/` or `components/`
- [ ] No file in `features/analytics/` over 400 lines; pages under ~200 lines; no helper components inside page files
- [ ] `npm run build` passes in `client/`
- [ ] `npm test` passes in `client/` (existing suites: Drawer, authApi, permissionUtils, usersTables, rolesPermissionHelpers)
- [ ] Manual: `/dashboard` renders KPI cards, filter bar, all 5 widgets (loading → data → error states) unchanged; `/dashboard/books/dashboard` renders KPIs, 6 charts, both modals; refresh + WS-driven updates still work

## 8. Out of Scope

Other legacy pages in `client/src/pages/` (Books, Borrowed, Attendance, StudentsDashboard, AttendanceDashboard, …) are equally large but were not requested; this plan touches only the three files named plus their direct dependencies. Backend is untouched.

---

# EXTENSION — AttendanceDashboard.jsx (added to scope after initial approval)

`client/src/pages/AttendanceDashboard.jsx` (898 lines, routed at `/dashboard/attendance/dashboard`) violates the same rules: in-file helpers (`ChartTip`, `KpiCard`, `SCard`, `TabBtn`, `ProgramBadge`, `RankBadge`, `TopStudentsModal`, `LowUsageModal`), 17 `useState` in one component, FIX G/H/I fetch/WS logic in the page body, and module-top helpers (`getCurrentSchoolYear`).

## E1. Target structure

```
client/src/features/attendance/
├── index.js
├── pages/AttendanceDashboardPage.jsx     # composition only
├── hooks/useAttendanceDashboard.js       # fetchAllData + 12 data states + WS stable refetch + effects
├── constants/attendancePalette.js        # PROG_COLORS + LIBRARY_CAPACITY (palette from shared constants)
├── utils/
│   ├── attendanceKpi.js                  # FIX I guarded KPI derivations + occupancy formatting (pure)
│   └── pdfExport.js                      # autoTable export shared by both modals
└── components/
    ├── AttendanceFilterBar.jsx           # date range / program / year level / school year / clear
    ├── KpiRow.jsx                        # 6 KpiCards
    ├── TopStudentsCard.jsx               # top-5 table + View All
    ├── ProgramUsageChart.jsx             # tabs + bar chart
    ├── VisitsOverTimeChart.jsx           # tabs + line chart
    ├── PeakHoursChart.jsx                # peak-coloured bar chart
    ├── VisitsByDayChart.jsx              # peak-coloured bar chart
    ├── LowUsageCard.jsx                  # top-5 table + View All
    ├── SessionDistributionCard.jsx       # donut + legend
    ├── OtherInsightsCard.jsx             # 4 insight rows
    ├── ProgramBadge.jsx
    ├── RankBadge.jsx
    ├── TopStudentsModal.jsx
    └── LowUsageModal.jsx
```

`attendanceApi.js` STAYS shared in `services/api/` — it has three consumers (Attendance.jsx, KioskAttendance.jsx, this dashboard), satisfying §1.4.

## E2. Shared extraction (two unrelated features, identical copies — §16)

Move to `client/src/components/ui/` and rewire BOTH features:
- `KpiCard.jsx` (was analytics `book-dashboard/BookKpiCard` + attendance `KpiCard`)
- `SectionCard.jsx` (was analytics `SectionCard` + attendance `SCard`)
- `ChartTip.jsx` (was analytics `BookChartTip` + attendance `ChartTip`)
- `TabButton.jsx` (was analytics `TabButton` + attendance `TabBtn`; `activeBg` prop defaults to `#32667F` to preserve the teal active state)

Move to shared:
- `client/src/constants/dashboardPalette.js` — `DASHBOARD_COLORS` (the `C` palette, identical in both features); feature palettes import it
- `client/src/utils/schoolYearUtils.js` — `getCurrentSchoolYear()` + `generateSchoolYears(count)`; single owner of the PH academic-year rule (was duplicated in analytics `schoolCalendar.js` and the attendance page)

## E3. Behavior-preservation contract (attendance)

1. FIX G: `fetchAllData` stable (`useCallback([])`), filters passed explicitly by every call site.
2. FIX H: `latestRefetchRef` + stable `stableRefetch` for WS; `useWebSocket({ isAdmin: false, onAttendanceUpdate })` with its `console.log` line kept verbatim.
3. `globalFilterKey = JSON.stringify(globalFilter)` effects preserved: single load effect `[globalFilterKey]` (sets kpi null, clears visits on empty/error), separate `[visitsFilter]` effect (same clear semantics), auto-select-year effect with `didAutoSelectYear` ref. The WS refetch path keeps its different guard (only sets when `data.length > 0`).
4. FIX I: camelCase/snake_case KPI guards preserved in `utils/attendanceKpi.js`.
5. Occupancy: `filteredActiveCount` filter rules (program / yrLevel / schoolYear / date range on `check_in_time` ISO date) and `LIBRARY_CAPACITY = 120` math preserved.
6. Exact option lists: program `["All", …sorted minus "Others", "Others"]`, fixed year levels `["All","1st Year","2nd Year","3rd Year","4th Year"]`, school years `["All", …availableYears]`.
7. Modal internals preserved: filter/sort/rank logic, `yrLevel ?? yr_level ?? yearLevel` chain, row-border conditions, `slice(0,5)` / `slice(0,20)` semantics, autoTable PDF headers/columns/colors, "Alert" button markup.
8. getVisitsOverTime signature `(groupBy, filters)` and all `.catch` fallbacks unchanged.

## E4. Execution order

1. Shared: `components/ui/{KpiCard,SectionCard,ChartTip,TabButton}.jsx`, `constants/dashboardPalette.js`, `utils/schoolYearUtils.js`.
2. Rewire analytics feature: delete the 4 duplicate primitives, update importers, palette re-export, schoolCalendar uses shared util.
3. Attendance feature: constants, utils, components, hook, page, index.js.
4. App.jsx lazy import; delete `pages/AttendanceDashboard.jsx`.
5. Verify: grep, `npm run build`, `npm test`.

---

# EXTENSION 2 — Attendance.jsx management page (added to scope)

`client/src/pages/Attendance.jsx` (1560 lines, routed at `/dashboard/attendance`) violates the same rules: 12 in-file helpers/components (`fmtDateTime`, `getFullName`, `Avatar`, `StatusPill`, `LiveDuration`, `Spinner`, `StudentNotFoundModal`, `RfidRegistrationModal`, `TapResult`, `printToPDF`, `StudentModal`, `FilterField`), ~20 `useState`, WS sync + PDF generation in the page body, and `components/AttendanceTable.jsx` (871 lines, only consumer is this page) duplicating the date/name/PDF helpers a third time.

## E5. Target structure (extends features/attendance/)

```
features/attendance/
├── pages/AttendancePage.jsx              # NEW — composition only (~150 lines)
├── hooks/
│   ├── useAttendanceRecords.js           # records/active/stats + fetch + toast + WS sync + tap/checkout/delete
│   └── useStudentLookup.js               # debounced ID → student lookup
├── utils/
│   ├── attendanceDateTime.js             # pad, parseAsUTC, fmtDateTime, fmtDate, fmtDuration
│   ├── studentName.js                    # getFullName (+ getInitials re-exported from shared utils/helpers)
│   ├── attendancePdf.js                  # one openPrintWindow + the three report builders
│   └── attendanceTableData.js            # groupByStudent + sortGroups (pure)
└── components/
    ├── Avatar.jsx / Spinner.jsx / StatusPill.jsx        # page variants
    ├── LiveTimer.jsx                     # unified (parseAsUTC + non-negative guard)
    ├── TapResult.jsx
    ├── AttendanceStatsCards.jsx
    ├── CheckInPanel.jsx                  # tap form + lookup + result
    ├── ActiveStudentsTable.jsx           # "Currently In Library"
    ├── AttendanceFilters.jsx             # FilterField + 4 filters
    ├── AttendanceHistoryCard.jsx         # filters + table + pagination
    ├── StudentNotFoundModal.jsx
    ├── RfidRegistrationModal.jsx         # + RfidStudentSearch.jsx split (both <400 lines)
    ├── AttendanceTable.jsx               # MOVED from components/ (split)
    ├── AttendanceStatusPill.jsx          # table variant (distinct from page StatusPill)
    ├── StudentHistoryModal.jsx           # table variant (split out)
    └── SessionActions.jsx                # table variant (split out)
```

`components/AttendanceTable.jsx` is moved into the feature (only this page consumes it) and split into table + modal + actions + pure data utils, with its duplicated helpers replaced by the feature utils.

## E6. Behavior-preservation contract (attendance page)

1. All fetch/mutation/WS logic verbatim: `fetchData`, tap/checkout/delete handlers, `checked_in` prepend-with-duplicate-guard, `checked_out` in-place merge + active removal + stats counters, `onAttendanceDeleted` id filtering.
2. Filters/pagination verbatim: debounced search, course/date/status filters, `PAGE_SIZE = 25`, page reset on filter change, pagination shown when filtered.
3. Table grouping/sorting verbatim: group by `student_id_number`, sessions sorted desc by check-in, groups sorted by latest session, sort keys `student_name | visits | total_duration | latest` with the same asc/desc toggle.
4. Both modals' internals verbatim: RFIR modal two-step flow (rfidCode → student select), `useDebounce(250)` student search slice(0,8), outside-click/Escape/overflow locks, progress dots, register button gradient states; student-not-found modal Escape/overlay behavior.
5. PDF documents byte-identical: same three builders (general report, individual history, table's session history) — only the window/document.write/print boilerplate is shared.
6. KPI stats grid values verbatim (`total`, `active`, `Math.round(totalDuration/60)+"h"`, `checkedOut`).

## E7. Deliberate, flagged deviations (bugs in the original)

1. **Drop the WS `onTrashRestored` handler** — it references `setAllStudents`, which does not exist in this page (leftover from copy-paste); any student-restore event would throw inside the socket callback. No local state is tied to it, so removing it is the safe cleanup.
2. **Drop the page-level `StudentModal`** — it only opens via `onRowClick`, which `AttendanceTable` ignores (the table renders its own history modal). The modal is unreachable dead code.
3. **Fix the `var(--tetx-primary)` typo** on the Register RFID button → `var(--text-primary)`.
4. **Unify the two live timers** (page `LiveDuration` vs table `LiveTimer`) into one component using the page's `parseAsUTC` + `Math.max(0, …)` logic; unify the duplicated `overlayIn/modalIn` keyframes into one `ModalAnimations` component. Output is visually identical for well-formed timestamps.
5. **Reuse the shared `getInitials`** from `utils/helpers.js` instead of the third in-file copy (identical semantics).

## E8. Execution order

1. Feature utils (4 files). 2. Hooks (2). 3. Small components (Spinner/Avatar/StatusPill/LiveTimer/TapResult/stats). 4. Table split (move + 4 splits). 5. Modals (RFID split, not-found). 6. Page composition + index.js + App.jsx. 7. Delete old files. 8. Verify: grep, `npm run build`, `npm test`.

---

# EXTENSION 3 — Books.jsx catalog page (added to scope)

`client/src/pages/Books.jsx` (532 lines, routed at `/dashboard/books`) violates the same rules: module-top helpers (`isOutOfStock`, `EMPTY_FORM`, `FORM_ONLY_FIELDS`, `toApiPayload`), `validate()` in the page body, filter/sort/pagination derivations in the page, ~20 `useState`, a **raw socket.io-client listener created inside the page** (§8/§14), and a repeated try/catch-toast block (4 copies, §11).

## E9. Target structure

```
features/books/
├── index.js
├── pages/BooksPage.jsx                  # composition only
├── hooks/
│   ├── useBooksCatalog.js               # books/loading/fetch + delete mutation + delete-confirm state
│   ├── useBookFilters.js                # query/status/collection/genre/sort + filtered + pagination
│   ├── useBookForm.js                   # form state, quantity→status sync, modal lifecycle, validate + create/update
│   └── useBookRealtime.js               # useWebSocket wiring + book:stock_update socket listener (transport out of page)
├── utils/
│   ├── bookFilters.js                   # isOutOfStock, filterBooks, sortBooks (pure)
│   └── bookApiErrors.js                 # applyServerErrors + focusFirstError (dedupes the 4 repeated blocks)
├── validation/
│   └── bookValidation.js                # validateBookForm (§13)
├── constants/
│   └── bookForm.js                      # EMPTY_FORM, FORM_ONLY_FIELDS
└── components/
    ├── BooksEmptyState.jsx
    ├── BookTable.jsx                    # MOVED from components/ (books-only)
    ├── FilterBadge.jsx                  # MOVED from components/ (books-only)
    └── books/                           # MOVED from components/books/ (books-only family)
        ├── BookToolbar.jsx  BookStatusFilter.jsx  BookModal.jsx
        ├── BookForm.jsx      BookView.jsx          BookAddImport.jsx
        ├── BookImport.jsx    Lexoraimport.jsx
```

**Stays shared in `components/`** (verified multi-consumer): `ConfirmationModal` (6 pages), `components/books/Pagination.jsx` (6 pages), `components/books/CopiesList.jsx` (Books + Borrowed — BookModal's import is re-pointed). **Untouched dead files** (flagged to the user, not moved): `components/books/BookWordImport.jsx` (imports a `./ImportSteps` that does not exist anywhere — zero importers) and `components/books/Lexorabookdetailmodal.jsx` (zero importers).

## E10. Behavior-preservation contract (books)

1. Filter semantics verbatim, incl. the multi-key search list, `OutOfStock` → `isOutOfStock`, `display_status || status` comparison, `__NULL__` uncategorized collection, and the three sort modes.
2. `validate()` rules verbatim (required title, per-copy accession numbers, duplicate detection with both indices flagged).
3. Create/update flows verbatim: optimistic list updates, `fetchBooks()` refresh after success, server `details` → field errors + first-error toast + first-error focus.
4. Modal flows verbatim: add modes manual/import/lexora via `openModal(mode)`, edit loads copies via `fetchBookCopies` with empty-array fallback, view opens with the book's data, close resets `selectedBook`/`modalMode`, `quantity === 0 && status === "Available"` → auto `OutOfStock`, body scroll lock while open.
5. Real-time verbatim: `useWebSocket` transaction callbacks refetch the list; `book:stock_update` deleted → optimistic removal by id, otherwise refetch (same socket options: `/socket.io`, websocket+polling, credentials, 5 reconnection attempts).
6. Permission gates verbatim: `manage_books` create/edit/delete/import + `manage_lexora_books` import; `onUpdate`/`onDelete`/`onEdit` passed as undefined when not permitted.
7. URL `?status=` on mount, empty-state copy, count line, and the delete confirmation copy ("Move to Trash" / 30 days) unchanged.

## E11. Flagged deviations

1. **Remove dead `toApiPayload` + `FORM_ONLY_FIELDS`** — `toApiPayload` is defined but never called (all mutations send `form` directly); both are module-private, so removal is behavior-neutral. (If the server later needs form-only stripping, that belongs in the API layer anyway.)
2. **Dead files `BookWordImport.jsx` / `Lexorabookdetailmodal.jsx` left in place** — not moved into the feature; see E9. Recommend deleting `BookWordImport.jsx` (its `./ImportSteps` import is unresolvable, so it can never build) and confirming `Lexorabookdetailmodal.jsx` is obsolete.

## E12. Execution order

1. Constants + validation + utils. 2. Hooks (4). 3. Page. 4. Move components (BookTable, FilterBadge, 8-file books family; re-point BookModal's CopiesList import). 5. index.js + App.jsx. 6. Delete `pages/Books.jsx`. 7. Verify: grep, `npm run build`, `npm test`.

---

# EXTENSION 4 — AuditLog.jsx (added to scope)

`client/src/pages/AuditLog.jsx` (837 lines, routed at `/dashboard/audit-log`) violates the same rules: in-file helpers (`actionColor`, `entityIcon`, `actionIcon`, `formatDate`, `SkeletonRows`, `AuditToast`, `DetailModal` with a nested `JsonBlock`), ~10 `useState`, fetch/debounce/WS logic in the page body, an ~80-line inline `<style>` block (§12), and an IIFE-rendered pagination window inside JSX (§4).

## E13. Target structure

```
features/audit/
├── index.js
├── auditLog.css                       # the inline <style> block, as a stylesheet (precedent: roles/rolesUi.css)
├── pages/AuditLogPage.jsx             # composition only
├── api/auditApi.js                    # MOVED from services/api/ (AuditLog.jsx is its only live consumer)
├── constants/auditUi.js               # ENTITY_TYPES, ACTIONS, PAGE_SIZE, TEXT_DEBOUNCE_MS, TABLE_HEADERS, EMPTY_FILTERS
├── utils/auditFormat.js               # actionColor, entityIcon, actionIcon, formatDate, buildPageWindow
├── hooks/useAuditLog.js               # logs/pagination/loading/error + AbortController fetch + debounced filters + WS toast/badge
└── components/
    ├── AuditToastStack.jsx            # was AuditToast
    ├── AuditDetailModal.jsx           # was DetailModal
    ├── AuditJsonBlock.jsx             # was the nested JsonBlock
    ├── AuditFilterBar.jsx             # filter card
    ├── AuditLogTable.jsx              # table card + skeleton + rows (SkeletonRows stays local: used once, no state)
    └── AuditPagination.jsx            # replaces the IIFE page window
```

## E14. Behavior-preservation contract (audit)

1. Fetch/filter/pagination verbatim: `getLogs({ page, limit: 50, ...filters })`, dropdowns+text all debounced 450 ms via the `isFirstRender` guard effect, page reset to 1 on filter change, pagination window math (`start = max(1, cur-3)`, `end = min(total, cur+3)`, the `end-start < 6` widening), "Showing X–Y of Z" line.
2. Row/modal content verbatim: all 7 columns, `#id` monospace, user initial avatar (system → muted color), `entity_type.replace(/_/g, " ")` capitalize, action pills via `actionColor`, IP or "—", detail modal meta grid (Log ID / User / Timestamp / IP), user-agent block, Before/After JSON blocks with the string→JSON.parse fallback.
3. WS verbatim: `useWebSocket({ isAdmin })` + `onAuditEvent` → toast appended (`slice(-3)`), 5 s auto-dismiss, `newBadge` increment, badge reset to 0 on every successful fetch.
4. Copy verbatim: header, filter labels/options ("All entities"/"All actions"), "Searching…" indicator, empty-state copy, footer note, refresh button, the commented-out Export CSV button + `handleExport`.
5. `isAdmin` still from `useLocalStorage(STORAGE_KEYS.LEXORA_USER)`.

## E15. Flagged deviations

1. **Delete dead `pages/AuditLogs.jsx`** — unrouted (App.jsx imports only `./pages/AuditLog`), and it calls `auditApi.getAuditLogs()` / `auditApi.purgeOldLogs()`, which **do not exist** in auditApi.js — it would throw on mount if ever routed.
2. **Flag (left in place, recommend deleting): `hooks/useAudits.js`** (imports nonexistent `getAudits`/`purgeAudits`; zero importers) and **`components/AuditTable.jsx`** (its only consumer is the dead AuditLogs page).
3. **Wire the AbortController signal through `auditApi.getLogs(params, { signal })`** — the original passes `{ signal }` as a second argument that `getLogs(params = {})` silently ignores, so the "cancel in-flight requests" behaviour never actually happens and rapid filter changes race (last writer wins arbitrarily). One-line API change; the page's catch already handles `AbortError`.

## E16. Execution order

1. CSS + constants + utils. 2. api move (+signal). 3. Hook. 4. Components (6). 5. Page + index.js + App.jsx. 6. Delete `pages/AuditLog.jsx` + dead `pages/AuditLogs.jsx`. 7. Verify: grep, `npm run build`, `npm test`.

---

# EXTENSION 5 — Borrowed.jsx (added to scope)

`client/src/pages/Borrowed.jsx` (1349 lines, routed at `/dashboard/borrowed`) violates the same rules: module-top helpers (`today`, `tomorrow`, `isOverdue`, `calcFine`, `toDateStr`, `sanitizeTxns`, `EMPTY_FORM`), 4 in-file sub-components (`ModalShell`, `FieldLabel`, `DateInput`, `ModalFooter`), ~30 `useState`, fetch/mutation/WS logic in the page body, **raw `fetch("/api/transactions…")` for every operation** (§8 — despite `services/api/transactionsApi.js` existing but being unused), two IIFEs in JSX (avatar initial, due-date preview, date format), and business rules (`MAX_BOOKS`, `FINE_PER_DAY`) living in the page.

## E17. Target structure

```
features/transactions/
├── index.js
├── pages/BorrowedPage.jsx                # composition only (~150 lines)
├── api/transactionsApi.js                # MOVED from services/api + EXTENDED with the endpoints the page
│                                          #   fetched raw (lookupStudent/lookupFaculty/searchBooks/update/extend/payFine)
├── constants/transactionRules.js         # MAX_BOOKS, FINE_PER_DAY (owner comments), STATUS_STYLE, EMPTY_FORM
├── utils/transactionDates.js             # today, tomorrow, toDateStr, isOverdue, previewFine, sanitizeTxns,
│                                          #   addDays, formatShortDate, displayStatus
├── validation/borrowValidation.js        # validate(form)
├── hooks/
│   ├── useTransactions.js                # txns/loading/fetch + WS sync + all row mutations
│   ├── useTransactionFilters.js          # query/status/type + filtered + summary
│   └── useBorrowForm.js                  # borrow modal: form + borrower lookup + book search + submit
└── components/
    ├── ModalShell.jsx FieldLabel.jsx DateInput.jsx ModalFooter.jsx   # was in-file sub-components
    ├── TransactionSummaryCards.jsx       # summary pills
    ├── TransactionToolbar.jsx            # search + status/type filters + clear + borrow button
    ├── BorrowModal.jsx                   # + BorrowerSearchPanel.jsx + BookPickerPanel.jsx (sections)
    ├── EditTxnModal.jsx                  # owns its form state (seeded from txn)
    ├── ExtendTxnModal.jsx                # owns extendDays state
    ├── TransactionDetailModal.jsx        # + FineSummary.jsx (IIFE fine block → component)
    └── BorrowedTable.jsx                 # MOVED from components/ (page-only consumer)
```

`components/BorrowedCard.jsx` (214 lines, zero importers — not even by BorrowedTable) is flagged as dead, left in place.

## E18. Behavior-preservation contract (transactions)

1. All six WS handlers verbatim (new/returned/deleted/fine_paid), incl. the duplicate-id guards and `sanitizeTxns` on WS payloads.
2. Mutations verbatim: borrow (per-book POST, first-failure toast, dedup-guarded optimistic prepend), edit (PUT), extend (PUT days), return, delete (local removal + confirm-modal reset), pay-fine (row + open detailTxn update).
3. Filters verbatim: 5-key search list, `Overdue → isOverdue`, Borrowed/Returned exact match, borrower-type default "student"; result-count line copy; summary counts.
4. Modals verbatim: borrow (type toggle resets form keeping dates, borrower dropdown + "N results — click to select" hint + no-results hint ≥2 chars, selected-borrower card + clear, book search dropdown, `{n}/2 books` badge, per-book CopiesList, dates, footer), edit (fields + validation messages), extend (−/+ stepper, min 1, new-due-date preview), detail (meta grid, status pill colors, date grid with warn color, fine block with days-overdue, permission-gated actions).
5. `CopiesList` import stays from shared `components/books/`; `ConfirmationModal` + `Toast` stay shared.
6. Permission gates verbatim: `manage_transactions` create/return/extend/edit/delete/pay_fine; undefined handlers passed when not permitted.

## E19. Flagged deviations

1. **Dead `STATUS_STYLE` / `GRADIENTS`** — defined, never referenced. `STATUS_STYLE`'s three entries are exactly the detail modal's inline status colors, so the modal now consumes it (kills the IIFE); `GRADIENTS` is removed outright.
2. **`calcFine` → `previewFine`** — renamed per §10 (display-only): it already prefers the server's `computed_fine`; the client-side `days × FINE_PER_DAY` path is a fallback, not the source of truth. `FINE_PER_DAY`/`MAX_BOOKS` stay client-side with comments pointing at the backend service as owner.
3. **Zero raw fetch in the page** — every endpoint moves into the feature api module (`transactionsApi.js` gains lookupStudent, lookupFaculty, searchBooks, updateTransaction, extendDueDate, payFine); the module itself moves from `services/api/` (Borrowed.jsx is its only live consumer) and the barrel re-exports are removed.
4. Edit/extend modals own their local state (form seeded from the txn at mount; `extendDays` in the stepper) instead of hoisting it into the page.

## E20. Execution order

1. constants + utils + validation. 2. api move + extension. 3. Hooks (3). 4. Modal primitives + toolbar/summary. 5. Borrow modal (+ 2 panels). 6. Edit/extend/detail (+ fine summary). 7. Move BorrowedTable. 8. Page + index.js + App.jsx. 9. Delete `pages/Borrowed.jsx` + old api + barrel lines. 10. Verify: grep, `npm run build`, `npm test`.

---

# EXTENSION 6 — Faculty.jsx (added to scope)

`client/src/pages/Faculty.jsx` (963 lines, routed at `/dashboard/faculty`) violates the same rules: module-top constants/helpers, ~20 `useState`, Excel parse/validate/import logic in the page body, two full modals inline (~300 lines each), and six large section JSX blocks (header, stats, dept tabs, search bar, table, empty state). API access is already correct (shared `studentsApi`, multi-consumer — stays shared).

## E21. Target structure

```
features/faculty/
├── index.js
├── pages/FacultyPage.jsx               # composition only (~150 lines)
├── hooks/
│   ├── useFaculty.js                   # list/loading/fetch + create/update/delete
│   └── useFacultyFilters.js            # debounced search + dept filter + stats + pagination
├── constants/facultyUi.js              # DEPARTMENTS, DEPT_COLORS, DEFAULT_COLOR, FACULTY_PER_PAGE, EMPTY_FORM
├── utils/
│   ├── facultyFilters.js               # filterFaculty + departmentStats + paginate
│   └── facultyImport.js                # parseFacultyExcel + template rows + invalid-department report
├── validation/facultyValidation.js     # validateFacultyForm
└── components/
    ├── FacultyPageHeader.jsx           # title + Bulk Import / Add Faculty buttons
    ├── FacultyStatsCards.jsx           # total + per-department cards
    ├── FacultyDeptTabs.jsx             # department tabs with live counts
    ├── FacultySearchBar.jsx            # search + active-filter chips + results count
    ├── FacultyTable.jsx                # table + loading + empty + pagination
    ├── FacultyFormModal.jsx            # add/edit — owns its form state (seeded per mode)
    └── FacultyImportModal.jsx          # bulk import — owns file/parse/result state via useFacultyImport
```

## E22. Behavior-preservation contract (faculty)

1. CRUD verbatim: fetch-on-mount, create/update (validate → success toast → close → refetch), delete (`window.confirm` guard → remove → refetch), error/catch toasts.
2. Filters verbatim: 300 ms debounce with the "searching" spinner, page reset to 1 on search/dept change, search matches name OR department (case-insensitive), `All` tab, per-tab live counts (dept count = ALL faculty of that dept, not filtered).
3. Stats verbatim: `total` = full list length; `byDept` = DEPARTMENTS order with counts, filtered to count > 0; cards clickable → sets dept filter; grid caps at 5 dept cards.
4. Table verbatim: 4 columns, row numbering `(page-1)*10 + idx + 1`, gradient avatar with first initial, dept badge via `DEPT_COLORS[code] || DEFAULT_COLOR`, permission-gated edit/delete icons, loading spinner copy, empty-state copy (two variants), pagination wrapper.
5. Import verbatim: extension check `.xlsx|.xls` + toast, drag-drop + browse, FileReader → dynamic `xlsx` import → first sheet → column aliases (`Faculty Name`/`faculty_name`/`Name`, `Department`/`department`) → filter rows missing either field → toasts (`Parsed N faculty records` / `No valid faculty data found in the file` / `Failed to parse Excel file`), preview table (5 rows + "…and N more"), invalid-department pre-check message (3 quoted codes + "and N more" + valid list), import result panel (imported/failed + per-row errors "Row {index+2}: {error}"), template download (2 example rows, sheet "Faculty", `faculty_import_template.xlsx`), close resets file/parsed/result + clears the file input.
6. Permission gates verbatim: `manage_faculty` create/edit/delete/import; buttons hidden (not disabled) when not permitted.
7. All brand colors/gradients (`#1e3a7b → #2d4fa3`, `#1e5e38 → #2d7a47`), copy strings, and the `stats &&` guard preserved.

## E23. Flagged deviations

1. `isSearching` derived from `searchTerm !== debouncedSearch` instead of the manual flag pair (same observable timing: spinner from keystroke until the debounce lands).
2. Form modal and import modal own their state and reset on close-by-unmount (the original reset explicit fields in `closeModal`/`closeImportModal`); both mount only while open, so behaviour matches.

## E24. Execution order

1. constants + utils + validation. 2. Hooks (2). 3. Section components (header/stats/tabs/search/table). 4. Form modal. 5. Import modal (+ import utils). 6. Page + index.js + App.jsx. 7. Delete `pages/Faculty.jsx`. 8. Verify: grep, `npm run build`, `npm test`.
