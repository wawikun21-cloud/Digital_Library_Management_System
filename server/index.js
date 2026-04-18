// ─────────────────────────────────────────────────────────
//  server/index.js
//  Entry point — Express app + Socket.io server
// ─────────────────────────────────────────────────────────

require("dotenv").config();
const http    = require("http");
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const session = require("express-session");

const { initDatabase, testConnection } = require("./config/db");
const { initSocket }                   = require("./utils/websocket");

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

// ── Analytics controller (for the /api/books/stats shortcut) ──
const AnalyticsController = require("./controllers/analyticsController");

const app    = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Session ───────────────────────────────────────────────
app.use(session({
  name:   "lexora.sid",
  secret: process.env.SESSION_SECRET || "lexora-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   1000 * 60 * 60 * 8, // 8 hours
  },
}));

// ── Static uploads ────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
  await initDatabase();
  await testConnection();

  // Attach Socket.io AFTER http.createServer
  initSocket(server);

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