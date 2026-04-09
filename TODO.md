# Soft-Delete Fix for Books
## Status: [ ] In Progress

### Steps:
- [x] Step 1: Implement TrashModel import and softDelete in BookModel.delete()
- [x] Step 2: Add `AND deleted_at IS NULL` to getAll(), filter(), search()
- [x] Step 1: Implement TrashModel import and softDelete in BookModel.delete()
- [x] Step 2: Add `AND deleted_at IS NULL` to getAll(), filter(), search()
- [x] Step 3: Add filter to getById(), getCount(), getStats()
- [x] Step 4: Update bulk/import methods with deleted_at check
- [ ] Step 5: Test delete → RecentlyDeleted → restore
- [ ] Step 6: Server restart & full verification

**Next**: Step 5 - Testing in progress
