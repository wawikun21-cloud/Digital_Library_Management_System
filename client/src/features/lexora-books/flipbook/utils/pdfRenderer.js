import * as pdfjsLib from "pdfjs-dist"
import { pdfItemsToText } from "./pdfText"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString()

// ── URL handling ───────────────────────────────────────────
// Reader payloads return relative paths like /uploads/lexora-books/1/x.pdf.
// When the API lives on another origin (VITE_API_URL=https://api.example.com[/api])
// those must be resolved against the API host, not the frontend host.
const API_ORIGIN = (import.meta.env.VITE_API_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "")

export function resolveMediaUrl(url) {
  if (!url || /^(https?:|blob:|data:)/i.test(url)) return url
  return `${API_ORIGIN}${url}`
}

// ── Render cache (blob URLs, bounded) ──────────────────────
// key: page number (1-based) -> { url, scale }
const renderCache = new Map()
const inflight = new Map()
// Only one render scale is in use per open book (see computeRenderScale),
// so the page number alone is a sufficient key.

function revoke(entry) {
  if (entry?.url?.startsWith("blob:")) URL.revokeObjectURL(entry.url)
}

export function resetPdfCache() {
  renderCache.forEach(revoke)
  renderCache.clear()
  inflight.clear()
}

// kept for backwards compatibility with older callers
export function setPdfUrl() {
  resetPdfCache()
}

/** Drop (and revoke) every cached page further than `radius` pages from `centerPage`. */
export function trimRenderCache(centerPage, radius) {
  for (const [pageNum, entry] of renderCache) {
    if (Math.abs(pageNum - centerPage) > radius) {
      revoke(entry)
      renderCache.delete(pageNum)
    }
  }
}

/** Snapshot of cached pages as Map<zeroBasedIndex, url>. */
export function getCachedPageUrls() {
  const out = new Map()
  renderCache.forEach((entry, pageNum) => out.set(pageNum - 1, entry.url))
  return out
}

// ── Loading ────────────────────────────────────────────────
export async function loadPdf(url) {
  const loadingTask = pdfjsLib.getDocument({
    url: resolveMediaUrl(url),
    withCredentials: true,     // media route checks the session for non-public books
    enableXfa: false,
  })
  return loadingTask.promise
}

export async function getPdfTableOfContents(pdfDoc) {
  const outline = await pdfDoc.getOutline()
  if (!Array.isArray(outline)) return []

  const items = []
  async function appendOutline(entries, depth = 0) {
    for (const entry of entries) {
      let destination = entry.dest
      if (typeof destination === "string") {
        destination = await pdfDoc.getDestination(destination)
      }

      if (Array.isArray(destination) && destination[0]) {
        try {
          const page = await pdfDoc.getPageIndex(destination[0])
          if (Number.isInteger(page) && page >= 0 && page < pdfDoc.numPages) {
            items.push({
              title: entry.title?.trim() || `Page ${page + 1}`,
              page,
              depth,
            })
          }
        } catch (error) {
          console.warn("[Flipbook] skipped PDF outline entry with invalid destination:", error)
        }
      }

      if (Array.isArray(entry.items) && entry.items.length > 0) {
        await appendOutline(entry.items, depth + 1)
      }
    }
  }

  await appendOutline(outline)
  return items
}

/** Pick one scale per book so pages are ~targetPx wide (enough for 400px @2x). */
export async function computeRenderScale(pdfDoc, targetPx = 800) {
  const page = await pdfDoc.getPage(1)
  const base = page.getViewport({ scale: 1 }).width
  page.cleanup()
  return Math.min(2, Math.max(0.75, targetPx / base))
}

function canvasToBlobUrl(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.85
    )
  })
}

export async function renderPdfPage(pdfDoc, pageNum, scale = 1.3) {
  const cached = renderCache.get(pageNum)
  if (cached) return cached.url
  if (inflight.has(pageNum)) return inflight.get(pageNum)

  const task = (async () => {
    const page = await pdfDoc.getPage(pageNum)
    try {
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement("canvas")
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get 2d context")

      await page.render({ canvasContext: ctx, viewport }).promise
      const url = await canvasToBlobUrl(canvas)
      canvas.width = canvas.height = 0 // release the bitmap immediately
      renderCache.set(pageNum, { url, scale })
      return url
    } finally {
      page.cleanup()
      inflight.delete(pageNum)
    }
  })()

  inflight.set(pageNum, task)
  return task
}

export async function getPageDimensions(pdfDoc, pageNum, scale = 1) {
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  page.cleanup()
  return { width: viewport.width, height: viewport.height }
}

/**
 * Plain text of a single page (1-based). Returns "" for image-only pages,
 * or throws if the page cannot be read — callers surface the error.
 */
export async function getPageText(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum)
  try {
    const textContent = await page.getTextContent()
    return pdfItemsToText(textContent.items)
  } finally {
    page.cleanup()
  }
}

/** Render pages around centerPage (1-based), nearest first. Returns Map<pageNum, url>. */
export async function preloadPdfRange(pdfDoc, centerPage, totalPages, range = 2, scale = 1.3) {
  const results = new Map()
  const start = Math.max(1, centerPage - range)
  const end = Math.min(totalPages, centerPage + range)

  const order = []
  for (let i = start; i <= end; i++) order.push(i)
  order.sort((a, b) => Math.abs(a - centerPage) - Math.abs(b - centerPage))

  await Promise.allSettled(
    order.map((i) =>
      renderPdfPage(pdfDoc, i, scale)
        .then((url) => { results.set(i, url) })
        .catch((err) => { console.warn(`[Flipbook] page ${i} failed to render:`, err) })
    )
  )
  return results
}

export async function searchPdf(pdfDoc, query, startPage = 1, endPage) {
  if (!query.trim()) return []
  const results = []
  const end = endPage ?? pdfDoc.numPages
  const lowerQuery = query.toLowerCase()

  for (let i = startPage; i <= end; i++) {
    try {
      const page = await pdfDoc.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ")
      page.cleanup()
      if (text.toLowerCase().includes(lowerQuery)) {
        results.push({ pageIndex: i - 1, text: text.substring(0, 150) })
      }
    } catch {
      // skip broken pages
    }
  }

  return results
}

export function getRenderCache() {
  return renderCache
}
