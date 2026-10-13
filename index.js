// ─────────────────────────────────────────────────────────
//  index.js — repository-root entry point
//
//  WHY THIS FILE EXISTS
//  -------------------
//  Hostinger's Node.js application runner needs an entry file. Depending on
//  how the application is configured in hPanel it runs either:
//    • `node index.js`   (root entry — this file), or
//    • `node server/index.js` (the server package's entry point)
//
//  Either path must work. The application type in hPanel must be a **Node.js
//  web application** — if it is set to a static site (Output directory: dist,
//  no entry file) Hostinger only copies `dist/` into `public_html` and never
//  starts a Node process, so the API never runs.
//
//  The real application lives in server/index.js. Starting it from here also
//  guarantees NODE_ENV is production, which turns on the env-var validation
//  gate in server/config/env.js and stops the committed development server/.env
//  from masking a missing Hostinger variable with a localhost value.
//
//  Nothing else belongs in this file — it is a two-line shim, not a place for
//  application logic.
// ─────────────────────────────────────────────────────────

process.env.NODE_ENV = process.env.NODE_ENV || "production";

require("./server/index.js");
