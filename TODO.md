# Digital Library Management System - Badge/Quantity Fix TODO

## Approved Plan Status: ✅ Confirmed (LandingPage.jsx only)

**Current Progress:**
- [x] Analyzed all relevant files (BookTable.jsx ✅ correct, Landingpage.jsx ❌ wrong badge)
- [x] Confirmed backend TransactionModel correctly syncs quantity
- [x] Plan approved: Fix statusColor() in landingpage.jsx to check quantity first

**Remaining Steps:**
1. [ ] Edit `client/src/landing/landingpage.jsx` - Update statusColor(book) to prioritize quantity===0 → red "Out of Stock"
2. [ ] Test: Borrow book → Landing search → Verify red badge when qty=0  
3. [ ] `attempt_completion`

**Next Action:** Apply the single-line statusColor fix to landingpage.jsx
