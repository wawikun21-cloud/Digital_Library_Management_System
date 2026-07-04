// ─────────────────────────────────────────────────────────
//  PM2 Ecosystem Configuration for Lexora Server
//  Usage: pm2 start pm2.config.js
// ─────────────────────────────────────────────────────────

module.exports = {
  apps: [{
    name: "lexora-server",
    script: "./index.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    watch: false,
    env: {
      NODE_ENV: "production",
    },
    // Optional: log files
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  }],
};