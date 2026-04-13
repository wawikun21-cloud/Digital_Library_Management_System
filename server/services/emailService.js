// ─────────────────────────────────────────────────────────
//  server/services/emailService.js
//
//  Three email types:
//    1. sendBorrowConfirmation — on borrow
//    2. sendDueDateReminder    — 1 day before due (via scheduler)
//    3. sendOverdueNotice      — overdue milestone days (via scheduler)
// ─────────────────────────────────────────────────────────

const nodemailer  = require("nodemailer");
const emailConfig = require("../config/email");   // ← reads from process.env

// ── Build transporter once at startup ────────────────────
// Validate credentials immediately so misconfiguration is
// caught at boot, not silently at send time.
function createTransporter() {
  const { auth, fromName } = emailConfig;

  if (!auth.user || !auth.pass) {
    console.warn(
      "[EmailService] ⚠️  GMAIL_USER or GMAIL_APP_PASSWORD missing in .env\n" +
      "               Emails are DISABLED until credentials are added."
    );
    return null;
  }

  console.log(`[EmailService] ✅ Email ready — sending as: ${auth.user} (${fromName})`);
  return nodemailer.createTransport(emailConfig);
}

const transporter = createTransporter();

// ── Shared constants ──────────────────────────────────────
const FINE_PER_DAY  = 5;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const FROM_NAME     = emailConfig.fromName;
const FROM_ADDRESS  = emailConfig.auth.user;

// ─────────────────────────────────────────────────────────
//  1. Borrow Confirmation
// ─────────────────────────────────────────────────────────
async function sendBorrowConfirmation(toEmail, bookTitle, dueDate, borrowerName) {
  if (!transporter) {
    console.warn("[EmailService] Skipping confirmation — transporter not configured.");
    return { success: false, error: "Email not configured" };
  }

  console.log(`[EmailService] Sending borrow confirmation → ${toEmail}`);

  const formattedDue = formatDate(dueDate);

  const body = `
    <p style="font-size:0.95rem;color:#475569">
      Hi <strong>${esc(borrowerName)}</strong>,
    </p>
    <p style="font-size:0.95rem;color:#475569;margin-top:8px">
      Your borrowing request has been confirmed. Here are your Transaction details:
    </p>
    <div class="card">
      <h2>📖 Transaction Details</h2>
      <div class="row"><span class="lbl">Book Title</span><span class="val">${esc(bookTitle)}</span></div>
      <div class="row"><span class="lbl">Due Date</span><span class="val hi">${formattedDue}</span></div>
      <div class="row"><span class="lbl">Fine Rate</span><span class="val">₱${FINE_PER_DAY}.00 per day overdue</span></div>
    </div>
    <div class="alert green">
      ✅ Please return the book on or before <strong>${formattedDue}</strong> to avoid late fines.
      You will receive a reminder email 1 day before the due date.
    </div>
  `;

  return sendMail(
    toEmail,
    `📚 Book Borrowed: "${esc(bookTitle)}" — Due ${formattedDue}`,
    shell("#32667F", "#1a4a63", "📚", "Book Borrowed Successfully", `Thank you, ${esc(borrowerName)}!`, body)
  );
}

// ─────────────────────────────────────────────────────────
//  2. Due Date Reminder  (called by schedulerService)
// ─────────────────────────────────────────────────────────
async function sendDueDateReminder(toEmail, bookTitle, dueDate, borrowerName) {
  if (!transporter) {
    console.warn("[EmailService] Skipping due reminder — transporter not configured.");
    return { success: false, error: "Email not configured" };
  }

  console.log(`[EmailService] Sending due-date reminder → ${toEmail} (due ${dueDate})`);

  const formattedDue = formatDate(dueDate);

  const body = `
    <p style="font-size:0.95rem;color:#475569">Hi <strong>${esc(borrowerName)}</strong>,</p>
    <p style="font-size:0.95rem;color:#475569;margin-top:10px">
      This is a friendly reminder that your borrowed book is <strong>due tomorrow</strong>.
    </p>
    <div class="card">
      <h2>⏰ Return Reminder</h2>
      <div class="row"><span class="lbl">Book Title</span><span class="val">${esc(bookTitle)}</span></div>
      <div class="row"><span class="lbl">Due Date</span><span class="val hi">${formattedDue}</span></div>
      <div class="row"><span class="lbl">Fine if Late</span><span class="val">₱${FINE_PER_DAY}.00 per day</span></div>
    </div>
    <div class="alert yellow">
      ⚠️ Return by <strong>${formattedDue}</strong> to avoid fines.
      If you need more time, please visit the library to request a renewal.
    </div>
  `;

  return sendMail(
    toEmail,
    `⏰ Reminder: "${esc(bookTitle)}" is due tomorrow (${formattedDue})`,
    shell("#EEA23A", "#b87a1a", "⏰", "Due Date Reminder", `Your book is due tomorrow, ${esc(borrowerName)}!`, body)
  );
}

// ─────────────────────────────────────────────────────────
//  3. Overdue Notice  (called by schedulerService)
// ─────────────────────────────────────────────────────────
async function sendOverdueNotice(toEmail, bookTitle, dueDate, borrowerName, daysOverdue) {
  if (!transporter) {
    console.warn("[EmailService] Skipping overdue notice — transporter not configured.");
    return { success: false, error: "Email not configured" };
  }

  console.log(`[EmailService] Sending overdue notice → ${toEmail} (${daysOverdue} day(s) overdue)`);

  const formattedDue  = formatDate(dueDate);
  const currentFine   = daysOverdue * FINE_PER_DAY;

  const body = `
    <p style="font-size:0.95rem;color:#475569">Hi <strong>${esc(borrowerName)}</strong>,</p>
    <p style="font-size:0.95rem;color:#475569;margin-top:10px">
      Your borrowed book is now
      <strong>${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</strong>.
      Please return it to the library as soon as possible.
    </p>
    <div class="card" style="border-left-color:#c05a0a">
      <h2 style="color:#c05a0a">🚨 Overdue Notice</h2>
      <div class="row"><span class="lbl">Book Title</span><span class="val">${esc(bookTitle)}</span></div>
      <div class="row"><span class="lbl">Was Due On</span><span class="val">${formattedDue}</span></div>
      <div class="row"><span class="lbl">Days Overdue</span><span class="val" style="color:#c05a0a">${daysOverdue} day${daysOverdue !== 1 ? "s" : ""}</span></div>
      <div class="row"><span class="lbl">Current Fine</span><span class="val" style="color:#c05a0a;font-size:1.05rem">₱${currentFine.toFixed(2)}</span></div>
      <div class="row"><span class="lbl">Fine Rate</span><span class="val">₱${FINE_PER_DAY}.00 / day (accumulating)</span></div>
    </div>
    <div class="alert red">
      🚨 Your fine is currently <strong>₱${currentFine.toFixed(2)}</strong> and increases by
      ₱${FINE_PER_DAY}.00 every day. Please return the book immediately.
    </div>
  `;

  return sendMail(
    toEmail,
    `🚨 Overdue: "${esc(bookTitle)}" — ₱${currentFine.toFixed(2)} fine accrued`,
    shell("#c05a0a", "#8a3e06", "🚨", "Book Overdue Notice", `Please return your book immediately, ${esc(borrowerName)}.`, body)
  );
}

// ─────────────────────────────────────────────────────────
//  Shared HTML shell
// ─────────────────────────────────────────────────────────
function shell(accent, dark, icon, heading, sub, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f4f8;color:#333;padding:32px 16px}
  .wrap{max-width:560px;margin:0 auto}
  .hdr{background:linear-gradient(135deg,${accent},${dark});color:white;padding:36px 32px;border-radius:16px 16px 0 0;text-align:center}
  .hdr .ic{font-size:2.2rem;margin-bottom:10px}
  .hdr h1{font-size:1.3rem;font-weight:700;margin-bottom:6px}
  .hdr p{font-size:0.92rem;opacity:.9}
  .body{background:#fff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none}
  .card{background:#f8fafc;border-left:4px solid ${accent};border-radius:0 8px 8px 0;padding:18px 20px;margin:20px 0}
  .card h2{font-size:0.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:12px}
  .row{display:flex;gap:8px;margin-bottom:8px;font-size:0.88rem}
  .row:last-child{margin-bottom:0}
  .lbl{color:#64748b;min-width:120px;flex-shrink:0}
  .val{color:#1e293b;font-weight:600}
  .hi{font-size:1rem;font-weight:700;color:${accent}}
  .alert{border-radius:10px;padding:14px 18px;margin:20px 0;font-size:0.86rem;line-height:1.55}
  .green{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534}
  .yellow{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
  .red{background:#fff1f2;border:1px solid #fecaca;color:#991b1b}
  .btn{display:inline-block;background:${accent};color:white!important;text-decoration:none;font-weight:700;font-size:0.88rem;padding:12px 26px;border-radius:8px;margin-top:8px}
  .ft{text-align:center;font-size:0.76rem;color:#94a3b8;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0}
  hr{border:none;border-top:1px solid #e2e8f0;margin:20px 0}
</style></head>
<body><div class="wrap">
  <div class="hdr"><div class="ic">${icon}</div><h1>${heading}</h1><p>${sub}</p></div>
  <div class="body">
    ${bodyHtml}
    <hr>
    
    <div class="ft">
      <p><strong>${FROM_NAME}</strong></p>
      <p style="margin-top:4px">This is an automated message — please do not reply.</p>
    </div>
  </div>
</div></body></html>`;
}

// ─────────────────────────────────────────────────────────
//  Internal send + helpers
// ─────────────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from:    `"${FROM_NAME}" <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ [EmailService] Sent → ${to} | id: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ [EmailService] Failed → ${to} | ${err.message}`);
    return { success: false, error: err.message };
  }
}

/** "YYYY-MM-DD" or ISO string → "Month DD, YYYY" */
function formatDate(val) {
  if (!val) return "N/A";
  const str = String(val).slice(0, 10);
  const [y, m, d] = str.split("-").map(Number);
  const months = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  return `${months[m - 1]} ${d}, ${y}`;
}

/** Escape HTML special characters to prevent injection. */
function esc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

module.exports = { sendBorrowConfirmation, sendDueDateReminder, sendOverdueNotice };