// ─────────────────────────────────────────────────────────
//  config/env.js
//  Environment variable validation for production
// ─────────────────────────────────────────────────────────

function validateEnv() {
  const errors = [];

  // Required in production
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "SESSION_SECRET",
    "GMAIL_USER",
    "GMAIL_APP_PASSWORD",
  ];

  if (process.env.NODE_ENV === "production") {
    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required env var: ${key}`);
      }
    }
  }

  // Warn if GMAIL_APP_PASSWORD looks like it has spaces (App Passwords are 16 chars without spaces)
  if (process.env.GMAIL_APP_PASSWORD && process.env.GMAIL_APP_PASSWORD.includes(" ")) {
    console.warn("⚠️ GMAIL_APP_PASSWORD appears to have spaces — App Passwords should be 16 characters without spaces");
  }

  if (errors.length > 0) {
    console.error("❌ Environment validation failed:\n" + errors.map(e => `  • ${e}`).join("\n"));
    process.exit(1);
  }

  console.log("✅ Environment validation passed");
}

module.exports = { validateEnv };