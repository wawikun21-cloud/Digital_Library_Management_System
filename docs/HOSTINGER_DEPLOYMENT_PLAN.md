# Hostinger Single-Domain Deployment Plan

## Goal

Deploy the React client and Express server as one application on one Hostinger
domain. The browser should load the frontend and access the API, uploaded files,
and Socket.IO over that same origin. Do not commit deployment changes.

## Current setup

- `client/` is a React application built with Vite.
- `server/` is a CommonJS Express application that also hosts Socket.IO.
- The Vite development server proxies `/api`, `/uploads`, and `/socket.io` to
  port `3001`; those proxy rules are for local development only.
- Client API services now default to same-origin `/api` paths; Vite still proxies
  local development requests to port `3001`.
- Express serves the production Vite build and applies an SPA fallback to
  browser routes while preserving JSON API 404 responses.
- Uploads use `UPLOADS_DIR` with compatibility fallbacks for legacy files.
  Production storage persistence still needs configuration and verification.
- The application depends on MySQL, production environment configuration, and
  a long-running Node process for HTTP and Socket.IO.

## Deployment approach

Build the client into `client/dist` and have the Express application serve those
static files as well as its existing API, upload, and Socket.IO endpoints. Keep
all client requests same-origin in production, using relative paths such as
`/api` and `/socket.io`. Configure Hostinger to route the domain to the Node
application and provide its assigned port through `PORT`.

## Implementation steps

- [x] Implement a Hostinger-compatible Node app entry at the repository root
  with repeatable build/start commands. Hostinger plan availability and
  account-specific port/storage/proxy settings still need verification in
  hPanel; static-only hosting cannot run this server.
- [x] Unify production client API defaults to same-origin relative URLs while
  preserving local Vite development behavior.
- [x] Update Express production static-file serving and SPA fallback. Ensure
  `/api` endpoints and unknown API requests remain API responses rather than
  falling back to `index.html`.
- [x] Keep Socket.IO on the same HTTP server and document Hostinger/reverse-proxy
  WebSocket verification and polling fallback.
- [x] Resolve upload storage paths through `UPLOADS_DIR`; production persistence
  still requires configuring a durable directory in hPanel.
- [x] Document production values to configure through Hostinger environment settings,
  including database connection details, `SESSION_SECRET`, `NODE_ENV`,
  allowed origin, and email settings as needed. Do not deploy the local
  `server/.env` file or commit secrets.
- [x] Configure production startup to use a pre-provisioned MySQL database by
  default. Database provisioning and migration permissions still require
  validation in hPanel.
- [x] Add a repeatable build/start sequence that installs
  server dependencies, installs client dependencies, builds the client, and
  starts the server using Hostinger's configured port.
- [x] Add local tests for the built app routes, SPA deep links, API/upload 404s,
  and production build presence. Production authentication, database, uploads,
  reverse proxy, and Socket.IO still require live Hostinger smoke testing.
- [x] Document the Hostinger deployment configuration and operational notes in
  `HOSTINGER_DEPLOYMENT.md`.

## Acceptance criteria

- One domain serves both the frontend and backend; no second API domain or
  browser-visible backend port is required.
- Frontend API calls, uploaded files, and Socket.IO use the same origin.
- Client-side routes load on direct navigation and refresh without breaking
  API 404 behavior.
- Production database and upload data persist, and secrets are configured
  outside source control when the listed Hostinger settings are applied.
- Local build and route tests succeed; production-specific smoke checks must be
  run on the configured Hostinger application.
