# TODO: Fix Sidebar Hover Overlap

**Status: 2/3 steps completed**

## Steps:
1. ✅ Update Layout.jsx: Lift isHovered state, pass as props to Sidebar, update main marginLeft dynamically (58px collapsed, 220px expanded) with smooth transition.
2. ✅ Update Sidebar.jsx: Remove local isHovered state, use onMouseEnter/Leave on props.onHoverChange, pass isHovered to compute styles.
3. [ ] Test hover behavior, confirm no overlap and smooth content shift.

All edits complete. Ready for testing.

