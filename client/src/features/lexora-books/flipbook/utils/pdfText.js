/**
 * pdf.js text-item → plain text.
 *
 * pdf.js emits one entry per glyph run and flags the last item of every
 * line with `hasEOL`, so appending a newline there reproduces the page's
 * line structure without guessing from glyph positions.
 */
export function pdfItemsToText(items) {
  if (!Array.isArray(items)) return ""

  let text = ""
  for (const item of items) {
    if (!item || typeof item.str !== "string" || item.str === "") continue
    text += item.str
    if (item.hasEOL) text += "\n"
  }

  return text
    .replace(/[ \t]+\n/g, "\n")   // trailing spaces before a line break
    .replace(/\n{3,}/g, "\n\n")   // collapse runs of blank lines
    .trim()
}
