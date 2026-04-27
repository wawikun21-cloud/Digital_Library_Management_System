# Project Tree


```
📦Digital_Library_Management_System
 ┣ 📂client
 ┃ ┣ 📂public
 ┃ ┃ ┣ 📄.htaccess
 ┃ ┃ ┣ 📄expand-logo.png
 ┃ ┃ ┣ 📄icon.png
 ┃ ┃ ┣ 📄Landing Page.webp
 ┃ ┃ ┣ 📄Landing-page-logo.png
 ┃ ┃ ┣ 📄pattern.png
 ┃ ┃ ┣ 📄Screenshot 2026-03-04 200820.png
 ┃ ┃ ┣ 📄sidebar-logo.png
 ┃ ┃ ┗ 📄vite.svg
 ┃ ┣ 📂src
 ┃ ┃ ┣ 📂assets
 ┃ ┃ ┃ ┗ 📄react.svg
 ┃ ┃ ┣ 📂components
 ┃ ┃ ┃ ┣ 📂books
 ┃ ┃ ┃ ┃ ┣ 📄BookAddImport.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookForm.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookImport.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookModal.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookStatusFilter.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookToolbar.jsx
 ┃ ┃ ┃ ┃ ┣ 📄BookView.jsx
 ┃ ┃ ┃ ┃ ┣ 📄CopiesList.jsx
 ┃ ┃ ┃ ┃ ┣ 📄Lexorabookdetailmodal.jsx
 ┃ ┃ ┃ ┃ ┣ 📄Lexoraimport.jsx
 ┃ ┃ ┃ ┃ ┗ 📄Pagination.jsx
 ┃ ┃ ┃ ┣ 📂layout
 ┃ ┃ ┃ ┃ ┣ 📄BottomNav.jsx
 ┃ ┃ ┃ ┃ ┣ 📄Layout.jsx
 ┃ ┃ ┃ ┃ ┣ 📄Logo.jsx
 ┃ ┃ ┃ ┃ ┣ 📄Sidebar.jsx
 ┃ ┃ ┃ ┃ ┗ 📄Topbar.jsx
 ┃ ┃ ┃ ┣ 📂students
 ┃ ┃ ┃ ┣ 📄AttendanceTable.jsx
 ┃ ┃ ┃ ┣ 📄AutocompleteField.jsx
 ┃ ┃ ┃ ┣ 📄BookTable.jsx
 ┃ ┃ ┃ ┣ 📄BorrowedCard.jsx
 ┃ ┃ ┃ ┣ 📄BorrowedTable.jsx
 ┃ ┃ ┃ ┣ 📄ConfirmationModal.jsx
 ┃ ┃ ┃ ┣ 📄DropdownMenu.jsx
 ┃ ┃ ┃ ┣ 📄FilterBadge.jsx
 ┃ ┃ ┃ ┣ 📄LexoraBookTable.jsx
 ┃ ┃ ┃ ┣ 📄StatsCard.jsx
 ┃ ┃ ┃ ┗ 📄Toast.jsx
 ┃ ┃ ┣ 📂constants
 ┃ ┃ ┃ ┣ 📄index.js
 ┃ ┃ ┃ ┗ 📄theme.js
 ┃ ┃ ┣ 📂data
 ┃ ┃ ┣ 📂hooks
 ┃ ┃ ┃ ┣ 📄useBooks.js
 ┃ ┃ ┃ ┣ 📄useDashboard.js
 ┃ ┃ ┃ ┣ 📄useDebounce.js
 ┃ ┃ ┃ ┣ 📄useLocalStorage.js
 ┃ ┃ ┃ ┣ 📄useToast.js
 ┃ ┃ ┃ ┗ 📄useWebsocket.js
 ┃ ┃ ┣ 📂landing
 ┃ ┃ ┃ ┗ 📄landingpage.jsx
 ┃ ┃ ┣ 📂pages
 ┃ ┃ ┃ ┣ 📄Attendance.jsx
 ┃ ┃ ┃ ┣ 📄AttendanceDashboard.jsx
 ┃ ┃ ┃ ┣ 📄AuditLog.jsx
 ┃ ┃ ┃ ┣ 📄Books.jsx
 ┃ ┃ ┃ ┣ 📄Borrowed.jsx
 ┃ ┃ ┃ ┣ 📄Dashboard.jsx
 ┃ ┃ ┃ ┣ 📄Faculty.jsx
 ┃ ┃ ┃ ┣ 📄KioskAttendance.jsx
 ┃ ┃ ┃ ┣ 📄LexoraBooks.jsx
 ┃ ┃ ┃ ┣ 📄Login.jsx
 ┃ ┃ ┃ ┣ 📄RecentlyDeleted.jsx
 ┃ ┃ ┃ ┣ 📄Students.jsx
 ┃ ┃ ┃ ┗ 📄StudentsDashboard.jsx
 ┃ ┃ ┣ 📂services
 ┃ ┃ ┃ ┗ 📂api
 ┃ ┃ ┃ ┃ ┣ 📄analyticsApi.js
 ┃ ┃ ┃ ┃ ┣ 📄attendanceApi.js
 ┃ ┃ ┃ ┃ ┣ 📄auditApi.js
 ┃ ┃ ┃ ┃ ┣ 📄authApi.js
 ┃ ┃ ┃ ┃ ┣ 📄booksApi.js
 ┃ ┃ ┃ ┃ ┣ 📄index.js
 ┃ ┃ ┃ ┃ ┣ 📄rfidApi.js
 ┃ ┃ ┃ ┃ ┣ 📄searchApi.js
 ┃ ┃ ┃ ┃ ┣ 📄studentsApi.js
 ┃ ┃ ┃ ┃ ┣ 📄transactionsApi.js
 ┃ ┃ ┃ ┃ ┗ 📄trashApi.js
 ┃ ┃ ┣ 📂styles
 ┃ ┃ ┃ ┣ 📄App.css
 ┃ ┃ ┃ ┣ 📄books.css
 ┃ ┃ ┃ ┣ 📄borrowed.css
 ┃ ┃ ┃ ┣ 📄index.css
 ┃ ┃ ┃ ┣ 📄Layout.css
 ┃ ┃ ┃ ┣ 📄Pages.css
 ┃ ┃ ┃ ┣ 📄Sidebar.css
 ┃ ┃ ┃ ┗ 📄Topbar.css
 ┃ ┃ ┣ 📂utils
 ┃ ┃ ┃ ┣ 📄helpers.js
 ┃ ┃ ┃ ┣ 📄index.js
 ┃ ┃ ┃ ┣ 📄storage.js
 ┃ ┃ ┃ ┗ 📄validation.js
 ┃ ┃ ┣ 📄App.jsx
 ┃ ┃ ┗ 📄main.jsx
 ┃ ┣ 📄.env.example
 ┃ ┣ 📄.env.frontend
 ┃ ┣ 📄eslint.config.js
 ┃ ┣ 📄index.html
 ┃ ┣ 📄package-lock.json
 ┃ ┣ 📄package.json
 ┃ ┣ 📄postcss.config.js
 ┃ ┣ 📄tailwind.config.js
 ┃ ┗ 📄vite.config.js
 ┣ 📂docs
 ┃ ┣ 📄README.md
 ┃ ┗ 📄TODO.md
 ┣ 📂server
 ┃ ┣ 📂config
 ┃ ┃ ┣ 📄db.js
 ┃ ┃ ┗ 📄email.js
 ┃ ┣ 📂controllers
 ┃ ┃ ┣ 📄analyticsController.js
 ┃ ┃ ┣ 📄attendanceController.js
 ┃ ┃ ┣ 📄auditController.js
 ┃ ┃ ┣ 📄authController.js
 ┃ ┃ ┣ 📄booksController.js
 ┃ ┃ ┣ 📄lexoraController.js
 ┃ ┃ ┣ 📄rfidController.js
 ┃ ┃ ┣ 📄searchController.js
 ┃ ┃ ┣ 📄studentsController.js
 ┃ ┃ ┣ 📄transactionsController.js
 ┃ ┃ ┗ 📄trashController.js
 ┃ ┣ 📂middleware
 ┃ ┃ ┣ 📄authMiddleware.js
 ┃ ┃ ┗ 📄upload.js
 ┃ ┣ 📂migrations
 ┃ ┃ ┗ 📄add_lexora_title_author_unique.sql
 ┃ ┣ 📂models
 ┃ ┃ ┣ 📄Attendance.js
 ┃ ┃ ┣ 📄AuditLog.js
 ┃ ┃ ┣ 📄Book.js
 ┃ ┃ ┣ 📄Faculty.js
 ┃ ┃ ┣ 📄LexoraBook.js
 ┃ ┃ ┣ 📄RfidCard.js
 ┃ ┃ ┣ 📄Student.js
 ┃ ┃ ┣ 📄Transaction.js
 ┃ ┃ ┣ 📄Trash.js
 ┃ ┃ ┗ 📄User.js
 ┃ ┣ 📂routes
 ┃ ┃ ┣ 📄analytics.js
 ┃ ┃ ┣ 📄attendance.js
 ┃ ┃ ┣ 📄audit.js
 ┃ ┃ ┣ 📄auth.js
 ┃ ┃ ┣ 📄books.js
 ┃ ┃ ┣ 📄rfid.js
 ┃ ┃ ┣ 📄search.js
 ┃ ┃ ┣ 📄students.js
 ┃ ┃ ┣ 📄transactions.js
 ┃ ┃ ┗ 📄trash.js
 ┃ ┣ 📂services
 ┃ ┃ ┣ 📄analyticsService.js
 ┃ ┃ ┣ 📄auditService.js
 ┃ ┃ ┣ 📄booksService.js
 ┃ ┃ ┣ 📄emailService.js
 ┃ ┃ ┗ 📄schedulerService.js
 ┃ ┣ 📂utils
 ┃ ┃ ┣ 📄ApiError.js
 ┃ ┃ ┣ 📄asyncHandler.js
 ┃ ┃ ┣ 📄index.js
 ┃ ┃ ┣ 📄responseFormatter.js
 ┃ ┃ ┣ 📄validation.js
 ┃ ┃ ┗ 📄websocket.js
 ┃ ┣ 📄.env.example
 ┃ ┣ 📄database.sql
 ┃ ┣ 📄index.js
 ┃ ┣ 📄migration_analytics.sql
 ┃ ┣ 📄package-lock.json
 ┃ ┗ 📄package.json
 ┣ 📄.gitignore
 ┗ 📄TODO.md
```
