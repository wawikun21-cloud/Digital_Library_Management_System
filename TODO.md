de# Audit Logging for KioskAttendance RFID Taps (Check In / Check Out)

**Approved Plan Implementation:**

- [x] 1. Create this TODO.md with checklist
- [x] 2. Add auditService import to server/controllers/rfidController.js
- [x] 3. Add non-blocking logAction call in rfidController.tap() success block (action=CHECK_IN/CHECK_OUT, user=system/kiosk, entity=attendance)
- [x] 4. Add similar logAction in rfidController.simulate() success block ✅
- [x] 5. Update TODO.md mark steps 2-4 complete
- [ ] 6. Restart server: cd server && taskkill /f /im node.exe & npm start
- [ ] 7. Test: KioskAttendance activate RFID → /api/rfid/simulate?rfid_code=registered_card → check AuditLog page WS updates
- [ ] 8. Test check-out (2nd tap)
- [ ] 9. Verify audit entries show correct entity_id, rfid_code, student details

**Previous Task (Trash Audit): Code complete, restart/tests pending.**

**Status:** Code changes complete. Restart server and test kiosk RFID taps → AuditLog WS updates.

