const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "div",
  "em",
  "h2",
  "h3",
  "i",
  "li",
  "ol",
  "p",
  "strong",
  "u",
  "ul",
]);

const BLOCKED_TAGS = new Set([
  "audio",
  "button",
  "embed",
  "form",
  "iframe",
  "img",
  "input",
  "object",
  "script",
  "style",
  "svg",
  "video",
]);

function safeLink(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch {
    return null;
  }
}

function sanitizeNode(node, targetDocument) {
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDocument.createTextNode(node.nodeValue || "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tag = node.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tag)) return null;

  const children = Array.from(node.childNodes)
    .map((child) => sanitizeNode(child, targetDocument))
    .filter(Boolean);

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = targetDocument.createDocumentFragment();
    children.forEach((child) => fragment.appendChild(child));
    return fragment;
  }

  const clean = targetDocument.createElement(tag);
  if (tag === "a") {
    const href = safeLink(node.getAttribute("href") || "");
    if (href) {
      clean.setAttribute("href", href);
      clean.setAttribute("rel", "noopener noreferrer");
    }
  }
  children.forEach((child) => clean.appendChild(child));
  return clean;
}

export function sanitizeRichTextHtml(value = "") {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(String(value), "text/html");
  const clean = document.implementation.createHTMLDocument("");

  Array.from(parsed.body.childNodes)
    .map((node) => sanitizeNode(node, clean))
    .filter(Boolean)
    .forEach((node) => clean.body.appendChild(node));

  return clean.body.innerHTML;
}

export function getRichTextPlainText(value = "") {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(sanitizeRichTextHtml(value), "text/html");
  return (parsed.body.textContent || "").trim();
}
