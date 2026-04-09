// ─────────────────────────────────────────────────────────
//  services/analyticsService.js
// ─────────────────────────────────────────────────────────

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

function buildDateFilter(dateCol, { semester, month, schoolYear } = {}) {
  const clauses = [];
  const params  = [];

  if (schoolYear && semester) {
    const [startYear, endYear] = schoolYear.split(/[–\-]/).map(Number);
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

// ─────────────────────────────────────────────────────────
//  1. KPI STATS — filtered by semester/month/schoolYear
//     • nemcoTotal / lexoraTotal  → books added in period (created_at)
//     • returned / borrowed / overdue → activity in period (borrow_date)
//     • nemcoOutOfStock → out-of-stock books added in period
// ─────────────────────────────────────────────────────────
async function getBookStats(filters = {}) {
  try {
    // NEMCO books added in this period
    const { clauses: ncCl, params: ncPr } = buildDateFilter("b.created_at", filters);
    const ncAnd = ncCl.length ? `AND ${ncCl.join(" AND ")}` : "";

    const [[nemco]] = await pool.query(
      `SELECT COUNT(*) AS total FROM books b WHERE b.deleted_at IS NULL ${ncAnd}`, ncPr
    );
    const [[oos]] = await pool.query(
      `SELECT COUNT(*) AS total FROM books b
       WHERE b.deleted_at IS NULL AND (b.status = 'OutOfStock' OR b.quantity = 0) ${ncAnd}`,
      ncPr
    );

    // LEXORA books added in this period
    const { clauses: lxCl, params: lxPr } = buildDateFilter("lb.created_at", filters);
    const lxAnd = lxCl.length ? `AND ${lxCl.join(" AND ")}` : "";

    const [[lexora]] = await pool.query(
      `SELECT COUNT(*) AS total FROM lexora_books lb WHERE lb.deleted_at IS NULL ${lxAnd}`, lxPr
    );

    // Borrow activity in this period
    const { clauses: bbCl, params: bbPr } = buildDateFilter("bb.borrow_date", filters);
    const bbAnd = bbCl.length ? `AND ${bbCl.join(" AND ")}` : "";

    const [[returned]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb WHERE bb.status = 'Returned' ${bbAnd}`, bbPr
    );
    const [[borrowed]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb WHERE bb.status = 'Borrowed' ${bbAnd}`, bbPr
    );
    const [[overdue]] = await pool.query(
      `SELECT COUNT(*) AS total FROM borrowed_books bb
       WHERE bb.status = 'Borrowed' AND bb.due_date < CURDATE() ${bbAnd}`,
      bbPr
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
//  2. MOST BORROWED
// ─────────────────────────────────────────────────────────
async function getMostBorrowed(filters = {}) {
  try {
    const { clauses, params } = buildDateFilter("t.borrow_date", filters);
    const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT b.id, b.title, b.author, COUNT(t.id) AS borrows
       FROM borrowed_books t
       INNER JOIN books b ON t.book_id = b.id
       ${whereStr}
       GROUP BY b.id, b.title, b.author
       ORDER BY borrows DESC
       LIMIT 10`,
      params
    );

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
//  3. ATTENDANCE
// ─────────────────────────────────────────────────────────
async function getAttendance(filters = {}) {
  try {
    const { semester, month } = filters;

    if (month && month !== "All") {
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT WEEK(a.check_in_time,1) AS iso_week,
                MIN(DATE(a.check_in_time)) AS week_start,
                MAX(DATE(a.check_in_time)) AS week_end,
                COUNT(*) AS visits
         FROM attendance a ${whereStr}
         GROUP BY iso_week ORDER BY iso_week ASC`,
        params
      );

      const data = rows.map(r => {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        return { x: `${fmt(s)}–${e.getDate()}`, visits: Number(r.visits) };
      });
      return { success: true, data };

    } else {
      const { clauses, params } = buildDateFilter("a.check_in_time", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const [rows] = await pool.query(
        `SELECT MONTH(a.check_in_time) AS month_num, COUNT(*) AS visits
         FROM attendance a ${whereStr}
         GROUP BY month_num ORDER BY month_num ASC`,
        params
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

// ─────────────────────────────────────────────────────────
//  4. FINES
// ─────────────────────────────────────────────────────────
async function getFines(filters = {}) {
  try {
    const { semester, month } = filters;

    if (month && month !== "All") {
      const { clauses, params: p1 } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const collectedSql = `
        SELECT WEEK(t.borrow_date,1) AS iso_week,
               MIN(DATE(t.borrow_date)) AS week_start,
               MAX(DATE(t.borrow_date)) AS week_end,
               SUM(t.fine_amount) AS amount
        FROM borrowed_books t
        ${whereStr} ${andStr} t.fine_paid = 1 AND t.fine_amount > 0
        GROUP BY iso_week ORDER BY iso_week ASC`;

      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT WEEK(t.borrow_date,1) AS iso_week,
               MIN(DATE(t.borrow_date)) AS week_start,
               MAX(DATE(t.borrow_date)) AS week_end,
               SUM(GREATEST(0, DATEDIFF(
                 CASE WHEN t.status='Returned' THEN t.return_date ELSE CURDATE() END,
                 t.due_date)) * ${FINE_PER_DAY}) AS amount
        FROM borrowed_books t
        ${whereStr} ${andStr} t.fine_paid = 0 AND t.due_date < CURDATE()
        GROUP BY iso_week ORDER BY iso_week ASC`;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, p1),
        pool.query(uncollectedSql, p2),
      ]);

      const map = {};
      for (const r of collected) {
        const s = new Date(r.week_start), e = new Date(r.week_end);
        const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
        map[r.iso_week] = { x: `${fmt(s)}–${e.getDate()}`, collected: Number(r.amount || 0), uncollected: 0 };
      }
      for (const r of uncollected) {
        if (!map[r.iso_week]) {
          const s = new Date(r.week_start), e = new Date(r.week_end);
          const fmt = d => `${MONTH_LABELS[d.getMonth() + 1]} ${d.getDate()}`;
          map[r.iso_week] = { x: `${fmt(s)}–${e.getDate()}`, collected: 0, uncollected: 0 };
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
        FROM borrowed_books t
        ${whereStr} ${andStr} t.fine_paid = 1 AND t.fine_amount > 0
        GROUP BY month_num`;

      const { params: p2 } = buildDateFilter("t.borrow_date", filters);
      const uncollectedSql = `
        SELECT MONTH(t.borrow_date) AS month_num,
               SUM(GREATEST(0, DATEDIFF(
                 CASE WHEN t.status='Returned' THEN t.return_date ELSE CURDATE() END,
                 t.due_date)) * ${FINE_PER_DAY}) AS amount
        FROM borrowed_books t
        ${whereStr} ${andStr} t.fine_paid = 0 AND t.due_date < CURDATE()
        GROUP BY month_num`;

      const [[collected], [uncollected]] = await Promise.all([
        pool.query(collectedSql, p1),
        pool.query(uncollectedSql, p2),
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

// ─────────────────────────────────────────────────────────
//  5. OVERDUE
// ─────────────────────────────────────────────────────────
async function getOverdue(filters = {}) {
  try {
    const { semester, month } = filters;
    const severitySQL = `
      SUM(CASE WHEN days_late BETWEEN 1  AND 7  THEN 1 ELSE 0 END) AS minor,
      SUM(CASE WHEN days_late BETWEEN 8  AND 14 THEN 1 ELSE 0 END) AS warning,
      SUM(CASE WHEN days_late >= 15              THEN 1 ELSE 0 END) AS critical`;

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
               FROM borrowed_books t
               ${whereStr} ${andStr} t.status='Borrowed' AND t.due_date < CURDATE()) t
         GROUP BY iso_week ORDER BY iso_week ASC`,
        params
      );

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
      const { clauses, params } = buildDateFilter("t.borrow_date", filters);
      const whereStr = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const andStr   = clauses.length ? "AND" : "WHERE";

      const [rows] = await pool.query(
        `SELECT MONTH(t.borrow_date) AS month_num, ${severitySQL}
         FROM (SELECT t.borrow_date, DATEDIFF(CURDATE(), t.due_date) AS days_late
               FROM borrowed_books t
               ${whereStr} ${andStr} t.status='Borrowed' AND t.due_date < CURDATE()) t
         GROUP BY month_num`,
        params
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

// ─────────────────────────────────────────────────────────
//  6. HOLDINGS BREAKDOWN — filtered by created_at
//     Shows books that were added during the selected semester/month
// ─────────────────────────────────────────────────────────
async function getHoldingsBreakdown(filters = {}) {
  try {
    // NEMCO books added in this period
    const { clauses: ncCl, params: ncPr } = buildDateFilter("b.created_at", filters);
    const ncAnd = ncCl.length ? `AND ${ncCl.join(" AND ")}` : "";

    const [nemcoRows] = await pool.query(
      `SELECT TRIM(UPPER(COALESCE(b.collection,'UNCATEGORIZED'))) AS category, COUNT(*) AS total
       FROM books b
       WHERE b.deleted_at IS NULL
         AND b.collection IS NOT NULL AND TRIM(b.collection) != ''
         ${ncAnd}
       GROUP BY category ORDER BY category ASC`,
      ncPr
    );

    // LEXORA books added in this period
    const { clauses: lxCl, params: lxPr } = buildDateFilter("lb.created_at", filters);
    const lxAnd = lxCl.length ? `AND ${lxCl.join(" AND ")}` : "";

    const [lexoraRows] = await pool.query(
      `SELECT TRIM(UPPER(COALESCE(lb.program,'UNCATEGORIZED'))) AS category, COUNT(*) AS total
       FROM lexora_books lb
       WHERE lb.deleted_at IS NULL
         AND lb.program IS NOT NULL AND TRIM(lb.program) != ''
         ${lxAnd}
       GROUP BY category ORDER BY category ASC`,
      lxPr
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
  getHoldingsBreakdown,
};