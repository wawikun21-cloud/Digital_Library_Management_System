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
2. Set the build command to `npm run build` and the start command to
   `npm start`. The build installs the client and production server
   dependencies, then creates the production client bundle in the
   repository-root `dist/` directory (this is the "Output directory" you set
   in step 3 of Hostinger's deploy config). The start command runs the
   Express/Socket.IO server.
3. Set the Hostinger **Output directory** to `dist` (repository root), since
   the build script emits the production client bundle there.
   Select Node.js 20 or newer. Do not expose port 3001 in public URLs; the
   Hostinger domain/reverse proxy should route HTTP and WebSocket traffic to the
   Node application. Hostinger must supply `PORT` to the process.
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
   | `RUN_MIGRATIONS` | `true` for a planned schema upgrade; see migration warning below |
   | `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Optional; set both to enable email |

   If email is unused, leave both Gmail variables unset; the server logs that
   email is disabled. `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD`
   are optional first-install values. Otherwise create an initial account
   through the project's established administration process.
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
