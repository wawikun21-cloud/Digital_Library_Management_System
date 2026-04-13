// ─────────────────────────────────────────────────────────
//  services/schedulerService.js
//
//  Runs daily background jobs:
//    • 08:00 — send "due tomorrow" reminders
//    • 08:05 — send overdue notices (day 1, 3, 7 only to avoid spam)
//
//  Wire up in app.js / server.js:
//    require("./services/schedulerService").start();
// ─────────────────────────────────────────────────────────

const { pool }             = require("../config/db");
const {
  sendDueDateReminder,
  sendOverdueNotice,
} = require("./emailService");

// Days overdue on which we send a notice (avoids spamming daily).
const OVERDUE_NOTICE_DAYS = new Set([1, 3, 7, 14, 30]);

// ── Helpers ───────────────────────────────────────────────
function localDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Schedule fn to run daily at HH:MM local time. */
function scheduleDaily(hh, mm, label, fn) {
  function msUntilNext() {
    const now  = new Date();
    const next = new Date(now);
    next.setHours(hh, mm, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next - now;
  }

  function run() {
    console.log(`[Scheduler] ▶ Running "${label}"`);
    fn().catch(err =>
      console.error(`[Scheduler] ❌ "${label}" failed:`, err.message)
    );
    setTimeout(run, 24 * 60 * 60 * 1000); // re-schedule for tomorrow
  }

  setTimeout(() => run(), msUntilNext());
  console.log(
    `[Scheduler] "${label}" scheduled — next run at ${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")} local time`
  );
}

// ─────────────────────────────────────────────────────────
//  Job 1 — Due-date reminders (books due tomorrow)
// ─────────────────────────────────────────────────────────
async function sendDueReminders() {
  const tomorrow = localDateStr(1);

  const [rows] = await pool.query(
    `SELECT
       bb.id,
       bb.borrower_email,
       bb.borrower_name,
       b.title  AS book_title,
       bb.due_date
     FROM borrowed_books bb
     LEFT JOIN books b ON bb.book_id = b.id
     WHERE bb.status = 'Borrowed'
       AND DATE(bb.due_date) = ?
       AND bb.borrower_email IS NOT NULL
       AND bb.borrower_email != ''
       AND bb.deleted_at IS NULL`,
    [tomorrow]
  );

  if (!rows.length) {
    console.log("[Scheduler] No due-tomorrow reminders to send.");
    return;
  }

  console.log(`[Scheduler] Sending ${rows.length} due-date reminder(s)…`);
  let ok = 0, fail = 0;

  for (const row of rows) {
    const result = await sendDueDateReminder(
      row.borrower_email,
      row.book_title || "Unknown Book",
      row.due_date,
      row.borrower_name
    );
    result.success ? ok++ : fail++;
  }

  console.log(`[Scheduler] Due reminders — sent: ${ok}, failed: ${fail}`);
}

// ─────────────────────────────────────────────────────────
//  Job 2 — Overdue notices
// ─────────────────────────────────────────────────────────
async function sendOverdueNotices() {
  const todayStr = localDateStr(0);

  const [rows] = await pool.query(
    `SELECT
       bb.id,
       bb.borrower_email,
       bb.borrower_name,
       b.title AS book_title,
       bb.due_date,
       DATEDIFF(?, bb.due_date) AS days_overdue
     FROM borrowed_books bb
     LEFT JOIN books b ON bb.book_id = b.id
     WHERE bb.status = 'Borrowed'
       AND bb.due_date < ?
       AND bb.borrower_email IS NOT NULL
       AND bb.borrower_email != ''
       AND bb.deleted_at IS NULL`,
    [todayStr, todayStr]
  );

  if (!rows.length) {
    console.log("[Scheduler] No overdue notices to send.");
    return;
  }

  // Only send on milestone days to avoid daily spam
  const toNotify = rows.filter(r => OVERDUE_NOTICE_DAYS.has(Number(r.days_overdue)));

  console.log(
    `[Scheduler] ${rows.length} overdue transactions — ${toNotify.length} qualify for notice today.`
  );

  let ok = 0, fail = 0;

  for (const row of toNotify) {
    const result = await sendOverdueNotice(
      row.borrower_email,
      row.book_title || "Unknown Book",
      row.due_date,
      row.borrower_name,
      Number(row.days_overdue)
    );
    result.success ? ok++ : fail++;
  }

  console.log(`[Scheduler] Overdue notices — sent: ${ok}, failed: ${fail}`);
}

// ─────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────
function start() {
  scheduleDaily(8, 0,  "Due-date reminders", sendDueReminders);
  scheduleDaily(8, 5,  "Overdue notices",     sendOverdueNotices);
  console.log("[Scheduler] ✅ Email scheduler started.");
}

module.exports = { start, sendDueReminders, sendOverdueNotices };