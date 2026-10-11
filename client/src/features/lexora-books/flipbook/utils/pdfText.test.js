import { describe, it, expect } from "vitest"
import { pdfItemsToText } from "./pdfText"
import { screenshotFilename } from "./pageCapture"

describe("pdfItemsToText", () => {
  it("reproduces lines from pdf.js hasEOL flags", () => {
    const text = pdfItemsToText([
      { str: "The quick brown fox", hasEOL: true },
      { str: "jumps over", hasEOL: false },
      { str: " the lazy dog", hasEOL: true },
    ])
    expect(text).toBe("The quick brown fox\njumps over the lazy dog")
  })

  it("drops trailing spaces and collapses blank-line runs", () => {
    const text = pdfItemsToText([
      { str: "line one   ", hasEOL: true },
      { str: "", hasEOL: true },
      { str: "", hasEOL: true },
      { str: "line two", hasEOL: true },
    ])
    expect(text).toBe("line one\nline two")
  })

  it("trims and skips empty or malformed items", () => {
    const text = pdfItemsToText([
      null,
      { hasEOL: true },
      { str: "", hasEOL: true },
      { str: "  padded  ", hasEOL: true },
      { str: 42, hasEOL: true },
    ])
    expect(text).toBe("padded")
  })

  it("returns an empty string for non-array input", () => {
    expect(pdfItemsToText(undefined)).toBe("")
    expect(pdfItemsToText(null)).toBe("")
  })
})

describe("screenshotFilename", () => {
  it("names single pages and spreads from zero-based indexes", () => {
    expect(screenshotFilename([0])).toBe("page-1.png")
    expect(screenshotFilename([2, 3])).toBe("spread-3-4.png")
  })
})
