// ─────────────────────────────────────────────────────────
//  server/config/email.js
//
//  Nodemailer transport config — reads from process.env.
//  Consumed by services/emailService.js.
//
//  Required .env keys:
//    GMAIL_USER         your-gmail@gmail.com
//    GMAIL_APP_PASSWORD 16-char app password (no spaces)
//    EMAIL_FROM_NAME    Display name in From: field (optional)
// ─────────────────────────────────────────────────────────

module.exports = {
  service:  "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  fromName: process.env.EMAIL_FROM_NAME || process.env.APP_NAME || "Digital Library",
};
