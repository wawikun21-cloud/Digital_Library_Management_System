export const DEFAULT_FLIP_SPEED = 0.6
export const DEFAULT_MIN_ZOOM = 0.5
export const DEFAULT_MAX_ZOOM = 3
export const DEFAULT_SINGLE_PAGE_BREAKPOINT = 768
export const DEFAULT_PRELOAD_RANGE = 3   // a double-page spread needs index+3 ready
export const PAGE_KEEP_RADIUS = 8        // pages kept in memory around the current one
export const DEFAULT_INITIAL_PRELOAD = 1  // first paint only waits for pages 1-2

export function getInitialPageImages(pages, total) {
  const initialImages = new Map()
  const initialThumbs = new Map()
  const initialLoaded = new Set()
  const count = Math.min(4, total)
  for (let i = 0; i < count; i++) {
    if (pages?.[i]) {
      initialImages.set(i, pages[i].src)
      initialThumbs.set(i, pages[i].thumb || pages[i].src)
      initialLoaded.add(i)
    }
  }
  return { initialImages, initialThumbs, initialLoaded }
}

export function cleanupObjectURLs(urls) {
  urls.forEach((url) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
  })
}
