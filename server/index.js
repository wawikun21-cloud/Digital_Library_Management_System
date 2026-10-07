  // ─────────────────────────────────────────────────────────
//  server/index.js
//  Entry point — Express app + Socket.io server
//
//  CHANGES:
//    • SECURITY FIX: express-session middleware is now shared with
//      Socket.io via io.engine.use(). This populates socket.request.session
//      on every WS handshake so websocket.js can verify user.role
//      server-side before admitting a socket to the "admins" room.
//      Without this, socket.request.session was always undefined.
// ─────────────────────────────────────────────────────────

require("dotenv").config();
const http    = require("http");
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const path    = require("path");
const session = require("express-session");

const { initDatabase, testConnection } = require("./config/db");
const { initSocket, getIO }            = require("./utils/websocket");
const { validateEnv }                  = require("./config/env");
const rateLimit                        = require("express-rate-limit");

// ── Routes ────────────────────────────────────────────────
const authRoutes         = require("./routes/auth");
const booksRoutes        = require("./routes/books");
const transactionRoutes  = require("./routes/transactions");
const attendanceRoutes   = require("./routes/attendance");
const studentsRoutes     = require("./routes/students");
const analyticsRoutes    = require("./routes/analytics");
const searchRoutes       = require("./routes/search");
const trashRoutes        = require("./routes/trash");
const auditRoutes        = require("./routes/audit");
const rfidRoutes         = require("./routes/rfid");
const coursesRoutes      = require("./features/courses/courses.routes");
const coursesBuilderRoutes = require("./features/courses/builder.routes");

// ── Analytics controller (for the /api/books/stats shortcut) ──
const AnalyticsController = require("./controllers/analyticsController");

const app    = express();

// Trust Hostinger's reverse proxy — required so Express knows the
// original connection was HTTPS (needed for secure cookies) and so
// express-rate-limit can correctly read X-Forwarded-For.
app.set("trust proxy", 1);

const server = http.createServer(app);

// ── Session ───────────────────────────────────────────────
//
// Defined BEFORE initSocket() so we can share this exact instance
// with Socket.io's engine middleware below.
const sessionMiddleware = session({
  name:   "lexora.sid",
  secret: process.env.SESSION_SECRET || "dev-secret-warning-set-SESSION_SECRET",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge:   1000 * 60 * 60 * 8,
  },
});

// ── CSRF Protection — defined in routes/auth.js
// (csurf is applied per-route since routes/auth.js needs it)

// ── Middleware ────────────────────────────────────────────
//
// Strip any trailing slash from the configured origin — a mismatched
// trailing slash (e.g. "https://foo.com/" vs "https://foo.com") makes
// the browser reject the preflight response outright.
const CLIENT_ORIGIN = (
  process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173"
).replace(/\/$/, "");

app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

// ── Static uploads ────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Global API rate limiter ───────────────────────────────
//
// Backstop for ALL /api/* routes — prevents runaway scripts or
// misconfigured clients from saturating the server.
// Per-endpoint limiters (e.g. rfid/tap) are stricter and apply first;
// this catches everything else.
//
// 200 req/min is generous for a library management system but firm
// enough to blunt naive flood attacks.
const isDevelopment = process.env.NODE_ENV !== "production";
const globalApiLimiter = rateLimit({
  windowMs:        60 * 1000,  // 1-minute window
  max:             isDevelopment ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => {
    // Never rate-limit health checks — uptime monitors would false-positive
    return req.path === "/api/health";
  },
  handler: (req, res) => {
    console.warn(`[RateLimit] Global API flood from ${req.ip} — ${req.method} ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down.",
    });
  },
});
app.use("/api/", globalApiLimiter);

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/books",        booksRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/attendance",   attendanceRoutes);
app.use("/api/students",     studentsRoutes);
app.use("/api/analytics",    analyticsRoutes);
app.use("/api/search",       searchRoutes);
app.use("/api/suggestions",  searchRoutes);   // convenience alias
app.use("/api/trash",        trashRoutes);
app.use("/api/audit",        auditRoutes);
app.use("/api/rfid",         rfidRoutes);
app.use("/api/courses",      coursesBuilderRoutes);
app.use("/api/courses",      coursesRoutes);

// KPI stats shortcut — keeps existing Dashboard fetch URL working
app.get("/api/books/stats", AnalyticsController.getBookStats);

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Express error]", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

async function start() {
  validateEnv();

  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === "production") {
    console.error("❌ SESSION_SECRET is required in production. Set it in .env and restart.");
    process.exit(1);
  }

  await initDatabase();
  await testConnection();

  // Attach Socket.io AFTER http.createServer
  initSocket(server);

  // SECURITY FIX: Share the Express session middleware with Socket.io's
  // underlying engine so that socket.request.session is populated on
  // every WebSocket handshake. This is what allows websocket.js to read
  // socket.request.session.user.role when a client emits "join:admin".
  //
  // Must be called AFTER initSocket() so getIO() returns the live instance.
  const io = getIO();
  io.engine.use(sessionMiddleware);

  // Start email + maintenance scheduler — runs after DB is confirmed ready
  require("./services/schedulerService").start();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 WebSocket (Socket.io) ready on port ${PORT}`);
  });
}

start().catch(err => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});