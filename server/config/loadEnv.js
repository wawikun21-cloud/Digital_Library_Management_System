// server/config/loadEnv.js
// Focused loader for environment variables used at startup.
//
// WHY THIS EXISTS:
// The committed `server/.env` holds local-development values only
// (DB_HOST=localhost, DB_PASSWORD="", CLIENT_ORIGIN=http://localhost:5173,
// and a real SESSION_SECRET). When this file is loaded in PRODUCTION it masks
// a missing Hostinger/hPanel variable with a localhost value — `validateEnv`
// then passes (the value is non-empty) but `initDatabase` later crashes
// (e.g. ECONNREFUSED 127.0.0.1:3306) instead of failing fast on the missing
// var. Operators end up with a server that never reaches
// `migrateSchema()` and no migration logs at all.
//
// RULE: production never reads the committed `.env`. It uses real process
// environment variables (Hostinger application env) and, optionally, an
// explicit `server/.env.production` file (gitignored) that an operator ships
// if they prefer file-based production config.
//
// Existing process.env entries are never overridden, so real environment
// variables always win regardless of which file (if any) is loaded.
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const filename = isProduction ? ".env.production" : ".env";
  // Resolve from the server root (this file lives in server/config/, so the
  // server root is one level up). Resolving explicitly — instead of relying on
  // process.cwd() — makes loading correct regardless of where `node` is launched.
  const filepath = path.join(__dirname, "..", filename);
  if (fs.existsSync(filepath)) {
    // `path`-scoped config does not touch unrelated files.
    dotenv.config({ path: filepath });
  }
  // In production with no .env.production present, NO .env is loaded: the
  // process relies entirely on its environment variables.
  return filepath;
}

module.exports = { loadEnv };
