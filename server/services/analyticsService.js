// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  services/analyticsService.js
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const { pool } = require("../config/db");

const FINE_PER_DAY = 5;

const SEM_MONTHS = {
  "1st Sem": [8, 9, 10, 11, 12, 1],
  "2nd Sem": [2, 3, 4, 5, 6, 7],
};

const MONTH_MAP = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

const MONTH_LABELS = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
  7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
};

function buildDateFilter(dateCol, { semester, month, schoolYear, dateFrom, dateTo } = {}) {
  const clauses = [];
  const params  = [];

  // Date range filter â€” applies ALONGSIDE semester/month filters
  if (dateFrom) {
    clauses.push(`DATE(${dateCol}) >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push(`DATE(${dateCol}) <= ?`);
    params.push(dateTo);
  }

  // Semester / month / schoolYear filters (kept for backwards compatibility)
  if (schoolYear && semester) {
    const [startYear, endYear] = schoolYear.split(/[â€“\-]/).map(Number);
    const semMonths = SEM_MONTHS[semester] || [];

    if (month && month !== "All") {
      const monthNum = MONTH_MAP[month];
      if (monthNum) {
        let targetYear;
        if (semester === "1st Sem") {
          targetYear = monthNum === 1 ? endYear : startYear;
        } else {
          targetYear = endYear;
        }
        clauses.push(`MONTH(${dateCol}) = ? AND YEAR(${dateCol}) = ?`);
        params.push(monthNum, targetYear);
      }
    } else {
      if (semester === "1st Sem") {
        const augDec = semMonths.filter(m => m !== 1);
        const jan    = semMonths.filter(m => m === 1);
        const parts  = [];
        if (augDec.length) {
          parts.push(`(MONTH(${dateCol}) IN (${augDec.join(",")}) AND YEAR(${dateCol}) = ?)`);
          params.push(startYear);
        }
        if (jan.length) {
          parts.push(`(MONTH(${dateCol}) IN (${jan.join(",")}) AND YEAR(${dateCol}) = ?)`);
          params.push(endYear);
        }
        if (parts.length) clauses.push(`(${parts.join(" OR ")})`);
      } else {
        clauses.push(`MONTH(${dateCol}) IN (${semMonths.join(",")}) AND YEAR(${dateCol}) = ?`);
        params.push(endYear);
      }
    }
  }

  return { clauses, params };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  1. KPI STATS â€” filtered by semester/month/schoolYear
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getBookStats(filters = {}, scope = null) {
  try {
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);
    const lexScope  = require("../features/organization/bookAccess.service").lexoraBookScopeSql(scope);
    // Loans scope through the borrowed book: `LEFT JOIN books b ON bb.book_id = b.id`.
    const loanJoin  = "LEFT JOIN books b ON bb.book_id = b.id";
    const bookBS    = bookScope.sql;                       // AND (...)
    const bookBSP   = bookScope.params;                    // params for the fragment
    const lexAnd    = lexScope.sql;
    const lexP      = lexScope.params;

    // NEMCO books added in this period
    const { clauses: ncCl, params: ncPr } = buildDateFilter("b.created_at", filters);
    const ncAnd = ncCl.length ? `AND ${ncCl.join(" AND ")}` : "";

    const [[nemco]] = await pool.query(
      `SELECT COUNT(*) AS total FROM books b WHERE b.is_deleted = 0 ${ncAnd} ${bookBS}`,
      [...ncPr, ...bookBSP]
    );
    const [[oos]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM books b
       INNER JOIN (
         SELECT book_id, SUM(status = 'Available') AS avail_copies
         FROM book_copies
         WHERE is_deleted = 0
         GROUP BY book_id
       ) cc ON cc.book_id = b.id
       WHERE b.is_deleted = 0
         AND cc.avail_copies = 0 ${ncAnd} ${bookBS}`,
      [...ncPr, ...bookBSP]
    );

    // LEXORA books â€” no is_deleted column on this table
    const { clauses: lxCl, params: lxPr } = buildDateFilter("lb.created_at", filters);
    const lxAnd = lxCl.length ? `AND ${lxCl.join(" AND ")}` : "";
    const [[lexora]] = await pool.query(
      `SELECT COUNT(*) AS total FROM lexora_books lb WHERE 1=1 ${lxAnd} ${lexAnd}`,
      [...lxPr, ...lexP]
    );

    // Borrow activity â€” FIX: spread params for every sequential call so
    // mysql2 never sees an already-consumed reference
    const { clauses: bbCl, params: bbPr } = buildDateFilter("bb.borrow_date", filters);
    const bbAnd = bbCl.length ? `AND ${bbCl.join(" AND ")}` : "";

    const [[returned]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb ${loanJoin}
       WHERE bb.is_deleted = 0 AND bb.status = 'Returned' ${bbAnd} ${bookBS}`,
      [...bbPr, ...bookBSP]
    );
    const [[borrowed]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb ${loanJoin}
       WHERE bb.is_deleted = 0 AND bb.status = 'Borrowed' ${bbAnd} ${bookBS}`,
      [...bbPr, ...bookBSP]
    );
    const [[overdue]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb ${loanJoin}
       WHERE bb.is_deleted = 0 AND bb.status = 'Borrowed' AND bb.due_date < CURDATE() ${bbAnd} ${bookBS}`,
      [...bbPr, ...bookBSP]
    );

     // Total copies and available copies: filter by book creation date using the
     // same date clauses (ncCl / ncPr) applied to NEMCO books. This ensures
     // these KPIs respect the selected date range (or semester/month) just like
     // the other metrics.
     let totalCopiesCount, availableCopiesCount;
     if (ncCl.length) {
       const copiesWhere = `WHERE bc.is_deleted = 0 AND b.is_deleted = 0 AND ${ncCl.join(" AND ")} ${bookBS}`;
       const [[totalCopiesRes]] = await pool.query(
         `SELECT COUNT(*) AS total FROM book_copies bc INNER JOIN books b ON b.id = bc.book_id ${copiesWhere}`,
         [...ncPr, ...bookBSP]
       );
       totalCopiesCount = Number(totalCopiesRes.total);
       const availWhere = `WHERE bc.is_deleted = 0 AND bc.status = 'Available' AND b.is_deleted = 0 AND ${ncCl.join(" AND ")} ${bookBS}`;
       const [[availRes]] = await pool.query(
         `SELECT COUNT(*) AS total FROM book_copies bc INNER JOIN books b ON b.id = bc.book_id ${availWhere}`,
         [...ncPr, ...bookBSP]
       );
       availableCopiesCount = Number(availRes.total);
     } else {
       const copiesWhere = `WHERE bc.is_deleted = 0 AND b.is_deleted = 0 ${bookBS}`;
       const [[totalCopiesRes]] = await pool.query(
         `SELECT COUNT(*) AS total FROM book_copies bc INNER JOIN books b ON b.id = bc.book_id ${copiesWhere}`,
         [...bookBSP]
       );
       totalCopiesCount = Number(totalCopiesRes.total);
       const availWhere = `WHERE bc.is_deleted = 0 AND bc.status = 'Available' AND b.is_deleted = 0 ${bookBS}`;
       const [[availRes]] = await pool.query(
         `SELECT COUNT(*) AS total FROM book_copies bc INNER JOIN books b ON b.id = bc.book_id ${availWhere}`,
         [...bookBSP]
       );
       availableCopiesCount = Number(availRes.total);
     }

      // Added This Month: NEMCO-only count. When a date range is active,
      // use the already-filtered nemco.total. Otherwise fall back to
      // last-30-days NEMCO-only query for the "Added This Month" label.
      let addedThisPeriod;
      const hasDateFilter = !!(filters.dateFrom || filters.dateTo);
      if (hasDateFilter) {
        // nemco already reflects the date-filtered count
        addedThisPeriod = Number(nemco.total);
      } else {
        // Fallback: last 30 days NEMCO-only (original "Added This Month" behavior)
        const [[nemcoAdded]] = await pool.query(
          `SELECT COUNT(*) AS total FROM books WHERE is_deleted = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
        );
        addedThisPeriod = Number(nemcoAdded.total);
      }

     return {
       success: true,
       data: {
         // Original fields (for main Dashboard compatibility)
         nemcoTotal:      Number(nemco.total),
         lexoraTotal:     Number(lexora.total),
         nemcoOutOfStock: Number(oos.total),
         returned:        Number(returned.total),
         borrowed:        Number(borrowed.total),
         overdue:         Number(overdue.total),
         // BookDashboard KPIs â€” NEMCO only for counts that are catalog-dependent
         totalBooks:      Number(nemco.total),                       // NEMCO titles only
         totalCopies:     totalCopiesCount,                           // NEMCO copies only
         availableCopies: availableCopiesCount,                       // NEMCO available only
         borrowedBooks:   Number(borrowed.total),                      // NEMCO borrows only
         overdueBooks:    Number(overdue.total),                       // NEMCO overdues only
         addedThisMonth:  addedThisPeriod,                             // NEMCO + LEXORA added (inventory metric)
       },
     };
  } catch (err) {
    console.error("[analyticsService.getBookStats]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  2. MOST BORROWED
//  FIX: Borrows and copies are counted in separate subqueries to prevent
//       the LEFT JOIN book_copies multiplication bug where borrow counts
//       were inflated by the number of copies (borrows Ã— copies).
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getMostBorrowed(filters = {}, scope = null) {
  try {
    const { clauses, params } = buildDateFilter("bb.borrow_date", filters);
    const borrowWhere = clauses.length
      ? `WHERE bb.is_deleted = 0 AND bb.status = 'Borrowed' AND ${clauses.join(" AND ")}`
      : "WHERE bb.is_deleted = 0 AND bb.status = 'Borrowed'";

    // School scope: only books visible to the caller are ranked.
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);

    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.title,
         b.author,
         b.genre,
         borrow_counts.borrows,
         COALESCE(copy_counts.total_copies,     0) AS total_copies,
         COALESCE(copy_counts.available_copies, 0) AS available_copies
       FROM books b
       INNER JOIN (
         SELECT book_id, COUNT(id) AS borrows
         FROM borrowed_books bb
         ${borrowWhere}
         GROUP BY book_id
       ) borrow_counts ON borrow_counts.book_id = b.id
       LEFT JOIN (
         SELECT
           book_id,
           COUNT(id)                                        AS total_copies,
           SUM(status = 'Available' AND is_deleted = 0)    AS available_copies
         FROM book_copies
         WHERE is_deleted = 0
         GROUP BY book_id
       ) copy_counts ON copy_counts.book_id = b.id
       WHERE b.is_deleted = 0 ${bookScope.sql}
       ORDER BY borrow_counts.borrows DESC
       LIMIT 10`,
      [...params, ...bookScope.params]
    );

    const data = rows.map(r => ({
      id:               r.id,
      short:            r.title
                          ? (r.title.length > 22 ? r.title.slice(0, 21) + "â€¦" : r.title)
                          : "â€”",
      title:            r.title            ?? "â€”",
      author:           r.author           ?? "â€”",
      genre:            r.genre            ?? "â€”",
      borrows:          Number(r.borrows),
      total_copies:     Number(r.total_copies     ?? 0),
      available_copies: Number(r.available_copies ?? 0),
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[analyticsService.getMostBorrowed]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  3. ATTENDANCE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getAttendance(filters = {}, scope = null) {
  try {
    const { semester, month } = filters;

    // School scope through the student-user link (attendance.student_id_number).
    const { studentScopeSql } = require("../features/organization/attendanceAccess.service");
    const sScope = studentScopeSql(scope);
    const studentJoin = "LEFT JOIN users st ON st.student_id_number = a.student_id_number AND st.role = 'student'";

    if (month && month !== "All") {
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT WEEK(a.check_in_time,1) AS iso_week,
                MIN(DATE(a.check_in_time)) AS week_start,
                MAX(DATE(a.check_in_time)) AS week_end,
                COUNT(*) AS visits
         FROM attendance a ${studentJoin} ${whereStr} ${sScope.sql}
         GROUP BY iso_week ORDER BY iso_week ASC`,
        [...params, ...sScope.params]
      );

      const data = rows.map(r => {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        return { x: `${fmt(s)}â€“${e.getDate()}`, visits: Number(r.visits) };
      });
      return { success: true, data };

    } else {
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT MONTH(a.check_in_time) AS month_num, COUNT(*) AS visits
         FROM attendance a ${studentJoin} ${whereStr} ${sScope.sql}
         GROUP BY month_num ORDER BY month_num ASC`,
        [...params, ...sScope.params]
      );

      const byMonth   = Object.fromEntries(rows.map(r => [r.month_num, Number(r.visits)]));
      const semMonths = SEM_MONTHS[semester] || [];
      const data      = semMonths.map(m => ({ x: MONTH_LABELS[m], visits: byMonth[m] ?? 0 }));
      return { success: true, data };
    }
  } catch (err) {
    console.error("[analyticsService.getAttendance]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  4. FINES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getFines(filters = {}, scope = null) {
  try {
    const { semester, month } = filters;

    // School scope through the borrowed book.
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);
    const loanJoin = "LEFT JOIN books b ON t.book_id = b.id";

    if (month && month !== "All") {
      const { clauses, params: p1 } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const collectedSql = `
        SELECT WEEK(t.borrow_date,1) AS iso_week,
               MIN(DATE(t.borrow_date)) AS week_start,
               MAX(DATE(t.borrow_date)) AS week_end,
               SUM(t.fine_amount) AS amount
        FROM borrowed_books t ${loanJoin}
        ${whereStr} ${andStr} t.fine_paid = 1 AND t.fine_amount > 0 ${bookScope.sql}
        GROUP BY iso_week ORDER BY iso_week ASC`;

      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT WEEK(t.borrow_date,1) AS iso_week,
               MIN(DATE(t.borrow_date)) AS week_start,
               MAX(DATE(t.borrow_date)) AS week_end,
               SUM(GREATEST(0, DATEDIFF(
                 CASE WHEN t.status='Returned' THEN t.return_date ELSE CURDATE() END,
                 t.due_date)) * ${FINE_PER_DAY}) AS amount
        FROM borrowed_books t ${loanJoin}
        ${whereStr} ${andStr} t.fine_paid = 0 AND t.due_date < CURDATE() ${bookScope.sql}
        GROUP BY iso_week ORDER BY iso_week ASC`;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, [...p1, ...bookScope.params]),
        pool.query(uncollectedSql, [...p2, ...bookScope.params]),
      ]);

      const map = {};
      for (const r of collected) {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        map[r.iso_week] = { x: `${fmt(s)}â€“${e.getDate()}`, collected: Number(r.amount || 0), uncollected: 0 };
      }
      for (const r of uncollected) {
        if (!map[r.iso_week]) {
          const s = new Date(r.week_start), e = new Date(r.week_end);
          const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
          map[r.iso_week] = { x: `${fmt(s)}â€“${e.getDate()}`, collected: 0, uncollected: 0 };
        }
        map[r.iso_week].uncollected = Number(r.amount || 0);
      }
      return { success: true, data: Object.values(map).sort((a, b) => parseInt(a.x) - parseInt(b.x)) };

    } else {
      const { clauses, params: p1 } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const collectedSql = `
        SELECT MONTH(t.borrow_date) AS month_num, SUM(t.fine_amount) AS amount
        FROM borrowed_books t ${loanJoin}
        ${whereStr} ${andStr} t.fine_paid = 1 AND t.fine_amount > 0 ${bookScope.sql}
        GROUP BY month_num`;

      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT MONTH(t.borrow_date) AS month_num,
               SUM(GREATEST(0, DATEDIFF(
                 CASE WHEN t.status='Returned' THEN t.return_date ELSE CURDATE() END,
                 t.due_date)) * ${FINE_PER_DAY}) AS amount
        FROM borrowed_books t ${loanJoin}
        ${whereStr} ${andStr} t.fine_paid = 0 AND t.due_date < CURDATE() ${bookScope.sql}
        GROUP BY month_num`;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, [...p1, ...bookScope.params]),
        pool.query(uncollectedSql, [...p2, ...bookScope.params]),
      ]);

      const collMap   = Object.fromEntries(collected.map(r  => [r.month_num, Number(r.amount || 0)]));
      const uncollMap = Object.fromEntries(uncollected.map(r => [r.month_num, Number(r.amount || 0)]));
      const semMonths = SEM_MONTHS[semester] || [];
      const data = semMonths.map(m => ({
        x:           MONTH_LABELS[m],
        collected:   collMap[m]   ?? 0,
        uncollected: uncollMap[m] ?? 0,
      }));
      return { success: true, data };
    }
  } catch (err) {
    console.error("[analyticsService.getFines]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  5. OVERDUE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getOverdue(filters = {}, scope = null) {
  try {
    const { semester, month } = filters;
    const severitySQL = `
      SUM(CASE WHEN days_late BETWEEN 1  AND 7  THEN 1 ELSE 0 END) AS minor,
      SUM(CASE WHEN days_late BETWEEN 8  AND 14 THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN days_late >= 15              THEN 1 ELSE 0 END) AS critical`;

    // School scope through the borrowed book.
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);
    const loanJoin = "LEFT JOIN books b ON t.book_id = b.id";

    if (month && month !== "All") {
      const { clauses, params } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const [rows] = await pool.query(
        `SELECT WEEK(t.borrow_date,1) AS iso_week,
                MIN(DATE(t.borrow_date)) AS week_start,
                MAX(DATE(t.borrow_date)) AS week_end,
                ${severitySQL}
         FROM (SELECT t.borrow_date, DATEDIFF(CURDATE(), t.due_date) AS days_late
               FROM borrowed_books t ${loanJoin}
               ${whereStr} ${andStr} t.status='Borrowed' AND t.due_date < CURDATE() ${bookScope.sql}) t
         GROUP BY iso_week ORDER BY iso_week ASC`,
        [...params, ...bookScope.params]
      );

      const data = rows.map(r => {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        return {
          x:        `${fmt(s)}â€“${e.getDate()}`,
          minor:    Number(r.minor    || 0),
          warning:  Number(r.warning  || 0),
          critical: Number(r.critical || 0),
        };
      });
      return { success: true, data };

    } else {
      const { clauses, params } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const [rows] = await pool.query(
        `SELECT MONTH(t.borrow_date) AS month_num, ${severitySQL}
         FROM (SELECT t.borrow_date, DATEDIFF(CURDATE(), t.due_date) AS days_late
               FROM borrowed_books t ${loanJoin}
               ${whereStr} ${andStr} t.status='Borrowed' AND t.due_date < CURDATE() ${bookScope.sql}) t
         GROUP BY month_num`,
        [...params, ...bookScope.params]
      );

      const byMonth   = Object.fromEntries(rows.map(r => [r.month_num, r]));
      const semMonths = SEM_MONTHS[semester] || [];
      const data = semMonths.map(m => ({
        x:        MONTH_LABELS[m],
        minor:    Number(byMonth[m]?.minor    ?? 0),
        warning:  Number(byMonth[m]?.warning  ?? 0),
        critical: Number(byMonth[m]?.critical ?? 0),
      }));
      return { success: true, data };
    }
  } catch (err) {
    console.error("[analyticsService.getOverdue]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  6. COPIES BY STATUS (NEMCO only â€” LEXORA excluded)
//  Counts individual physical copies from book_copies.
//  book_copies.status is the authoritative enum:
//    'Available' | 'Borrowed' | 'Reserved' | 'Lost' | 'Damaged'
//  Lost + Damaged are grouped as 'Unavailable'.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getBooksByStatus(filters = {}, scope = null) {
  try {
    // Scope to books added within the selected date range
    const { clauses: dateCl, params: datePr } = buildDateFilter("b.created_at", filters);
    const dateAnd = dateCl.length ? `AND ${dateCl.join(" AND ")}` : "";

    // School scope through book category assignments.
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);

    // book_copies.status is the single source of truth for each physical copy.
    // No join to borrowed_books needed â€” the enum already tracks Borrowed state.
    // Lost and Damaged are collapsed into one 'Unavailable' bucket for the chart.
    const [rows] = await pool.query(`
      SELECT
        SUM(bc.status = 'Available')            AS available,
        SUM(bc.status = 'Borrowed')             AS borrowed,
        SUM(bc.status = 'Reserved')             AS reserved,
        SUM(bc.status IN ('Lost', 'Damaged'))   AS unavailable
      FROM book_copies bc
      INNER JOIN books b ON b.id = bc.book_id AND b.is_deleted = 0 ${dateAnd}
       WHERE bc.is_deleted = 0 ${bookScope.sql}`,
      [...datePr, ...bookScope.params]
    );

    const r = rows[0] || {};
    return {
      success: true,
      data: {
        available:   Number(r.available   ?? 0),
        borrowed:    Number(r.borrowed    ?? 0),
        reserved:    Number(r.reserved    ?? 0),
        unavailable: Number(r.unavailable ?? 0),
      },
    };
  } catch (err) {
    console.error("[analyticsService.getBooksByStatus]", err.message);
    return { success: false, error: err.message };
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  7. HOLDINGS BREAKDOWN
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function getHoldingsBreakdown(filters = {}, scope = null) {
  try {
    const bookScope = require("../features/organization/bookAccess.service").physicalBookScopeSql(scope);
    const lexScope  = require("../features/organization/bookAccess.service").lexoraBookScopeSql(scope);

    const { clauses: ncCl, params: ncPr } = buildDateFilter("b.created_at", filters);
    const ncAnd = ncCl.length ? `AND ${ncCl.join(" AND ")}` : "";

    const [nemcoRows] = await pool.query(
      `SELECT TRIM(UPPER(COALESCE(NULLIF(TRIM(b.collection),''),'UNCATEGORIZED'))) AS category,
              COUNT(*) AS total
       FROM books b
       WHERE b.is_deleted = 0 ${ncAnd} ${bookScope.sql}
       GROUP BY category ORDER BY category ASC`,
      [...ncPr, ...bookScope.params]
    );

    const { clauses: lxCl, params: lxPr } = buildDateFilter("lb.created_at", filters);
    const lxAnd = lxCl.length ? `AND ${lxCl.join(" AND ")}` : "";

    const [lexoraRows] = await pool.query(
      `SELECT TRIM(UPPER(COALESCE(NULLIF(TRIM(lb.program),''),'UNCATEGORIZED'))) AS category,
              COUNT(*) AS total
       FROM lexora_books lb
       WHERE 1=1 ${lxAnd} ${lexScope.sql}
       GROUP BY category ORDER BY category ASC`,
      [...lxPr, ...lexScope.params]
    );

    const nemcoMap  = Object.fromEntries(nemcoRows.map(r  => [r.category, Number(r.total)]));
    const lexoraMap = Object.fromEntries(lexoraRows.map(r => [r.category, Number(r.total)]));

    const allCategories = Array.from(
      new Set([...Object.keys(nemcoMap), ...Object.keys(lexoraMap)])
    ).sort();

    const data = allCategories.map(category => ({
      category,
      nemco:  nemcoMap[category]  ?? 0,
      lexora: lexoraMap[category] ?? 0,
    }));

    const maxNemco  = Math.max(...data.map(d => d.nemco),  1);
    const maxLexora = Math.max(...data.map(d => d.lexora), 1);

    return { success: true, data, maxNemco, maxLexora };
  } catch (err) {
    console.error("[analyticsService.getHoldingsBreakdown]", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getBookStats,
  getMostBorrowed,
  getAttendance,
  getFines,
  getOverdue,
  getBooksByStatus,
  getHoldingsBreakdown,
};