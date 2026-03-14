# Implementation Plan

## Overview
Make sidebar-logo.png significantly larger and more visible when sidebar is expanded, while keeping collapsed state compact with icon.png. Addresses user feedback that logo doesn't "change the width and height of the actual image" despite class changes.

The sidebar uses hover-to-expand pattern with fixed 57px anchor slot. Current expanded class `w-[180px] h-16` should force size, but PNG intrinsic dimensions/padding + `object-contain` makes logo content appear small. Solution: Increase dimensions further, use `object-fill` to stretch full image to box (ignores aspect, forces fill), add `max-w-none`. Preserve hover logic, no other files changed.

## Types
No type system changes (JSX/React, no TypeScript strict).

## Files
Modify 1 existing file: `client/src/components/layout/Sidebar.jsx` - update img className for expanded state to force larger visible size.

No new files, deletions, or config changes.

## Functions
No function modifications (component render logic only).

## Classes
No class modifications.

## Dependencies
No dependency modifications.

## Testing
Manual visual test: hover sidebar to verify expanded logo fills large box visibly. Check collapsed icon compact. No unit tests needed (UI component).

## Implementation Order
Single step atomic change.

1. edit_file `client/src/components/layout/Sidebar.jsx`: Update expanded classes to `w-[200px] h-20 object-fill max-w-none` (stretch-forces fill, extra large 80px height, disables max-width).
