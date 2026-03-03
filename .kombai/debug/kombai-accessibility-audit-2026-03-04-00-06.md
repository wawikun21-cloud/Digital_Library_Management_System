# Accessibility Audit Report — Lexora Library App
**Date:** 2026-03-03 | **Tool:** axe-core v4.11.1 + Manual Code Review  
**Pages audited:** `/` (Dashboard), `/books` (Books)  
**Standard:** WCAG 2.1 AA

---

## Summary

| Severity | Count | Source |
|----------|-------|--------|
| 🔴 Serious (WCAG AA) | 8 | Automated (axe-core) |
| 🟠 Moderate (WCAG A) | 8 | Manual code review |

---

## 🔴 Serious Violations (Automated — axe-core)

### 1. Color Contrast — Dashboard (`/`)
**WCAG 2.1 AA · SC 1.4.3 · Impact: Serious**

| Element | Actual Ratio | Required | Location |
|---------|-------------|----------|----------|
| StatsCard change text (`--text-muted` `#7aafc4` on `#fff`) | 2.39:1 | 4.5:1 | `StatsCard.jsx` — change/trend `<p>` |
| "Borrowed" badge (`#b87a1a` on `#fff`) | 3.59:1 | 4.5:1 | `Dashboard.jsx` — activity table action badge |
| "Overdue" badge (`#c05a0a` on `#fff`) | 4.46:1 | 4.5:1 | `Dashboard.jsx` — activity table action badge |

**Fix:** Darken `--text-muted` to at least `#5e97b2` (4.5:1 on white). For badges, darken text colors: Borrowed → `#8a5a00`, Overdue → `#a04500`, or increase background opacity so the blended surface raises contrast.

---

### 2. Color Contrast — Books (`/books`)
**WCAG 2.1 AA · SC 1.4.3 · Impact: Serious**

| Element | Actual Ratio | Required | Location |
|---------|-------------|----------|----------|
| "Add Book" button (white text on `#eea23a`) | 2.12:1 | 4.5:1 | `Books.jsx` — toolbar button |
| Genre badge (`#eea23a` on `rgba(238,162,58,0.1)` → `#fdf6eb`) | 1.98:1 | 4.5:1 | `Books.jsx` — book card genre tag |

**Fix:** For the "Add Book" button, use dark text (`#132F45`) on amber, or darken the amber to `#9b6800` (passes 4.5:1 on white). For genre badges, use `#7a4e00` text on the pale amber background.

---

## 🟠 Moderate Violations (Manual Code Review)

### 3. Search Input — No Accessible Label
**WCAG 2.1 A · SC 4.1.2 · File: `Books.jsx`**

The search `<input>` relies solely on `placeholder` text. Placeholders disappear on focus and are not reliably announced by all screen readers.

```jsx
// ❌ Current
<input placeholder="Search books or authors…" … />

// ✅ Fix
<input aria-label="Search books or authors" placeholder="Search books or authors…" … />
```

---

### 4. "Add Book" Dropdown — Missing `aria-expanded` / `aria-haspopup`
**WCAG 2.1 A · SC 4.1.2 · File: `Books.jsx`**

The dropdown trigger button has no ARIA state to communicate that it controls a menu.

```jsx
// ❌ Current
<button onClick={() => setDdOpen(o => !o)}>+ Add Book …</button>

// ✅ Fix
<button
  onClick={() => setDdOpen(o => !o)}
  aria-expanded={ddOpen}
  aria-haspopup="menu"
>+ Add Book …</button>
```

---

### 5. Modal Close Button — No `aria-label`
**WCAG 2.1 A · SC 4.1.2 · File: `Books.jsx`**

The close button renders only a `<X>` icon with no accessible name.

```jsx
// ❌ Current
<button onClick={() => setModal(false)}><X size={18} /></button>

// ✅ Fix
<button onClick={() => setModal(false)} aria-label="Close dialog"><X size={18} /></button>
```

---

### 6. Form Labels Not Programmatically Associated
**WCAG 2.1 A · SC 1.3.1 · File: `Books.jsx` — `<Field>` component**

The `<label>` and `<input>` are visually adjacent but lack `htmlFor`/`id` linkage. Screen readers cannot announce which label belongs to which input.

```jsx
// ❌ Current
<label>Title</label>
<input … />

// ✅ Fix
<label htmlFor={`field-${fkey}`}>Title</label>
<input id={`field-${fkey}`} … />
// Apply same to <textarea> and <select>
```

---

### 7. Hidden File Inputs — No Accessible Label
**WCAG 2.1 A · SC 1.3.1 · File: `Books.jsx`**

`<input type="file" className="hidden">` elements have no associated label. Screen readers see an unlabelled file input.

```jsx
// ✅ Fix
<input ref={fileRef} type="file" accept="image/*" className="hidden"
  aria-label="Upload book cover image" … />
<input ref={scanRef} type="file" accept="image/*" className="hidden"
  aria-label="Upload cover image for OCR scan" … />
```

---

### 8. "View Details" Buttons — Ambiguous Name
**WCAG 2.1 A · SC 2.4.6 · File: `Books.jsx`**

Every book card has a "View Details" button. A screen reader user navigating by button will hear six identical "View Details" labels with no way to distinguish them.

```jsx
// ✅ Fix — add aria-label per book
<button aria-label={`View details for ${b.title}`} …>
  <BookOpen size={13} /> View Details
</button>
```

---

### 9. Activity Table — Missing `<caption>` and `scope` on `<th>`
**WCAG 2.1 A · SC 1.3.1 · File: `Dashboard.jsx`**

The `<table>` has no `<caption>` or `aria-label`, and `<th>` elements lack `scope="col"`, making column relationships ambiguous for screen readers.

```jsx
// ✅ Fix
<table className="w-full text-sm border-collapse" aria-label="Recent Activity">
  <thead>
    <tr>
      {["Book","Member","Action","Date"].map(h => (
        <th key={h} scope="col" …>{h}</th>
      ))}
    </tr>
  </thead>
```

---

### 10. Sidebar `<nav>` — No `aria-label`
**WCAG 2.1 A · SC 1.3.1 · File: `Sidebar.jsx`**

Multiple `<nav>` or `<aside>` elements on a page should be distinguished by an `aria-label`.

```jsx
// ✅ Fix
<nav aria-label="Main navigation" …>
```

---

### 11. Theme Toggle — No `aria-pressed` State
**WCAG 2.1 A · SC 4.1.2 · File: `Sidebar.jsx`**

The toggle button communicates state only via visual appearance (the pill position). Screen readers need `aria-pressed` to convey the on/off state.

```jsx
// ✅ Fix
<button
  aria-pressed={darkMode}
  aria-label={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
  …
>
```

---

### 12. OCR Scan Status — No Live Region
**WCAG 2.1 AA · SC 4.1.3 · File: `Books.jsx`**

Scan status messages are dynamically injected but have no `aria-live` region. Screen reader users will miss status updates.

```jsx
// ✅ Fix — wrap the status banner container
<div aria-live="polite" aria-atomic="true">
  {scanState !== SCAN_STATE.IDLE && (
    <div className="flex items-start gap-2.5 p-3.5 …">…</div>
  )}
</div>
```

---

### 13. Cover Upload Drag-and-Drop Zone — Keyboard Inaccessible
**WCAG 2.1 A · SC 2.1.1 · File: `Books.jsx`**

The drag-and-drop zone is a `<div>` with only mouse events. Keyboard users cannot activate it.

```jsx
// ✅ Fix
<div
  role="button"
  tabIndex={0}
  aria-label="Upload book cover image"
  onClick={() => fileRef.current?.click()}
  onKeyDown={e => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
  …
>
```

---

## ✅ What Passes

- `html[lang]` present and valid
- `document.title` present
- All `<img>` elements have `alt` text
- All interactive buttons (sidebar, topbar hamburger, close menu) have `aria-label`
- No nested interactive controls
- Viewport allows zoom/scaling
- `<h1>` present on pages
- Heading order is correct
- ARIA attribute usage is valid

---

## Priority Fix Order

| Priority | Issue | File | WCAG |
|----------|-------|------|------|
| 1 | Color contrast — `--text-muted` on white | `index.css` | 1.4.3 AA |
| 2 | Color contrast — amber button white text | `Books.jsx` | 1.4.3 AA |
| 3 | Color contrast — genre badge | `Books.jsx` | 1.4.3 AA |
| 4 | Color contrast — action badges | `Dashboard.jsx` | 1.4.3 AA |
| 5 | Form labels not associated | `Books.jsx` | 1.3.1 A |
| 6 | Search input no label | `Books.jsx` | 4.1.2 A |
| 7 | "View Details" ambiguous | `Books.jsx` | 2.4.6 A |
| 8 | Modal close no aria-label | `Books.jsx` | 4.1.2 A |
| 9 | Dropdown aria-expanded missing | `Books.jsx` | 4.1.2 A |
| 10 | Table no caption/scope | `Dashboard.jsx` | 1.3.1 A |
| 11 | Drag-drop keyboard inaccessible | `Books.jsx` | 2.1.1 A |
| 12 | OCR status no live region | `Books.jsx` | 4.1.3 AA |
| 13 | Theme toggle aria-pressed | `Sidebar.jsx` | 4.1.2 A |
| 14 | Nav aria-label | `Sidebar.jsx` | 1.3.1 A |
