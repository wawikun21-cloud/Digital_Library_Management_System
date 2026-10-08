const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const express = require("express");
const { registerFrontendRoutes } = require("../middleware/frontend");

async function withFrontendServer(run) {
  const clientDistDir = await fs.mkdtemp(path.join(os.tmpdir(), "lexora-client-"));
  await fs.writeFile(path.join(clientDistDir, "index.html"), "<main>Lexora app</main>");
  await fs.writeFile(path.join(clientDistDir, "app.js"), "console.log('Lexora');");

  const app = express();
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  registerFrontendRoutes(app, clientDistDir);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await fs.rm(clientDistDir, { recursive: true, force: true });
  }
}

function get(url, accept = "text/html") {
  return new Promise((resolve, reject) => {
    http.get(url, { headers: { accept } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body }));
    }).on("error", reject);
  });
}

test("serves the client build at the root and on browser deep links", async () => {
  await withFrontendServer(async (baseUrl) => {
    const root = await get(`${baseUrl}/`);
    const deepLink = await get(`${baseUrl}/books/42`);

    assert.equal(root.status, 200);
    assert.match(root.body, /Lexora app/);
    assert.equal(deepLink.status, 200);
    assert.match(deepLink.body, /Lexora app/);
  });
});

test("serves built assets and returns 404 for missing assets", async () => {
  await withFrontendServer(async (baseUrl) => {
    const asset = await get(`${baseUrl}/app.js`, "*/*");
    const missingAsset = await get(`${baseUrl}/missing.js`, "*/*");

    assert.equal(asset.status, 200);
    assert.match(asset.body, /console\.log/);
    assert.equal(missingAsset.status, 404);
  });
});

test("preserves API and upload 404 responses instead of returning the SPA", async () => {
  await withFrontendServer(async (baseUrl) => {
    const health = await get(`${baseUrl}/api/health`, "application/json");
    const missingApi = await get(`${baseUrl}/api/not-found`, "application/json");
    const missingUpload = await get(`${baseUrl}/uploads/not-found.pdf`, "*/*");

    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), { status: "ok" });
    assert.equal(missingApi.status, 404);
    assert.deepEqual(JSON.parse(missingApi.body), {
      success: false,
      message: "Route not found",
    });
    assert.equal(missingUpload.status, 404);
  });
});

test("requires a built frontend when starting in production", () => {
  const clientDistDir = path.join(os.tmpdir(), `lexora-missing-${Date.now()}`);
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";

  try {
    assert.throws(
      () => registerFrontendRoutes(express(), clientDistDir),
      /Client build not found/
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
