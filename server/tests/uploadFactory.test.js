const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const test = require("node:test");

const { createUpload, createFieldsUpload } = require("../middleware/uploadFactory");

/** Minimal multipart body for one file in a named field. */
function multipart(fields) {
  const boundary = `----t${Math.random().toString(16).slice(2)}`;
  const parts = fields.map(({ name, filename, contentType, body }) => {
    return Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
      Buffer.isBuffer(body) ? body : Buffer.from(body),
      Buffer.from("\r\n"),
    ]);
  });
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([...parts, Buffer.from(`--${boundary}--\r\n`)]),
  };
}

function post(url, { contentType, body }) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: "POST", headers: { "Content-Type": contentType } }, (res) => {
      let text = "";
      res.on("data", (chunk) => { text += chunk; });
      res.on("end", () => {
        let json = {};
        try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
        resolve({ status: res.statusCode, body: json });
      });
    });
    request.on("error", reject);
    request.end(body);
  });
}

/** Summarises whatever multer attached, in whichever shape it uses. */
function describeFiles(req) {
  if (req.file) return [`single:${req.file.originalname}=${req.file.size}B`];
  if (!req.files) return [];
  // .array() leaves req.files as an array; .fields() leaves an object keyed
  // by field name, each holding an array.
  if (Array.isArray(req.files)) {
    return req.files.map((f) => `${f.originalname}=${f.size}B`);
  }
  return Object.entries(req.files).map(([field, files]) =>
    `${field}:${files.map((f) => `${f.originalname}=${f.size}B`).join("|")}`
  );
}

/** Serves one upload middleware and reports what reached the handler. */
function withApp(middleware, run) {
  const app = express();
  app.post("/upload", middleware, (req, res) => {
    res.json({ received: describeFiles(req) });
  });

  const server = http.createServer(app);
  return (async () => {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      return await run(`http://127.0.0.1:${server.address().port}/upload`);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  })();
}

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

test("image filter accepts a matching extension and MIME", async () => {
  const upload = createUpload({ storage: "memory", type: "image", field: "cover" });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "cover", filename: "page.png", contentType: "image/png", body: PNG_BYTES },
    ]))
  );
  assert.equal(status, 200);
  assert.deepEqual(body.received, ["single:page.png=16B"]);
});

test("image filter rejects a mismatched extension", async () => {
  const upload = createUpload({ storage: "memory", type: "image", field: "cover" });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "cover", filename: "malware.exe", contentType: "image/png", body: PNG_BYTES },
    ]))
  );
  assert.equal(status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /JPG, PNG, or WEBP/);
});

test("image filter rejects an unlisted MIME that a bare MIME check would allow", async () => {
  // gif used to be advertised by the generic uploader but no controller can
  // verify it, so it must be refused here rather than failing later.
  const upload = createUpload({ storage: "memory", type: "image", field: "cover" });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "cover", filename: "anim.gif", contentType: "image/gif", body: Buffer.from("GIF89a") },
    ]))
  );
  assert.equal(status, 400);
  assert.match(body.error, /JPG, PNG, or WEBP/);
});

test("maxBytes is enforced and names the limit", async () => {
  const upload = createUpload({
    storage: "memory", type: "image", field: "cover",
    maxBytes: 8,
    messages: { tooLarge: "Cover must be tiny." },
  });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "cover", filename: "big.png", contentType: "image/png", body: Buffer.concat([PNG_BYTES, Buffer.alloc(64)]) },
    ]))
  );
  assert.equal(status, 400);
  assert.equal(body.error, "Cover must be tiny.");
});

test("maxCount bounds the array", async () => {
  const upload = createUpload({ storage: "memory", type: "image", field: "pages", maxCount: 2 });
  const { status } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "pages", filename: "a.png", contentType: "image/png", body: PNG_BYTES },
      { name: "pages", filename: "b.png", contentType: "image/png", body: PNG_BYTES },
      { name: "pages", filename: "c.png", contentType: "image/png", body: PNG_BYTES },
    ]))
  );
  assert.equal(status, 400);
});

test("array uploads are read in order", async () => {
  const upload = createUpload({ storage: "memory", type: "image", field: "pages", maxCount: 5 });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "pages", filename: "a.png", contentType: "image/png", body: PNG_BYTES },
      { name: "pages", filename: "b.png", contentType: "image/png", body: PNG_BYTES },
    ]))
  );
  assert.equal(status, 200);
  assert.deepEqual(body.received, ["a.png=16B", "b.png=16B"], "order must be preserved");
});

test("fields upload applies a per-field ceiling with a field-specific message", async () => {
  const upload = createFieldsUpload({
    storage: "memory",
    fields: [
      { name: "thumbnail", maxCount: 1, maxBytes: 8, type: "image", label: "The thumbnail" },
      { name: "file", maxCount: 1, maxBytes: 500, type: "document", label: "The file" },
    ],
  });
  const { status, body } = await withApp(upload, (base) =>
    post(base, multipart([
      { name: "thumbnail", filename: "t.png", contentType: "image/png", body: Buffer.concat([PNG_BYTES, Buffer.alloc(64)]) },
    ]))
  );
  assert.equal(status, 400);
  assert.equal(body.error, "The thumbnail must be 0 MB or smaller.");
});

test("disk storage streams to the temp folder and hands the controller a path", async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "upload-factory-"));
  const original = process.env.UPLOADS_DIR;
  process.env.UPLOADS_DIR = tempRoot;
  t.after(() => { process.env.UPLOADS_DIR = original; fs.rmSync(tempRoot, { recursive: true, force: true }); });

  // The factory reads the temp root at require time, so load it fresh with
  // our temporary UPLOADS_DIR in place.
  const uploadsPath = require.resolve("../config/uploads");
  const factoryPath = require.resolve("../middleware/uploadFactory");
  delete require.cache[uploadsPath];
  delete require.cache[factoryPath];
  const { createUpload: createUploadFresh } = require("../middleware/uploadFactory");

  const upload = createUploadFresh({ storage: "disk", subdir: "lexora", type: "image", field: "cover" });

  const app = express();
  app.post("/upload", upload, (req, res) => {
    const stored = fs.readFileSync(req.file.path);
    res.json({
      size: req.file.size,
      hasBuffer: Buffer.isBuffer(req.file.buffer),
      onDisk: req.file.path.startsWith(path.join(tempRoot, "tmp", "lexora")),
      contentMatches: stored.equals(PNG_BYTES),
    });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const { status, body } = await post(
      `http://127.0.0.1:${server.address().port}/upload`,
      multipart([
        { name: "cover", filename: "page.png", contentType: "image/png", body: PNG_BYTES },
      ])
    );
    assert.equal(status, 200);
    assert.equal(body.size, 16);
    assert.equal(body.hasBuffer, false, "disk storage must not also buffer in memory");
    assert.equal(body.onDisk, true);
    assert.equal(body.contentMatches, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
