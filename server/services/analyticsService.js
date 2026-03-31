// ─────────────────────────────────────────────────────────
//  services/analyticsService.js
//  All raw SQL analytics queries for the dashboard.
//  Every function accepts a { semester, month, schoolYear }
//  filter object and returns plain JS objects — no HTTP logic here.
// ─────────────────────────────────────────────────────────

const { pool } = require("../config/db");

const FINE_PER_DAY = 5; // ₱5 / day — keep in sync with Transaction model

// ── Semester → calendar month numbers ────────────────────────────────────────
// 1st Sem: Aug(8)–Jan(1)   2nd Sem: Feb(2)–Jul(7)
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

/**
 * Build WHERE clause fragments for semester/month/schoolYear filters.
 * dateCol — the column to filter on (e.g. "t.borrow_date", "a.check_in_time")
 *
 * School year "2024–2025":
 *   1st Sem → Aug 2024 – Jan 2025
 *   2nd Sem → Feb 2025 – Jul 2025
 */
function buildDateFilter(dateCol, { semester, month, schoolYear }) {
  const clauses = [];
  const params  = [];

  if (schoolYear && semester) {
    const [startYear, endYear] = schoolYear.split(/[–\-]/).map(Number);

    const semMonths = SEM_MONTHS[semester] || [];

    if (month && month !== "All") {
      const monthNum = MONTH_MAP[month];
      if (monthNum) {
        // Which calendar year does this month belong to?
        // 1st Sem: Aug–Dec → startYear, Jan → endYear
        // 2nd Sem: Feb–Jul → endYear
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
      // All months in this semester
      // Build: (MONTH IN (8,9,...,12) AND YEAR = startYear)
      //      OR (MONTH IN (1) AND YEAR = endYear)  ← Jan crossover for 1st sem
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
        // 2nd Sem: all months are in endYear
        clauses.push(`MONTH(${dateCol}) IN (${semMonths.join(",")}) AND YEAR(${dateCol}) = ?`);
        params.push(endYear);
      }
    }
  }

  return { clauses, params };
}

// ─────────────────────────────────────────────────────────
//  1. KPI STATS  — GET /api/books/stats
// ─────────────────────────────────────────────────────────
async function getBookStats() {
  try {
    const [[nemco]]   = await pool.query("SELECT COUNT(*) AS total FROM books");
    const [[lexora]]  = await pool.query("SELECT COUNT(*) AS total FROM lexora_books");
    const [[oos]]     = await pool.query(
      `SELECT COUNT(*) AS total FROM books
       WHERE status = 'OutOfStock' OR quantity = 0`
    );
    const [[returned]] = await pool.query(
      "SELECT COUNT(*) AS total FROM borrowed_books WHERE status = 'Returned'"
    );
    const [[borrowed]] = await pool.query(
      "SELECT COUNT(*) AS total FROM borrowed_books WHERE status = 'Borrowed'"
    );
    const [[overdue]]  = await pool.query(
      "SELECT COUNT(*) AS total FROM borrowed_books WHERE status = 'Borrowed' AND due_date < CURDATE()"
    );

    return {
      success: true,
      data: {
        nemcoTotal:      Number(nemco.total),
        lexoraTotal:     Number(lexora.total),
        nemcoOutOfStock: Number(oos.total),
        returned:        Number(returned.total),
        borrowed:        Number(borrowed.total),
        overdue:         Number(overdue.total),
      },
    };
  } catch (err) {
    console.error("[analyticsService.getBookStats]", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────
//  2. MOST BORROWED — GET /api/analytics/most-borrowed
//  Returns top 10 books by borrow count, filtered by semester/month/year.
// ─────────────────────────────────────────────────────────
async function getMostBorrowed(filters = {}) {
  try {
    const { clauses, params } = buildDateFilter("t.borrow_date", filters);

    const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const sql = `
      SELECT
        b.id,
        b.title,
        b.author,
        COUNT(t.id) AS borrows
      FROM borrowed_books t
      INNER JOIN books b ON t.book_id = b.id
      ${whereStr}
      GROUP BY b.id, b.title, b.author
      ORDER BY borrows DESC
      LIMIT 10
    `;

    const [rows] = await pool.query(sql, params);

    // Truncate long titles for chart display (≤ 22 chars)
    const data = rows.map(r => ({
      id:      r.id,
      short:   r.title.length > 22 ? r.title.slice(0, 21) + "…" : r.title,
      title:   r.title,
      author:  r.author,
      borrows: Number(r.borrows),
    }));

    return { success: true, data };
  } catch (err) {
    console.error("[analyticsService.getMostBorrowed]", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────
//  3. ATTENDANCE — GET /api/analytics/attendance
//
//  "All" month  → one data point per month  { x: "Aug", visits: N }
//  Specific month → one data point per week { x: "Aug 1–7", visits: N }
// ─────────────────────────────────────────────────────────
async function getAttendance(filters = {}) {
  try {
    const { semester, month, schoolYear } = filters;

    if (month && month !== "All") {
      // ── Weekly breakdown ──────────────────────────────────────
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const sql = `
        SELECT
          WEEK(a.check_in_time, 1)  AS iso_week,
          MIN(DATE(a.check_in_time)) AS week_start,
          MAX(DATE(a.check_in_time)) AS week_end,
          COUNT(*)                   AS visits
        FROM attendance a
        ${whereStr}
        GROUP BY iso_week
        ORDER BY iso_week ASC
      `;

      const [rows] = await pool.query(sql, params);

      const data = rows.map(r => {
        const s   = new Date(r.week_start);
        const e   = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        return { x: `${fmt(s)}–${e.getDate()}`, visits: Number(r.visits) };
      });

      return { success: true, data };

    } else {
      // ── Monthly breakdown for the whole semester ──────────────
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const sql = `
        SELECT
          MONTH(a.check_in_time) AS month_num,
          COUNT(*)               AS visits
        FROM attendance a
        ${whereStr}
        GROUP BY month_num
        ORDER BY month_num ASC
      `;

      const [rows] = await pool.query(sql, params);

      // Build an ordered list preserving semester month order
      const semMonths = SEM_MONTHS[semester] || [];
      const byMonth   = Object.fromEntries(rows.map(r => [r.month_num, Number(r.visits)]));

      const data = semMonths.map(m => ({
        x:      MONTH_LABELS[m],
        visits: byMonth[m] ?? 0,
      }));

      return { success: true, data };
    }
  } catch (err) {
    console.error("[analyticsService.getAttendance]", err.message);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────
//  4. FINES — GET /api/analytics/fines
//  Aggregates from borrowed_books.fine_amount (paid) and
//  computes outstanding (overdue, unpaid).
// ─────────────────────────────────────────────────────────
async function getFines(filters = {}) {
  try {
    const { semester, month } = filters;

    if (month && month !== "All") {
      // ── Weekly ─────────────────────────────────────────────────
      const { clauses, params: p1 } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      // Collected = fine_paid = 1, fine_amount > 0
      const collectedSql = `
        SELECT
          WEEK(t.borrow_date, 1)     AS iso_week,
          MIN(DATE(t.borrow_date))   AS week_start,
          MAX(DATE(t.borrow_date))   AS week_end,
          SUM(t.fine_amount)         AS amount
        FROM borrowed_books t
        ${whereStr} ${clauses.length ? "AND" : "WHERE"} t.fine_paid = 1 AND t.fine_amount > 0
        GROUP BY iso_week
        ORDER BY iso_week ASC
      `;
      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT
          WEEK(t.borrow_date, 1)     AS iso_week,
          MIN(DATE(t.borrow_date))   AS week_start,
          MAX(DATE(t.borrow_date))   AS week_end,
          SUM(
            GREATEST(0, DATEDIFF(
              CASE WHEN t.status = 'Returned' THEN t.return_date ELSE CURDATE() END,
              t.due_date
            )) * ${FINE_PER_DAY}
          ) AS amount
        FROM borrowed_books t
        ${whereStr} ${clauses.length ? "AND" : "WHERE"}
          t.fine_paid = 0
          AND t.due_date < CURDATE()
        GROUP BY iso_week
        ORDER BY iso_week ASC
      `;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, p1),
        pool.query(uncollectedSql, p2),
      ]);

      // Merge by iso_week
      const map = {};
      for (const r of collected) {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        const key = `${fmt(s)}–${e.getDate()}`;
        map[r.iso_week] = { x: key, collected: Number(r.amount || 0), uncollected: 0 };
      }
      for (const r of uncollected) {
        if (!map[r.iso_week]) {
          const s = new Date(r.week_start), e = new Date(r.week_end);
          const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
          map[r.iso_week] = { x: `${fmt(s)}–${e.getDate()}`, collected: 0, uncollected: 0 };
        }
        map[r.iso_week].uncollected = Number(r.amount || 0);
      }

      const data = Object.values(map).sort((a, b) =>
        parseInt(a.x) - parseInt(b.x)
      );
      return { success: true, data };

    } else {
      // ── Monthly ────────────────────────────────────────────────
      const { clauses, params: p1 } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const collectedSql = `
        SELECT
          MONTH(t.borrow_date) AS month_num,
          SUM(t.fine_amount)   AS amount
        FROM borrowed_books t
        ${whereStr} ${andStr} t.fine_paid = 1 AND t.fine_amount > 0
        GROUP BY month_num
      `;
      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT
          MONTH(t.borrow_date) AS month_num,
          SUM(
            GREATEST(0, DATEDIFF(
              CASE WHEN t.status = 'Returned' THEN t.return_date ELSE CURDATE() END,
              t.due_date
            )) * ${FINE_PER_DAY}
          ) AS amount
        FROM borrowed_books t
        ${whereStr} ${andStr}
          t.fine_paid = 0 AND t.due_date < CURDATE()
        GROUP BY month_num
      `;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, p1),
        pool.query(uncollectedSql, p2),
      ]);

      const collMap  = Object.fromEntries(collected.map(r  => [r.month_num,  Number(r.amount  || 0)]));
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

// ─────────────────────────────────────────────────────────
//  5. OVERDUE — GET /api/analytics/overdue
//  Buckets overdue books by severity:
//    minor    → 1–7 days late
//    warning  → 8–14 days late
//    critical → 15+ days late
// ─────────────────────────────────────────────────────────
async function getOverdue(filters = {}) {
  try {
    const { semester, month } = filters;

    const severitySQL = `
      SUM(CASE WHEN days_late BETWEEN 1  AND 7  THEN 1 ELSE 0 END) AS minor,
      SUM(CASE WHEN days_late BETWEEN 8  AND 14 THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN days_late >= 15               THEN 1 ELSE 0 END) AS critical
    `;

    if (month && month !== "All") {
      // ── Weekly ─────────────────────────────────────────────────
      const { clauses, params } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const sql = `
        SELECT
          WEEK(t.borrow_date, 1)   AS iso_week,
          MIN(DATE(t.borrow_date)) AS week_start,
          MAX(DATE(t.borrow_date)) AS week_end,
          ${severitySQL}
        FROM (
          SELECT
            t.borrow_date,
            DATEDIFF(CURDATE(), t.due_date) AS days_late
          FROM borrowed_books t
          ${whereStr} ${andStr}
            t.status = 'Borrowed'
            AND t.due_date < CURDATE()
        ) t
        GROUP BY iso_week
        ORDER BY iso_week ASC
      `;

      const [rows] = await pool.query(sql, params);

      const data = rows.map(r => {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        return {
          x:        `${fmt(s)}–${e.getDate()}`,
          minor:    Number(r.minor    || 0),
          warning:  Number(r.warning  || 0),
          critical: Number(r.critical || 0),
        };
      });

      return { success: true, data };

    } else {
      // ── Monthly ────────────────────────────────────────────────
      const { clauses, params } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const sql = `
        SELECT
          MONTH(t.borrow_date) AS month_num,
          ${severitySQL}
        FROM (
          SELECT
            t.borrow_date,
            DATEDIFF(CURDATE(), t.due_date) AS days_late
          FROM borrowed_books t
          ${whereStr} ${andStr}
            t.status = 'Borrowed'
            AND t.due_date < CURDATE()
        ) t
        GROUP BY month_num
      `;

      const [rows] = await pool.query(sql, params);

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

module.exports = {
  getBookStats,
  getMostBorrowed,
  getAttendance,
  getFines,
  getOverdue,
};