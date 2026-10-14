/**
 *  features/portal/constants/portalUi.js
 *
 *  Portal hero presentation constants (moved from the students feature
 *  when the Student Portal relocated here).
 *
 *  One height contract for all three states: the box fills the available
 *  width and its height follows the ACTIVE image's own aspect ratio, so a
 *  banner upload (e.g. 1920×600) displays whole instead of being cropped
 *  into a fixed viewport-height box. The clamp keeps unusual uploads
 *  (ultra-wide or portrait) from dominating the page, and sharing the style
 *  between states removes the loading → loaded layout jump.
 */
export const HERO_DEFAULT_RATIO = 16 / 5;
export const HERO_MAX_HEIGHT_VH = 60;

/** Shared minimum-height classes: phones keep banners whole (short — the hero
    sits inside the body card padding, so a 3.2:1 banner is ~105px tall on a
    390px phone and must not be forced taller),
    larger screens get a comfortable hero for ultra-wide uploads. */
export const HERO_MIN_HEIGHT_CLASS = "min-h-[96px] sm:min-h-[240px]";

/** Inline style for the hero box at the given width/height ratio. */
export function heroBoxStyle(ratio = HERO_DEFAULT_RATIO) {
  const safeRatio = ratio > 0 ? ratio : HERO_DEFAULT_RATIO;
  return {
    aspectRatio: String(safeRatio),
    maxHeight: `${HERO_MAX_HEIGHT_VH}vh`,
  };
}
