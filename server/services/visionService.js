// ─────────────────────────────────────────────────────────
//  services/visionService.js
//  OCR using OCR.space API (free, no billing required)
//  Replaces @google-cloud/vision
// ─────────────────────────────────────────────────────────
const axios    = require("axios");
const FormData = require("form-data");

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = process.env.OCR_SPACE_API_KEY || "K85292237988957";

/**
 * Run full-text detection on an image buffer via OCR.space API.
 * @param {Buffer} imageBuffer — raw image bytes
 * @param {string} mimeType    — e.g. "image/jpeg"
 * @returns {{ fullText: string, blocks: Array }}
 */
async function detectText(imageBuffer, mimeType = "image/jpeg") {
  const form = new FormData();
  form.append("file", imageBuffer, {
    filename:    "cover.jpg",
    contentType: mimeType,
  });
  form.append("apikey",            OCR_API_KEY);
  form.append("language",          "eng");
  form.append("isOverlayRequired", "true");  // gives word-level bounding boxes
  form.append("detectOrientation", "true");
  form.append("scale",             "true");  // improves accuracy on small text
  form.append("OCREngine",         "2");     // Engine 2 is better for printed text

  let response;
  try {
    response = await axios.post(OCR_API_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
  } catch (err) {
    console.error("❌ OCR.space network error:", err.message);
    throw new Error("OCR.space API request failed: " + err.message);
  }

  const data = response.data;

  // OCR.space error handling
  if (data.IsErroredOnProcessing) {
    const msg = data.ErrorMessage?.[0] || "Unknown OCR.space error";
    console.error("❌ OCR.space processing error:", msg);
    throw new Error("OCR.space error: " + msg);
  }

  const pages = data.ParsedResults;
  if (!pages || pages.length === 0) {
    return { fullText: "", blocks: [] };
  }

  // Combine text from all pages
  const fullText = pages
    .map((p) => p.ParsedText || "")
    .join("\n")
    .trim();

  // Build word-level blocks from overlay data (used for title inference)
  const blocks = [];
  for (const page of pages) {
    const lines = page.TextOverlay?.Lines || [];
    for (const line of lines) {
      for (const word of line.Words || []) {
        blocks.push({
          text: word.WordText,
          boundingBox: [
            { x: word.Left,              y: word.Top              },
            { x: word.Left + word.Width, y: word.Top              },
            { x: word.Left + word.Width, y: word.Top + word.Height },
            { x: word.Left,              y: word.Top + word.Height },
          ],
          width:  word.Width,
          height: word.Height,
        });
      }
    }
  }

  console.log(`✅ OCR.space: detected ${blocks.length} words`);
  return { fullText, blocks };
}

/**
 * Extract the bounding-box area (in pixels) of a block.
 * Larger area = more visually prominent = likely the title.
 */
function blockArea(block) {
  if (block.width && block.height) return block.width * block.height;
  const verts = block.boundingBox;
  if (!verts || verts.length < 2) return 0;
  const xs = verts.map((v) => v.x || 0);
  const ys = verts.map((v) => v.y || 0);
  return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
}

/**
 * Return the top N words sorted by visual size (largest = likely title).
 */
function getLargestTextBlocks(blocks, topN = 5) {
  return [...blocks]
    .sort((a, b) => blockArea(b) - blockArea(a))
    .slice(0, topN)
    .map((b) => b.text);
}

module.exports = { detectText, getLargestTextBlocks };