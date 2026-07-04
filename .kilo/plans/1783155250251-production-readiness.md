# Production Readiness TODO Plan

## Overview
This plan addresses the critical issues preventing the Digital Library Management System from being production-ready. Tasks are ordered by priority (security first).

## 🔴 CRITICAL - Security (Must fix before any deployment)

### Task 1: Remove hardcoded default admin credentials ✅ COMPLETED
- **File**: `server/config/db.js`
- **Changes**: 
  - ✅ Added environment variables `DEFAULT_ADMIN_USERNAME` and `DEFAULT_ADMIN_PASSWORD`
  - ✅ In production: If env vars not set, no admin is created (manual creation required)
  - ✅ In development: Still creates `admin/admin123` for convenience
- **Validation**: ✅ Verified - hardcoded credentials only in dev mode

### Task 2: Fix fallback session secret ✅ COMPLETED
- **File**: `server/index.js:48`
- **Changes**:
  - ✅ Added production check - exits if `SESSION_SECRET` not set
  - ✅ Dev mode shows warning in logs
- **Validation**: ✅ Server refuses to start in production without SESSION_SECRET

### Task 3: Remove real credentials from `.env.example` ✅ COMPLETED
- **File**: `server/.env.example`
- **Changes**:
  - ✅ All email credentials are empty/placeholder values
  - ✅ Added documentation comments for all required vars
- **Validation**: ✅ Verified - no real credentials in `.env.example`

### Task 4: Add security headers middleware ✅ COMPLETED
- **File**: `server/index.js`
- **Changes**:
  - ✅ Installed `helmet` package
  - ✅ Added `app.use(helmet())` after cors middleware
- **Validation**: ✅ Security headers present in all responses

---

## 🟡 HIGH - Authentication & Authorization

### Task 5: Add CSRF protection ✅ COMPLETED
- **File**: `server/routes/auth.js`
- **Changes**:
  - ✅ Installed `csurf` package
  - ✅ Added CSRF token endpoint `/api/auth/csrf-token`
  - ✅ Applied CSRF protection to logout and profile update endpoints
  - Note: Login is intentionally NOT CSRF-protected (no session exists yet)
- **Validation**: ✅ CSRF token required for authenticated state-changing routes

### Task 6: Add password reset flow
- **Files**: New `server/routes/auth.js` endpoints, `server/controllers/authController.js`
- **Changes**:
  - [ ] Add POST `/api/auth/forgot-password` - accepts email, generates reset token, emails link
  - [ ] Add POST `/api/auth/reset-password` - validates token, sets new password
  - [ ] Add reset token storage (temporary table or cache with expiry)
  - [ ] Add email service integration (already has nodemailer configured)
- **Validation**: User can reset password via email

### Task 7: Validate RFID endpoint accessibility ✅ COMPLETED
- **File**: `server/routes/rfid.js:52`
- **Changes**:
  - ✅ Added IP whitelist middleware via `RFID_ALLOWED_IPS` env var
  - ✅ Rate limiting already in place (20/min/IP)
  - ✅ In production with whitelist: only whitelisted IPs can access
  - ✅ In development or without whitelist: all IPs allowed (rate-limited)
- **Decision made**: Endpoint is public by default but can be IP-restricted via env var

---

## 🟢 MEDIUM - Infrastructure & Deployment

### Task 8: Add production process manager ✅ PARTIALLY COMPLETED
- **File**: Updated `server/package.json`
- **Changes**:
  - ✅ Added `"start:prod": "node index.js"` script
  - [ ] Create `server/pm2.config.js` for PM2 configuration
- **Validation**: `npm run start:prod` runs the server in production mode

### Task 9: Add HTTPS/TLS configuration
- **File**: `docs/DEPLOYMENT.md`
- **Changes**:
  - ✅ Documented reverse proxy (Nginx) approach for HTTPS
  - ✅ Documented Node.js HTTPS option (not recommended)
- **Decision made**: Recommend using reverse proxy (Nginx/Apache) for HTTPS

### Task 10: Add environment validation ✅ COMPLETED
- **File**: Created `server/config/env.js`
- **Changes**:
  - ✅ Created environment validation script
  - ✅ Checks required vars in production: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SESSION_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  - ✅ Warns about GMAIL_APP_PASSWORD with spaces
  - ✅ Added to `server/index.js` startup (fails fast on missing vars)
- **Validation**: ✅ Server refuses to start with missing required env vars

---

## 🟠 LOW - Code Quality & Monitoring

### Task 11: Replace console.log with proper logger
- **Files**: All server files with console statements
- **Changes**:
  - [ ] Install `winston` or `pino`
  - [ ] Create logger utility
  - [ ] Replace `console.log/warn/error` with logger calls
  - [ ] Add log levels, timestamps, log rotation
- **Validation**: All console statements replaced, logs go to file or stdout properly

### Task 12: Fix frontend feature flags ✅ COMPLETED
- **File**: `client/src/constants/index.js:84-90`
- **Changes**:
  - ✅ Changed feature flags to read from `import.meta.env.VITE_ENABLE_*`
  - ✅ Feature flags default to `false` when env var not set or not "true"
- **Validation**: ✅ Feature flags work from `.env` file

### Task 13: Add tests
- **Files**: Create `server/tests/`, `client/tests/`
- **Changes**:
  - [ ] Install Jest, React Testing Library
  - [ ] Add basic auth tests (login, session check, role access)
  - [ ] Add API integration tests
  - [ ] Add frontend component tests for critical pages
- **Validation**: Test suite passes with `npm test`

---

## 🏗️ Deployment Preparation

### Task 14: Clean up `.env` and verify gitignore ✅ COMPLETED
- **Files**: `.gitignore`, `server/.env`
- **Changes**:
  - ✅ `server/.env` in gitignore
  - ✅ Real credentials removed from `server/.env` (replaced with placeholders)
  - ✅ `.env.example` has all required keys documented
- **Validation**: ✅ Only `.env.example` shipped, no real secrets in repo

### Task 15: Create deployment documentation ✅ COMPLETED
- **File**: Created `docs/DEPLOYMENT.md`
- **Changes**:
  - ✅ Documented environment setup
  - ✅ Documented build and start commands
  - ✅ Documented SSL/TLS configuration (reverse proxy approach)
  - ✅ Added security checklist
- **Validation**: ✅ Clear deployment guide exists

---

## Resolved Items (from Open Questions)

1. **RFID Endpoint**: ✅ Endpoint is public by default with rate limiting (20/min/IP) and optional IP whitelist via `RFID_ALLOWED_IPS` env var

2. **HTTPS**: ✅ Documented reverse proxy (Nginx) approach in `docs/DEPLOYMENT.md`. Recommended for Hostinger.

3. **Email service**: Uses Gmail App Passwords (documented in `.env.example` with setup instructions)

4. **Database**: Uses standard MySQL connection - host-specific configuration via env vars

5. **File storage**: Avatars stored as base64 in database (documented approach, can be changed later)

---

## Implementation Summary

### Completed (Ready for Production Review):
- ✅ Tasks 1-4 (Critical security fixes)
- ✅ Tasks 5, 7, 10, 12, 14-15 (Security middleware and deployment prep)

### Remaining:
- ⏳ Task 6: Password reset flow
- ⏳ Task 8: PM2 ecosystem config file
- ⬜ Task 11: Proper logging (winston/pino)
- ⬜ Task 13: Test suite

---

## Suggested Task Order

1. Tasks 1-2 (Critical security fixes) - **BLOCKER**
2. Task 3 (Remove real credentials) - **BLOCKER** 
3. Tasks 4-5 (Security middleware) - **HIGH**
4. Tasks 6-7 (Auth improvements) - **MEDIUM**
5. Tasks 8-10 (Infrastructure) - **MEDIUM**
6. Tasks 11-13 (Code quality) - **LOW**
7. Tasks 14-15 (Deployment prep) - **FINAL**