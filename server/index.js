// ─────────────────────────────────────────────────────────
//  Lexora Backend  —  index.js
//  Express + MySQL Database
// ─────────────────────────────────────────────────────────
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");

const booksRouter = require("./routes/books");
const transactionsRouter = require("./routes/transactions");
const { initDatabase, testConnection } = require("./config/db");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────
app.use("/api/books", booksRouter);
app.use("/api/transactions", transactionsRouter);

// ── Health check ─────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status:          dbStatus ? "ok" : "db_error",
    timestamp:       new Date().toISOString(),
    database:        dbStatus ? "✅ connected" : "❌ disconnected",
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
    // Initialize database (create tables if not exist)
    await initDatabase();
    
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error("⚠️  Warning: Could not connect to MySQL database");
    }

    app.listen(PORT, () => {
      console.log(`\n🚀  Lexora server     →  http://localhost:${PORT}`);
      console.log(`🗄️  Database          →  MySQL (lexora)`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
