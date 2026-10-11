/**
 * Copy text to the clipboard.
 *
 * Tries the async Clipboard API first (requires a secure context), then
 * falls back to a hidden textarea + execCommand for plain HTTP deploys.
 * Resolves true when the text was copied, false when the browser refused
 * — the UI then tells the user to select the text manually.
 */
export async function copyTextToClipboard(text) {
  if (!text) return false

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission denied or insecure context — fall through.
    }
  }

  return legacyCopy(text)
}

function legacyCopy(text) {
  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.top = "-1000px"
  textarea.style.opacity = "0"
  document.body.appendChild(textarea)

  try {
    textarea.select()
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(textarea)
  }
}
