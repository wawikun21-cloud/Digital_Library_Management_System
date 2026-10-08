const assert = require("node:assert/strict");
const test = require("node:test");
const { detectImageExtension } = require("../features/courses/courseThumbnail");

test("detects JPEG, PNG, and WebP file signatures", () => {
  assert.equal(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00])), ".jpg");
  assert.equal(
    detectImageExtension(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ".png"
  );
  assert.equal(detectImageExtension(Buffer.from("RIFF0000WEBP")), ".webp");
});

test("rejects unsupported or malformed image data", () => {
  assert.equal(detectImageExtension(Buffer.from("not an image")), null);
  assert.equal(detectImageExtension(Buffer.from("GIF89a")), null);
  assert.equal(detectImageExtension(null), null);
});
