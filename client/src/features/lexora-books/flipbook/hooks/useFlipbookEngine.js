import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import {
  loadPdf,
  preloadPdfRange,
  resetPdfCache,
  computeRenderScale,
  trimRenderCache,
  getCachedPageUrls,
} from "../utils/pdfRenderer"
import {
  DEFAULT_FLIP_SPEED,
  DEFAULT_MIN_ZOOM,
  DEFAULT_MAX_ZOOM,
  DEFAULT_SINGLE_PAGE_BREAKPOINT,
  DEFAULT_PRELOAD_RANGE,
  DEFAULT_INITIAL_PRELOAD,
  PAGE_KEEP_RADIUS,
  getInitialPageImages,
} from "../utils/flipbookConfig"

function describeLoadError(err) {
  const name = err?.name
  const status = err?.status
  if (name === "MissingPDFException" || status === 404) {
    return "The PDF file for this book is missing on the server."
  }
  if (name === "InvalidPDFException") {
    return "The server did not return a valid PDF (check that /uploads is reachable from the app)."
  }
  if (status === 401 || status === 403) {
    return "You do not have access to this book's file. Try signing in again."
  }
  return "This book could not be loaded. Please try again later."
}

function sameImageMap(a, b) {
  if (a.size !== b.size) return false
  for (const [k, v] of a) if (b.get(k) !== v) return false
  return true
}

const EMPTY_STATE = () => ({
  currentPage: 0,
  totalPages: 0,
  zoom: 1,
  viewMode: "double",
  sound: true,
  isFullscreen: false,
  isFlipping: false,
  flipDirection: null,
  showThumbnails: false,
  showTOC: false,
  showSearch: false,
  loadedPages: new Set(),
  pageImages: new Map(),
  pageThumbs: new Map(),
  bookReady: false,
  error: null,
  isDragging: false,
  dragProgress: 0,
})

export function useFlipbookEngine(props) {
  const {
    pdfUrl,
    pages,
    mode = "webgl",
    viewMode: initialViewMode = "double",
    sound = true,
    deepLinkingPrefix,
    onPageChange,
    onReady,
    singlePageBreakpoint = DEFAULT_SINGLE_PAGE_BREAKPOINT,
    flipSpeed = DEFAULT_FLIP_SPEED,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    defaultZoom = 1,
  } = props

  const [state, setState] = useState(() => ({
    ...EMPTY_STATE(),
    viewMode: initialViewMode,
    zoom: defaultZoom,
    sound,
  }))

  const stateRef = useRef(state)
  stateRef.current = state
  const pdfDocRef          = useRef(null)
  const renderScaleRef    = useRef(1.3)
  const flipTimeoutRef     = useRef(null)
  const isSinglePageMode   = useRef(false)
  const cleanupFnsRef      = useRef([])

  const effectiveViewMode = useMemo(() => {
    if (typeof window === "undefined") return initialViewMode
    if (window.innerWidth < singlePageBreakpoint) return "single"
    return state.viewMode
  }, [state.viewMode, initialViewMode, singlePageBreakpoint])

  // ── Initialize PDF or image pages ──────────────────────
  useEffect(() => {
    let cancelled = false

    async function init() {
      setState((s) => ({
        ...s,
        currentPage: 0,
        totalPages: 0,
        pageImages: new Map(),
        pageThumbs: new Map(),
        loadedPages: new Set(),
        bookReady: false,
        error: null,
      }))
      resetPdfCache()
      pdfDocRef.current?.destroy?.()
      pdfDocRef.current = null

      if (pdfUrl) {
        let doc
        try {
          doc = await loadPdf(pdfUrl)
          if (cancelled) { doc.destroy(); return }
          pdfDocRef.current = doc
          const total = doc.numPages

          const scale = await computeRenderScale(doc)
          renderScaleRef.current = scale

          // Only wait for the first spread; everything else loads in the background.
          const firstPages = await preloadPdfRange(doc, 1, total, DEFAULT_INITIAL_PRELOAD, scale)
          if (cancelled) { doc.destroy(); return }

          const initialImages = new Map()
          const initialLoaded = new Set()
          firstPages.forEach((url, pageNum) => {
            initialImages.set(pageNum - 1, url)
            initialLoaded.add(pageNum - 1)
          })

          setState((s) => ({
            ...s,
            totalPages: total,
            currentPage: 0,
            pageImages: initialImages,
            pageThumbs: new Map(initialImages),
            loadedPages: initialLoaded,
            bookReady: true,
          }))
          onReady?.()
        } catch (err) {
          console.error("[Flipbook] failed to load PDF:", pdfUrl, err)
          doc?.destroy?.()
          if (!cancelled) {
            setState((s) => ({
              ...s,
              bookReady: true,
              error: describeLoadError(err),
            }))
          }
        }
      } else if (pages && pages.length > 0) {
        const total = pages.length
        const { initialImages, initialThumbs, initialLoaded } = getInitialPageImages(pages, total)

        if (cancelled) return
        setState((s) => ({
          ...s,
          totalPages: total,
          currentPage: 0,
          pageImages: initialImages,
          pageThumbs: initialThumbs,
          loadedPages: initialLoaded,
          bookReady: true,
        }))
        onReady?.()
      } else {
        setState((s) => ({
          ...s,
          totalPages: 0,
          bookReady: true,
          error: "No pages are available for this book.",
        }))
        onReady?.()
      }
    }

    init()
    return () => { cancelled = true }
  }, [pdfUrl, pages, onReady])

  // ── Lazy-load surrounding pages ─────────────────────────
  useEffect(() => {
    if (!state.bookReady || state.totalPages === 0) return undefined
    const center = state.currentPage
    const range = DEFAULT_PRELOAD_RANGE

    // PDF source: render nearby pages, evict far ones, merge via functional setState
    if (pdfDocRef.current) {
      let cancelled = false
      const doc = pdfDocRef.current

      preloadPdfRange(doc, center + 1, state.totalPages, range, renderScaleRef.current).then(() => {
        if (cancelled) return
        trimRenderCache(center + 1, PAGE_KEEP_RADIUS)
        const next = getCachedPageUrls()
        setState((s) => {
          if (sameImageMap(s.pageImages, next)) return s   // nothing changed → no re-render
          return {
            ...s,
            pageImages: next,
            pageThumbs: new Map(next),
            loadedPages: new Set(next.keys()),
          }
        })
      })

      return () => { cancelled = true }
    }

    // Image source: plain URLs, nothing to render
    if (pages?.length) {
      setState((s) => {
        let changed = false
        const newImages = new Map(s.pageImages)
        const newThumbs = new Map(s.pageThumbs)
        const newLoaded = new Set(s.loadedPages)
        for (let i = center - range; i <= center + range; i++) {
          if (i >= 0 && i < s.totalPages && pages[i] && !newLoaded.has(i)) {
            newImages.set(i, pages[i].src)
            newThumbs.set(i, pages[i].thumb || pages[i].src)
            newLoaded.add(i)
            changed = true
          }
        }
        return changed ? { ...s, pageImages: newImages, pageThumbs: newThumbs, loadedPages: newLoaded } : s
      })
    }
    return undefined
  }, [state.currentPage, state.bookReady, state.totalPages, pdfUrl, pages])

  // ── Deep linking ────────────────────────────────────────
  useEffect(() => {
    if (!deepLinkingPrefix) return
    const hash = window.location.hash
    const prefix = `#${deepLinkingPrefix}`
    if (hash.startsWith(prefix)) {
      const page = parseInt(hash.replace(prefix, ""), 10)
      if (!isNaN(page) && page >= 0 && page < state.totalPages) {
        setState((s) => ({ ...s, currentPage: page }))
      }
    }
  }, [deepLinkingPrefix, state.bookReady, state.totalPages])

  useEffect(() => {
    if (!deepLinkingPrefix) return
    const page = state.currentPage
    const newHash = `${deepLinkingPrefix}${page}`
    if (window.location.hash !== `#${newHash}`) {
      window.history.replaceState(null, "", `#${newHash}`)
    }
  }, [state.currentPage, deepLinkingPrefix])

  // ── Fullscreen tracking ─────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setState((s) => ({ ...s, isFullscreen: !!document.fullscreenElement }))
    }
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // ── Navigation ──────────────────────────────────────────
  const goNext = useCallback(() => {
    const current = stateRef.current
    if (current.isFlipping) return
    const hasFrontCover = mode !== "css"
    const step = hasFrontCover && (
      current.currentPage === 0
      || (effectiveViewMode === "double" && current.currentPage === 1)
    )
      ? 1
      : effectiveViewMode === "double" ? 2 : 1
    const target = current.currentPage + step
    if (hasFrontCover && effectiveViewMode === "double" && target >= current.totalPages) return
    const next = Math.min(target, current.totalPages - 1)
    if (next === current.currentPage) return

    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current)
    stateRef.current = { ...current, currentPage: next, isFlipping: true, flipDirection: "next" }
    setState((s) => ({ ...s, currentPage: next, isFlipping: true, flipDirection: "next" }))
    onPageChange?.(next)
    flipTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isFlipping: false, flipDirection: null }))
    }, flipSpeed * 1000)
  }, [effectiveViewMode, mode, onPageChange, flipSpeed])

  const goPrev = useCallback(() => {
    const current = stateRef.current
    if (current.isFlipping) return
    const hasFrontCover = mode !== "css"
    const step = hasFrontCover && (
      current.currentPage === 1
      || (effectiveViewMode === "double" && current.currentPage === 2)
    )
      ? 1
      : effectiveViewMode === "double" ? 2 : 1
    const prev = Math.max(current.currentPage - step, 0)
    if (prev === current.currentPage) return

    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current)
    stateRef.current = { ...current, currentPage: prev, isFlipping: true, flipDirection: "prev" }
    setState((s) => ({ ...s, currentPage: prev, isFlipping: true, flipDirection: "prev" }))
    onPageChange?.(prev)
    flipTimeoutRef.current = setTimeout(() => {
      setState((s) => ({ ...s, isFlipping: false, flipDirection: null }))
    }, flipSpeed * 1000)
  }, [effectiveViewMode, mode, onPageChange, flipSpeed])

  const goToPage = useCallback((page) => {
    const current = stateRef.current
    const clamped = Math.max(0, Math.min(page, current.totalPages - 1))
    if (clamped === current.currentPage) return
    const direction = clamped > current.currentPage ? "next" : "prev"

    if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current)
    stateRef.current = { ...current, currentPage: clamped, isFlipping: true, flipDirection: direction }
    setState((s) => ({ ...s, currentPage: clamped, isFlipping: true, flipDirection: direction }))
    onPageChange?.(clamped)
    flipTimeoutRef.current = setTimeout(() => {
      setState((s) => ({ ...s, isFlipping: false, flipDirection: null }))
    }, flipSpeed * 1000)
  }, [onPageChange, flipSpeed])

  // ── Zoom ────────────────────────────────────────────────
  const setZoom = useCallback((zoom) => {
    setState((s) => ({ ...s, zoom: Math.max(minZoom, Math.min(zoom, maxZoom)) }))
  }, [minZoom, maxZoom])

  const zoomIn = useCallback(() => {
    setState((s) => ({ ...s, zoom: Math.min(s.zoom + 0.25, maxZoom) }))
  }, [maxZoom])

  const zoomOut = useCallback(() => {
    setState((s) => ({ ...s, zoom: Math.max(s.zoom - 0.25, minZoom) }))
  }, [minZoom])

  // ── Toggles ─────────────────────────────────────────────
  const toggleViewMode = useCallback(() => {
    setState((s) => ({ ...s, viewMode: s.viewMode === "double" ? "single" : "double" }))
  }, [])

  const toggleSound = useCallback(() => {
    setState((s) => ({ ...s, sound: !s.sound }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = document.documentElement
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.()
    }
  }, [])

  const toggleThumbnails = useCallback(() => {
    setState((s) => ({ ...s, showThumbnails: !s.showThumbnails, showTOC: false, showSearch: false }))
  }, [])

  const toggleTOC = useCallback(() => {
    setState((s) => ({ ...s, showTOC: !s.showTOC, showThumbnails: false, showSearch: false }))
  }, [])

  const toggleSearch = useCallback(() => {
    setState((s) => ({ ...s, showSearch: !s.showSearch, showThumbnails: false, showTOC: false }))
  }, [])

  const setDragging = useCallback((dragging, progress = 0) => {
    setState((s) => ({ ...s, isDragging: dragging, dragProgress: progress }))
  }, [])

  // ── Keyboard ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault()
        goNext()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        goPrev()
      } else if (e.key === "Escape") {
        setState((s) => ({ ...s, showThumbnails: false, showTOC: false, showSearch: false }))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goNext, goPrev])

  // ── Cleanup ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current)
      pdfDocRef.current?.destroy?.()
      pdfDocRef.current = null
      resetPdfCache()
    }
  }, [])

  const actions = {
    goNext,
    goPrev,
    goToPage,
    setZoom,
    zoomIn,
    zoomOut,
    toggleViewMode,
    toggleSound,
    toggleFullscreen,
    toggleThumbnails,
    toggleTOC,
    toggleSearch,
    setDragging,
  }

  return { state, actions, effectiveViewMode, pdfDocRef }
}
