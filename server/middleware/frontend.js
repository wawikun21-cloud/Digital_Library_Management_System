const fs = require("fs");
const path = require("path");
const express = require("express");

function registerFrontendRoutes(app, clientDistDir) {
  const indexPath = path.join(clientDistDir, "index.html");
  const hasBuild = fs.existsSync(indexPath);

  if (process.env.NODE_ENV === "production" && !hasBuild) {
    throw new Error(`Client build not found at ${indexPath}. Run the deployment build command first.`);
  }

  app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });

  app.use("/uploads", (_req, res) => {
    res.status(404).json({ success: false, message: "File not found" });
  });

  if (hasBuild) {
    app.use(express.static(clientDistDir, { index: false }));

    app.get("*", (req, res, next) => {
      if (path.extname(req.path) || !req.accepts("html")) return next();
      res.sendFile(indexPath, (error) => {
        if (error) next(error);
      });
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
  });
}

module.exports = { registerFrontendRoutes };
