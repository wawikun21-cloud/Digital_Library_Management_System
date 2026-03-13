# Accessibility Audit Report - Library System
**Date:** 2026-03-13
**Scope:** Books View Modal, Edit Book Modal

## Summary
The audit was performed using axe-core. Several "serious" violations were found related to ARIA labeling, color contrast, and keyboard navigation.

## Critical Issues

### 1. Missing Accessible Name for Dialogs
- **Violation:** `aria-dialog-name`
- **Impact:** Serious
- **Location:** `BookModal.jsx` (Root dialog container)
- **Description:** The modal container (`role="dialog"`) does not have an `aria-label` or `aria-labelledby` attribute. Screen reader users will not know the context of the dialog when it opens.
- **Recommendation:** Add `aria-labelledby` to the dialog container pointing to the modal title ID.

### 2. Insufficient Color Contrast
- **Violation:** `color-contrast`
- **Impact:** Serious
- **Location:** `BookView.jsx` (Labels like "Accession No.", "Title", etc.)
- **Description:** Foreground color `#778b97` on background `#f6fafd` has a contrast ratio of 3.37:1, which is below the WCAG AA requirement of 4.5:1.
- **Recommendation:** Darken the `TEXT_MUTED` color in `theme.js` or the specific component.

### 3. Scrollable Region Not Focusable
- **Violation:** `scrollable-region-focusable`
- **Impact:** Serious
- **Location:** `BookModal.jsx` (Body container `.overflow-y-auto`)
- **Description:** The scrollable body contains content that might exceed the viewport, but the region itself is not keyboard focusable, making it difficult for keyboard users to scroll.
- **Recommendation:** Add `tabIndex="0"` to the scrollable container and ensure it has an accessible name.

## UX Observations
- **Information Overload:** The Edit Book form contains 22+ fields without any logical grouping, making it difficult to scan and complete.
- **Visual Hierarchy:** The Book View modal lacks clear grouping of identifiers vs. content metadata.
- **Interactive States:** While focus rings exist, they could be more prominent to match a "native desktop app" feel.

## Proposed Fixes
1.  **Group Form Fields:** Categorize fields into "Basic Information", "Identifiers", and "Physical Details".
2.  **Refine "Book View" Layout:** Use a structured grid with clear section headers.
3.  **Update Design Tokens:** Adjust muted text colors to meet WCAG standards.
4.  **Enhance ARIA attributes:** Correctly link labels to inputs and title the modals.
