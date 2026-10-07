/**
 * @typedef {Object} PageImage
 * @property {string} src
 * @property {string} thumb
 */

/**
 * @typedef {Object} TOCItem
 * @property {string} title
 * @property {number} page
 * @property {number} [depth]
 */

/**
 * @typedef {Object} FlipbookTheme
 * @property {string} [toolbarBg]
 * @property {string} [btnColor]
 * @property {string} [btnHoverBg]
 * @property {string} [accentColor]
 * @property {string} [panelBg]
 * @property {string} [panelBorder]
 * @property {string} [textPrimary]
 * @property {string} [textMuted]
 */

/** @typedef {"webgl"|"css"} FlipMode */
/** @typedef {"single"|"double"} ViewMode */

/**
 * @typedef {Object} FlipbookProps
 * @property {string} [pdfUrl]
 * @property {PageImage[]} [pages]
 * @property {FlipMode} [mode]
 * @property {ViewMode} [viewMode]
 * @property {boolean} [sound]
 * @property {TOCItem[]} [tableOfContent]
 * @property {string} [deepLinkingPrefix]
 * @property {FlipbookTheme} [theme]
 * @property {string} [className]
 * @property {(page:number)=>void} [onPageChange]
 * @property {()=>void} [onReady]
 * @property {number} [singlePageBreakpoint]
 * @property {number} [flipSpeed]
 * @property {boolean} [showToolbar]
 * @property {number} [defaultZoom]
 * @property {number} [maxZoom]
 * @property {number} [minZoom]
 */

/**
 * @typedef {Object} FlipbookState
 * @property {number} currentPage
 * @property {number} totalPages
 * @property {number} zoom
 * @property {ViewMode} viewMode
 * @property {boolean} sound
 * @property {boolean} isFullscreen
 * @property {boolean} isFlipping
 * @property {string|null} flipDirection
 * @property {boolean} showThumbnails
 * @property {boolean} showTOC
 * @property {boolean} showSearch
 * @property {Set<number>} loadedPages
 * @property {Map<number,string>} pageImages
 * @property {Map<number,string>} pageThumbs
 * @property {boolean} bookReady
 * @property {boolean} isDragging
 * @property {number} dragProgress
 */

/**
 * @typedef {Object} FlipbookActions
 * @property {()=>void} goNext
 * @property {()=>void} goPrev
 * @property {(page:number)=>void} goToPage
 * @property {(zoom:number)=>void} setZoom
 * @property {()=>void} zoomIn
 * @property {()=>void} zoomOut
 * @property {()=>void} toggleViewMode
 * @property {()=>void} toggleSound
 * @property {()=>void} toggleFullscreen
 * @property {()=>void} toggleThumbnails
 * @property {()=>void} toggleTOC
 * @property {()=>void} toggleSearch
 * @property {(dragging:boolean,progress?:number)=>void} setDragging
 */
