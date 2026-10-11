import { resolveMediaUrl } from "./pdfRenderer"

// Longest side of the produced PNG. Bounds worst-case memory: a 2× render of
// an A4-ish page is already ~1600×2200 px, the cap only guards huge source
// pages from producing canvas sizes browsers refuse.
const MAX_DIMENSION = 3000
// Screenshot scale for PDF source pages. Re-rendered from the document, so
// this is true source quality — not an upscale of the cached JPEG.
const PDF_CAPTURE_SCALE = 2

async function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the screenshot"))),
      "image/png"
    )
  })
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.floor(width))
  canvas.height = Math.max(1, Math.floor(height))
  return canvas
}

/** Release the bitmap of an intermediate canvas. */
function releaseCanvas(canvas) {
  if (canvas) {
    canvas.width = 0
    canvas.height = 0
  }
}

/**
 * Render pdf.js pages (1-based numbers) side by side at PDF_CAPTURE_SCALE.
 * Throws if a page cannot be rendered; intermediate canvases are released.
 */
export async function capturePdfPages(pdfDoc, pageNumbers) {
  if (!Array.isArray(pageNumbers) || pageNumbers.length === 0) {
    throw new Error("No pages to capture")
  }

  const canvases = []
  try {
    for (const pageNum of pageNumbers) {
      canvases.push(await renderPageToCanvas(pdfDoc, pageNum))
    }
    return await canvasToPngBlob(composeSideBySide(canvases))
  } finally {
    canvases.forEach(releaseCanvas)
  }
}

async function renderPageToCanvas(pdfDoc, pageNum) {
  const page = await pdfDoc.getPage(pageNum)
  try {
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(
      PDF_CAPTURE_SCALE,
      MAX_DIMENSION / Math.max(base.width, base.height)
    )
    const viewport = page.getViewport({ scale })
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not get a 2d context")

    await page.render({ canvasContext: ctx, viewport }).promise
    return canvas
  } finally {
    page.cleanup()
  }
}

/**
 * Compose page images (already-loaded HTMLImageElements or canvases) side by
 * side at equal height, scaled down when the result would exceed MAX_DIMENSION.
 */
export async function captureImagePages(urls) {
  if (!Array.isArray(urls) || urls.length === 0) {
    throw new Error("No pages to capture")
  }

  const images = []
  try {
    for (const url of urls) images.push(await loadImage(url))
    const canvases = images.map((image) => {
      const canvas = createCanvas(image.naturalWidth, image.naturalHeight)
      canvas.getContext("2d")?.drawImage(image, 0, 0)
      return canvas
    })
    try {
      return await canvasToPngBlob(composeSideBySide(canvases))
    } finally {
      canvases.forEach(releaseCanvas)
    }
  } finally {
    images.forEach((image) => { image.src = ""; image.onload = image.onerror = null })
  }
}

/**
 * Load a page image with credentials. Required so the canvas is not tainted:
 * the media server answers CORS for the client origin with credentials.
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "use-credentials"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load the page image"))
    image.src = resolveMediaUrl(url)
  })
}

function composeSideBySide(sources) {
  const height = Math.max(...sources.map((s) => s.height))
  const width = sources.reduce((sum, s) => sum + s.width, 0)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))

  const canvas = createCanvas(width * scale, height * scale)
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get a 2d context")

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let x = 0
  for (const source of sources) {
    const drawWidth = source.width * scale
    ctx.drawImage(source, x, 0, drawWidth, source.height * scale)
    x += drawWidth
  }
  return canvas
}

/** Trigger a browser download for a blob produced above. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Revoke late enough for the download to have started, never while it runs.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** page-3.png for one page, spread-3-4.png for the open spread (zero-based input). */
export function screenshotFilename(pageNumbers) {
  const pages = pageNumbers.map((n) => n + 1)
  return pages.length > 1 ? `spread-${pages.join("-")}.png` : `page-${pages[0]}.png`
}
