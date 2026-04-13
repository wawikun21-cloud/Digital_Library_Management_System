# Digital Library Email Reminder Implementation

**Status:** In progress

## Steps:

- [x] Understand borrowing flow (Borrowed.jsx → transactionsController.create → TransactionModel.create)
- [x] Install `nodemailer` (`npm install nodemailer`)
- [x] Create `server/config/email.js`
- [x] Create `server/services/emailService.js`
- [x] Edit `server/controllers/transactionsController.js` (add email after create)
- [ ] Add to `.env`: GMAIL_USER=yourgmail@gmail.com, GMAIL_APP_PASSWORD=kjvi hgfw nhba uthw
- [ ] Restart server (`npm run dev` or Ctrl+C + npm start)
- [ ] Test: Borrow book with valid email → check inbox for reminder

**Notes:**
- Gmail: Use provided App Password
- Email sent post-confirmation (after DB insert)
- Graceful failure: Transaction succeeds even if email fails (log error only)
- Message: "Thank you for borrowing our book &#39;{title}&#39;. Must return by {dueDate}."
