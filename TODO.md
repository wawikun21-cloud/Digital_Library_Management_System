# Library System: Bulk Upload + Hybrid Normalized DB
## Current Progress: [Phase 0/7] ✅ Planning Complete

### Phase 0: Planning & Analysis ✅
- [x] Analyze current DB/schema/models
- [x] Current: denormalized books table (1 row/copy)
- [x] Design: books (titles) 1→* book_copies *→1 borrow_transactions
- [x] Get user approval

### Phase 1: Database Migration
- [ ] Create migrate-hybrid-schema.sql
- [ ] Add books_new, book_copies, borrow_transactions tables
- [ ] Migrate data: split books → titles + copies
- [ ] Add constraints/indexes
- [ ] Update server/config/db.js (init new tables)

### Phase 2: Backend Models
- [ ] server/models/Book.js → Titles only (remove accession/quantity)
- [ ] NEW server/models/BookCopy.js
- [ ] NEW server/models/BorrowTransaction.js

### Phase 3: Backend Controllers & Routes
- [ ] NEW server/controllers/bulkImportController.js
- [ ] NEW server/routes/bulk-import.js (POST /api/bulk-import)
- [ ] Update booksController.js (titles endpoint)

### Phase 4: Excel Processing Service
- [ ] NEW server/services/excelParser.js (xlsx parsing + upsert logic)

### Phase 5: Frontend Integration
- [ ] Update BookAddImport.jsx → POST /api/bulk-import
- [ ] Update BookView.jsx → Show copies list
- [ ] NEW CopyStatus UI components

### Phase 6: Testing
- [ ] Test migration (sample data)
- [ ] Test bulk upload (Excel)
- [ ] Test borrow/return per copy

### Phase 7: Polish & Indexes
- [ ] Add transactions to bulk import
- [ ] Performance indexes (accession, status)
- [ ] Complete ✅

**Next: Phase 1 → Create migration script**
