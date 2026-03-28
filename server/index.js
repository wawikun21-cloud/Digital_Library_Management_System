// ─────────────────────────────────────────────────────────
//  Lexora Backend  —  index.js
//  Express + MySQL Database
// ─────────────────────────────────────────────────────────
require("dotenv").config();

const express      = require("express");
const cors         = require("cors");
const session      = require("express-session");

const booksRouter        = require("./routes/books");
const transactionsRouter = require("./routes/transactions");
const attendanceRouter = require("./routes/attendance");
const studentsRouter = require("./routes/students");
const authRouter         = require("./routes/auth");
const { initDatabase, testConnection } = require("./config/db");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true, // required for sessions with CORS
}));

app.use(express.json({ limit: '1000kb' }));


// ── Session ──────────────────────────────────────────────
app.use(session({
  name:   "lexora.sid",
  secret: process.env.SESSION_SECRET || "lexora-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   false, // set true if using HTTPS in production
    maxAge:   1000 * 60 * 60 * 8, // 8 hours
  },
}));

// ── Routes ───────────────────────────────────────────────
app.use("/api/auth",         authRouter);
app.use("/api/books",        booksRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/students", studentsRouter);

// ── Health check ─────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status:    dbStatus ? "ok" : "db_error",
    timestamp: new Date().toISOString(),
    database:  dbStatus ? "✅ connected" : "❌ disconnected",
  });
});

// ── 404 fallback ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Global error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ── Start ────────────────────────────────────────────────
async function startServer() {
  try {
    await initDatabase();

    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("⚠️  Warning: Could not connect to MySQL database");
    }

    app.listen(PORT, () => {
      console.log(`\n🚀  Lexora server     →  http://localhost:${PORT}`);
      console.log(`🗄️  Database          →  MySQL (lexora)`);
      console.log(`🔐  Auth              →  Session-based (no JWT)`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();