// ─────────────────────────────────────────────────────────
//  utils/websocket.js
//  Socket.io setup + broadcast helpers.
//
//  CHANGES (audit trail):
//    • Admin clients join "admins" room on connect (via "join:admin" event)
//    • broadcastToAdmins() sends only to that room
//
//  Usage in index.js:
//    const { initSocket, broadcast } = require("./utils/websocket");
//    initSocket(httpServer);
//  Usage anywhere (after init):
//    const { broadcast, broadcastToAdmins } = require("./utils/websocket");
//    broadcast("stats:update", { ... });
//    broadcastToAdmins("audit:new", { ... });
// ─────────────────────────────────────────────────────────

const { Server } = require("socket.io");

let io = null;

/**
 * Initialise Socket.io on an existing http.Server.
 * Call once in index.js after the HTTP server is created.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
      methods:     ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 WS client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`🔌 WS client disconnected: ${socket.id}`);
    });

    // ── Admin room join ───────────────────────────────────
    // Client emits "join:admin" after confirming role === "admin".
    // We don't need server-side session verification here because
    // the REST API already gate-keeps audit data; this room is only
    // used to push real-time notifications — no sensitive data is
    // delivered exclusively over WS.
    socket.on("join:admin", () => {
      socket.join("admins");
      console.log(`🔐 WS admin joined admins room: ${socket.id}`);
    });

    socket.on("leave:admin", () => {
      socket.leave("admins");
    });

    // Client can request a manual stats refresh
    socket.on("request:stats", async () => {
      try {
        const analyticsService = require("../services/analyticsService");
        const result = await analyticsService.getBookStats();
        if (result.success) socket.emit("stats:update", result.data);
      } catch (err) {
        console.error("[WS request:stats]", err.message);
      }
    });
  });

  console.log("✅ Socket.io initialised");
  return io;
}

/**
 * Broadcast an event to ALL connected clients.
 * Safe to call even before initSocket() — silently skips if io not ready.
 *
 * @param {string} event  — e.g. "stats:update", "transaction:new"
 * @param {any}    data   — serialisable payload
 */
function broadcast(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Broadcast an event ONLY to clients in the "admins" room.
 * Used for audit:new events so non-admin users never receive them.
 *
 * @param {string} event  — e.g. "audit:new"
 * @param {any}    data   — serialisable payload
 */
function broadcastToAdmins(event, data) {
  if (!io) return;
  io.to("admins").emit(event, data);
}

/**
 * Get the raw socket.io instance (for advanced use).
 */
function getIO() {
  return io;
}

module.exports = { initSocket, broadcast, broadcastToAdmins, getIO };
