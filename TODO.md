# Fix Lexora Excel Import: Add Sheet Selection
✅ **1. Create this TODO.md** (done)

**2. Update parseLexoraExcel() in BookAddImport.jsx**
- Return `{sheets:[], books:[]}` instead of flat array
- Track per-sheet books before global dedup

**3. Add sheet selection UI in Step 2**
- Checkbox list: sheet names + book counts
- Select All/None buttons
- Filter preview to selected sheets

**4. Modify runImport()**
- Filter `parsed` to selected sheets' books only
- Send subset to backend

**5. Update summary chips**
- Show selected sheets count, total selected books

**6. Test & attempt_completion**
- Upload multi-sheet Excel
- Select subset → import small batch
- Verify no limits hit, correct program/collection

**Status**: Ready for step 2.
