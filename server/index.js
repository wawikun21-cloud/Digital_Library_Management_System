// ─────────────────────────────────────────────────────────
//  Lexora Backend  —  index.js
//  Express + Google Cloud Vision OCR + Google Books API
// ─────────────────────────────────────────────────────────
require("dotenv").config();

const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const scanRouter = require("./routes/scanBookCover");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────
app.use("/api", scanRouter);

// ── Health check ─────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    credentialsSet: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
  console.log(`\n🚀  Lexora server running on http://localhost:${PORT}`);
  console.log(`📋  GOOGLE_APPLICATION_CREDENTIALS: ${
    process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : "⚠️  NOT SET — Vision API will fail"
  }\n`);
});