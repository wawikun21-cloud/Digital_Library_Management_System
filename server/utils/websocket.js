// ─────────────────────────────────────────────────────────
//  utils/websocket.js
//  Socket.io setup + broadcast helpers.
//
//  CHANGES:
//    • SECURITY FIX: "join:admin" now verifies req.session.user.role
//      via the socket's handshake request — unauthenticated or
//      non-admin clients are silently rejected from the admins room.
//    • NEW: Server-side 30s ping/heartbeat keeps long-lived
//      connections alive and surfaces stale sockets early.
//    • NEW: broadcastToAdmins() used for audit:new events so
//      non-admin clients never receive them.
//    • broadcast() and broadcastToAdmins() are no-ops before
//      initSocket() is called — safe to import anywhere.
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

let io            = null;
let pingInterval  = null;

/**
 * Initialise Socket.io on an existing http.Server.
 * Call once in index.js after the HTTP server is created.
 *
 * @param {import("http").Server} httpServer
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
      methods:     ["GET", "POST"],
      credentials: true,
    },
    transports:          ["websocket", "polling"],
    // Tune built-in ping so Socket.io drops truly dead connections
    pingTimeout:         60000,
    pingInterval:        25000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 WS client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`🔌 WS client disconnected: ${socket.id}`);
    });

    // ── Admin room join (with server-side auth) ───────────────────────────────
    //
    // SECURITY FIX: Previously any client could emit "join:admin" and
    // receive audit events. We now read the session from the handshake
    // request (populated by express-session because `withCredentials: true`
    // sends the session cookie on the upgrade request).
    //
    // If the session is absent or the role is not "admin", we silently
    // ignore the request — no error is sent back to avoid fingerprinting.
    socket.on("join:admin", () => {
      const user = socket.request?.session?.user;

      if (!user || user.role !== "admin") {
        // Silently reject — don't reveal why to the client
        console.warn(
          `🔐 WS "join:admin" rejected for socket ${socket.id} ` +
          `(role: ${user?.role ?? "unauthenticated"})`
        );
        return;
      }

      socket.join("admins");
      console.log(
        `🔐 WS admin joined admins room: ${socket.id} (user: ${user.username ?? user.id})`
      );
    });

    socket.on("leave:admin", () => {
      socket.leave("admins");
    });

    // ── Client-requested stats refresh ────────────────────────────────────────
    socket.on("request:stats", async () => {
      try {
        const analyticsService = require("../services/analyticsService");
        const result           = await analyticsService.getBookStats();
        if (result.success) socket.emit("stats:update", result.data);
      } catch (err) {
        console.error("[WS request:stats]", err.message);
      }
    });
  });

  // ── Heartbeat ping ────────────────────────────────────────────────────────
  // Emit a lightweight "ping" event every 30s to all clients.
  // Clients don't need to respond — this just keeps proxies and load
  // balancers from closing idle connections.
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    if (io) io.emit("ping");
  }, 30_000);

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