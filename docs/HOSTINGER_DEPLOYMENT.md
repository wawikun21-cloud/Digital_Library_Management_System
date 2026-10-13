# Deploy Lexora to Hostinger on one domain

This setup serves the Vite-built React application, Express API, uploaded media,
and Socket.IO from the same Node.js process and domain.

## Check the Hostinger product first

Use a Hostinger plan/product that supports a persistent Node.js web application,
Node.js 20 or newer, custom environment variables, writable persistent storage,
and WebSocket connections. Shared/static-only hosting cannot run this Express
server and Socket.IO process. Exact Node.js app availability and controls vary
by Hostinger plan and account; verify these requirements in hPanel before
deploying.

## Configure the application

1. Deploy the complete repository, not just `client/` or `server/`. Set the
   application root to the repository root.
2. Set the build command to `npm run build`. The build installs the client and
   production server dependencies, then creates the production client bundle in
   the repository-root `dist/` directory. That folder is served **by the Express
   process itself** (see `server/middleware/frontend.js`), so it is build output
   for the app, not a static-sitedestination.
3. **This is a Node.js web application — not a static site.** In hPanel set:
   - **Application / deployment type:** Node.js web application.
   - **Entry file (startup file):** `index.js` (repository root).
     `server/index.js` also works if the field accepts a nested path.
   - **Leave the Output directory EMPTY. Do NOT set it to `dist`.**
     Setting an output directory is what tells Hostinger to run the static-site
     path: it copies `dist/` into `public_html` and finishes the deployment
     without ever starting a Node process. The build log for that mistake looks
     like `Application type: not specified`, `Entry file: none`,
     `Output directory: dist`, and a `Syncing public_html` publish step — there
     is no `Server running on port ...` line and `/api/health` never answers.
   - **Start command (if the form has one):** `npm start`.
   Node.js 20 or newer. Do not expose port 3001 in public URLs; the
   Hostinger domain/reverse proxy should route HTTP and WebSocket traffic to the
   Node application. Hostinger must supply `PORT` to the process.

   Verify in the build log that the deployment was treated as an application.
   The `==> Preparing build` block must show an entry file and a Node.js
   application type; a `Syncing public_html` step means it was published as
   static files and the server never started.
4. Create a MySQL database and database user in hPanel. Grant the user access
   to that database, including the table/index/alter privileges needed for the
   application's schema setup and migrations. The production app connects
   directly to this pre-created database and does not create databases.
5. Configure these server environment variables in hPanel (not in a committed
   `.env` file):

   | Variable | Production value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `PORT` | Set by Hostinger; do not hard-code a public port |
   | `CLIENT_ORIGIN` | Exact public origin, e.g. `https://library.example.com`, no trailing slash |
   | `DB_HOST` | Hostinger's MySQL hostname |
   | `DB_PORT` | Hostinger's MySQL port, usually `3306` |
   | `DB_USER` | Database user created in hPanel |
   | `DB_PASSWORD` | Database user's password |
   | `DB_NAME` | Database created in hPanel |
   | `DB_CREATE_DATABASE` | `false` |
   | `SESSION_SECRET` | Long, unique, randomly generated secret |
   | `UPLOADS_DIR` | Absolute writable directory outside deploy/release folders |
   | `RUN_MIGRATIONS` | Controls startup schema changes (see note). Default when unset runs migrations |
   | `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Optional; set both to enable email |

   If email is unused, leave both Gmail variables unset; the server logs that
   email is disabled. `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD`
   are optional first-install values. Otherwise create an initial account
   through the project's established administration process.

   **Migration behavior (important):** `initDatabase()` runs `migrateSchema()`
   unless `RUN_MIGRATIONS=false` (case-insensitive). The check is
   `String(RUN_MIGRATIONS).toLowerCase() !== "false"`, so migrations run by
   **default on every boot**, including when the variable is unset or set to
   `true`. Only set `RUN_MIGRATIONS=false` when you have applied schema changes
   out-of-band and want the server to skip startup migrations; otherwise leave
   it unset or set it to `true`. Each individual `ALTER`/`CREATE` in
   `migrateSchema` is wrapped in try/catch and tolerates already-applied
   states (`errno` 1091/1060/1054/1061/1292 are logged as
   `⏭️ Already applied`), so re-running is safe.

   If you do **not** see `✅ Database initialization complete` (and per-statement
   `✅ Migration:` / `⏭️ Already applied:` logs) in the Hostinger application
   logs, the server did not reach `initDatabase()` — most commonly because the
   build failed (see output directory) or because `validateEnv()` exited on a
   missing required variable before startup proceeded.
6. Leave `VITE_API_URL` **completely unset** in the Hostinger application
   environment for this single-domain deployment. Client API calls use
   relative `/api` paths, and Socket.IO connects to the current origin at
   `/socket.io`. The repository provides `client/.env.production` with an
   empty `VITE_API_URL` so the build is explicit rather than accidental.

   **Important:** a `VITE_`-prefixed variable set in the application
   environment is injected into the production bundle at build time and
   **overrides** `client/.env.production`. This was verified in this repo.
   A stray `VITE_API_URL` therefore silently repoints every API call, upload
   URL, and Socket.IO connection to another origin. Do not define one unless
   you are deliberately running a split frontend/API deployment, in which case
   set it to the API base URL including `/api`.

   `VITE_ENABLE_*` flags in that file are currently inert — `FEATURES` in
   `client/src/constants/index.js` is exported but read by no module.
7. Configure HTTPS for the domain. Cookies are secure in production and use
   same-site `Lax`, which is appropriate for the same-domain app. Express trusts
   one reverse-proxy hop; verify this matches the Hostinger proxy arrangement.

## Files in the repository

| File | Committed | Purpose |
| --- | --- | --- |
| `client/.env.production` | Yes | Production build config (empty `VITE_API_URL` + feature flags). No secrets. |
| `server/.env.production.example` | Yes | Checklist of every variable the production app reads. |
| `client/.env.frontend` | Yes | Reference for frontend variables. |
| `server/.env.example` | Yes | Development template. |
| `server/.env` | Yes (legacy) | Local dev values only. See the rotation note below. |

`server/.env.production` and `*.local` variants are gitignored, so a real
production env can be kept locally without being committed.

### Rotate the committed session secret

`server/.env` is tracked in git (a `.gitignore` entry does not apply to a file
that was already tracked) and contains a real `SESSION_SECRET`. It is harmless
only because its other values are local dev settings, but the committed secret
must not be reused in production:

```
git rm --cached server/.env    # untrack; keeps your working copy
```

Then set a freshly generated `SESSION_SECRET` in hPanel. Anyone with repository
access already has the committed value, so treating it as secret would be
wrong even for non-production use.

## Upload storage and database operations

- Use an absolute `UPLOADS_DIR` on writable storage that survives app
  redeployments and restarts. Do not use `client/dist`, a temporary directory,
  or a deployment release directory. Back up this directory along with MySQL.
- New and temporary uploads are stored under `UPLOADS_DIR`. Existing files in
  `server/uploads` and older Lexora files under the repository-level
  `uploads/lexora-books` directory continue to be served as compatibility
  fallbacks. Move legacy uploads into the persistent directory before removing
  the old copies.
- The server creates application tables and optionally applies migrations at
  startup. Back up the database before deploying a schema change. Grant the
  database user the required DDL permissions; set `RUN_MIGRATIONS=false` only
  when migrations have been applied separately.
- Express's default in-memory session store is not durable. A server restart or
  redeployment invalidates active login sessions, so users may need to sign in
  again.

## Deploy and smoke-test

After setting environment variables and the Hostinger build/start commands,
deploy and verify the following on the public HTTPS domain:

1. `GET https://your-domain.example/api/health` returns JSON with
   `"status":"ok"`.
2. `/` and a client route (for example `/login`) load the React app; refreshing
   `/login` continues to load the app.
3. `/api/this-route-does-not-exist` returns a JSON 404, not the React HTML.
4. Sign in and verify authenticated API requests and CSRF-protected actions;
   confirm cookies are `Secure`, `HttpOnly`, and same-site.
5. Verify a database-backed read/write flow using non-production test data.
6. Upload a supported file, confirm it is served from `/uploads/...`, restart
   or redeploy, and confirm the file remains available.
7. Verify Socket.IO connects via the same origin and that live updates work.
   If it fails, confirm Hostinger supports WebSocket upgrades for the
   application; polling fallback is also enabled.

The repository can validate the build and frontend/API route behavior locally
with `npm run build` and `npm run test:deployment`. Testing the live database,
Hostinger's reverse proxy, WebSocket upgrades, and persistent hosting storage
requires the actual Hostinger application and credentials.

## Troubleshooting: build succeeds but the server never starts

A green build only proves `npm run build` worked. It says nothing about whether
a Node process was started. Use the `==> Preparing build` block of the build log
to tell the two outcomes apart:

| Symptom in the build log | Meaning | Fix |
| --- | --- | --- |
| `Application type: not specified` / `Entry file: none` and a `Syncing public_html` publish step | Deployed as a **static site**. `dist/` was copied into `public_html`; no Node process exists. | Set application type to Node.js web application, set the entry file to `index.js`, and **clear the output directory**. |
| An entry file is shown, no `Server running on port ...` line, and no `✅ Environment validation passed` | The Node process started but exited. | Read the runtime logs for the exit reason (below). |
| `✅ Environment validation passed` but `❌ Database initialization failed` | Started, but MySQL is unreachable or the user lacks privileges. | Check `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` and the Hostinger Remote MySQL IP whitelist. |

Common exit reasons in order:

1. **`❌ Environment validation failed: Missing required env var: ...`** — the
   required variables in step 5 are not set in hPanel. Note that the committed
   `server/.env` is development-only and is never read in production.
2. **`Access denied for user ...`** — wrong credentials, or the Hostinger
   Remote MySQL whitelist does not include the app server's IP.
3. **`Client build not found at .../dist`** — `registerFrontendRoutes` refuses to
   start in production without the bundle, because a missing build otherwise
   degrades into a silent 404 site instead of an obvious failure. Run
   `npm run build` in the release before starting the app.
4. **No output at all** — the deployment is on the static path (first row of the
   table). The Node process is never invoked, not crashing.

## Schema bootstrap invariants

`server/config/db.js` creates the schema on first boot. Two invariants make that
bootstrap safe on any managed MySQL/MariaDB host — do not remove them:

1. **Every `CREATE TABLE` pins `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
   COLLATE=utf8mb4_unicode_ci`.** Without it, tables are created with the
   server's default storage engine. Some hosts default to MyISAM, where
   `CREATE TABLE users ... UNIQUE KEY uk_users_email (email)` exceeds the
   1000-byte key limit and fails with `ER_TOO_LONG_KEY` (1071) — `initDatabase()`
   throws, the process exits, and no migrations run. MyISAM also silently drops
   the schema's foreign keys.
2. **Index columns must exist.** `trash_log`'s `INDEX idx_expires (expires_at)`
   references a column declared two lines above; a typo there fails the whole
   `CREATE TABLE` (logged as a non-fatal `⚠️ Migration warning`) and the table is
   silently missing at runtime.
