/**
 * Resolve the copy/screenshot permissions a viewer gets in the flipbook.
 *
 * The stored flags on the book are the truth from the server
 * (GET /:id/reader already returns them as booleans); this helper only
 * decides what the current viewer may use:
 *   • managers bypass the restriction so they can inspect their own books
 *   • a missing flag reads as "allowed", matching the column default
 *
 * Pure on purpose — the reader page passes the session's permission in,
 * and the tests cover every combination without React.
 */
export function resolveReaderPermissions({
  allowTextCopy = true,
  allowScreenshot = true,
  canManage = false,
} = {}) {
  if (canManage) {
    return { allowTextCopy: true, allowScreenshot: true }
  }
  return {
    allowTextCopy: allowTextCopy !== false,
    allowScreenshot: allowScreenshot !== false,
  }
}
