// ─────────────────────────────────────────────────────────
//  email-test.js  — drop in server/ folder and run:
//    node email-test.js
// ─────────────────────────────────────────────────────────

require("dotenv").config();          // loads server/.env
const nodemailer = require("nodemailer");

async function main() {
  const USER = process.env.GMAIL_USER;
  const PASS = process.env.GMAIL_APP_PASSWORD;

  console.log("\n══════════════════════════════════════════");
  console.log("  Email Diagnostics");
  console.log("══════════════════════════════════════════\n");

  // ── Step 1: .env values ─────────────────────────────
  console.log("Step 1 — Checking .env values...");
  if (!USER) {
    console.error("  ❌ GMAIL_USER is not set in .env");
    console.error("     Add:  GMAIL_USER=your-gmail@gmail.com\n");
    process.exit(1);
  }
  if (!PASS) {
    console.error("  ❌ GMAIL_APP_PASSWORD is not set in .env");
    console.error("     Add:  GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx\n");
    console.error("  How to get an App Password:");
    console.error("  1. https://myaccount.google.com/security");
    console.error("  2. Enable 2-Step Verification");
    console.error("  3. Search 'App Passwords' → Mail → Generate");
    console.error("  4. Copy the 16-char code into .env\n");
    process.exit(1);
  }

  const cleanPass = PASS.replace(/\s/g, "");
  console.log(`  ✅ GMAIL_USER         = ${USER}`);
  console.log(`  ✅ GMAIL_APP_PASSWORD = ${"*".repeat(cleanPass.length)} (${cleanPass.length} chars)`);

  if (cleanPass.length !== 16) {
    console.warn(`\n  ⚠️  App Password should be 16 chars. Yours is ${cleanPass.length}.`);
    console.warn("     Double-check you copied it correctly.\n");
  }

  // ── Step 2: Build transporter ───────────────────────
  console.log("\nStep 2 — Building transporter...");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: USER, pass: PASS },
  });
  console.log("  ✅ Transporter created");

  // ── Step 3: Verify SMTP connection ──────────────────
  console.log("\nStep 3 — Verifying SMTP connection...");
  try {
    await transporter.verify();
    console.log("  ✅ SMTP connection OK — Gmail accepted credentials");
  } catch (err) {
    console.error("  ❌ SMTP connection FAILED");
    console.error(`     ${err.message}\n`);
    if (err.message.includes("Invalid login") || err.message.includes("Username and Password")) {
      console.error("  → You are using your REAL Gmail password.");
      console.error("    Gmail requires an App Password for SMTP.");
      console.error("    Generate one at: https://myaccount.google.com/apppasswords\n");
    }
    if (err.message.includes("2-Step")) {
      console.error("  → 2-Step Verification is not enabled on this account.");
      console.error("    Enable it first, then generate an App Password.\n");
    }
    process.exit(1);
  }

  // ── Step 4: Send test email ──────────────────────────
  console.log(`\nStep 4 — Sending test email to ${USER}...`);
  try {
    const info = await transporter.sendMail({
      from:    `"Library Test" <${USER}>`,
      to:      USER,
      subject: "✅ Email Test — Library System",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#32667F">✅ Email is working!</h2>
          <p>Your library email system is configured correctly.</p>
          <table style="border-collapse:collapse;width:100%;margin-top:16px;font-size:0.9rem">
            <tr style="background:#f8fafc">
              <td style="padding:8px 12px;font-weight:bold;color:#64748b;width:130px">Sent from</td>
              <td style="padding:8px 12px">${USER}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:bold;color:#64748b">Timestamp</td>
              <td style="padding:8px 12px">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="margin-top:20px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;
             border-radius:8px;color:#166534;font-size:0.88rem">
            Borrow confirmations, due-date reminders, and overdue notices will all work.
          </p>
        </div>
      `,
    });
    console.log(`  ✅ Email sent!`);
    console.log(`     Message ID : ${info.messageId}`);
    console.log(`     Response   : ${info.response}`);
    console.log(`\n  📬 Check inbox at ${USER}`);
    console.log("     Also check Spam / All Mail if not visible.\n");
  } catch (err) {
    console.error("  ❌ Send FAILED");
    console.error(`     ${err.message}\n`);
    if (err.message.includes("quota")) {
      console.error("  → Gmail daily sending limit reached (500/day).");
    }
    process.exit(1);
  }

  console.log("══════════════════════════════════════════");
  console.log("  All checks passed ✅");
  console.log("══════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌ Unexpected error:", err.message);
  process.exit(1);
});