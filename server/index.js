// ─────────────────────────────────────────────────────────
//  Lexora Backend  —  index.js
//  Express + OCR.space + Open Library + Google Books
// ─────────────────────────────────────────────────────────
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const scanRouter = require("./routes/scanBookCover");
const searchRouter = require("./routes/searchBooks");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────
app.use(cors({
  origin:  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────
app.use("/api", scanRouter);
app.use("/api", searchRouter);

// ── Health check ─────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status:          "ok",
    timestamp:       new Date().toISOString(),
    googleBooksKey:  process.env.GOOGLE_BOOKS_API_KEY
      ? "✅ set"
      : "⚠️  not set (unauthenticated quota applies)",
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
app.listen(PORT, () => {
  console.log(`\n🚀  Lexora server     →  http://localhost:${PORT}`);
  console.log(`📚  Open Library      →  primary metadata source`);
  console.log(`📖  Google Books      →  fallback metadata source`);
  console.log(
    `🔑  Google Books key  →  ${
      process.env.GOOGLE_BOOKS_API_KEY ? "✅ set" : "⚠️  not set"
    }\n`
  );
});