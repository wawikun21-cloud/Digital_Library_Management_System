# Lexora E-Library – Features Overview

## Core Modules

### 📚 Book Management
- Add, edit, and delete book records with cover images
- Bulk import books via CSV/Excel (`BookAddImport`, `Lexoraimport`)
- Dedicated **Lexora** book catalogue with author & title validation
- Status filtering (Available, Borrowed, Reseved, Archived, etc.)
- View individual book details and copy counts (`CopiesList`, `BookModal`)
- Soft-delete with **Recently Deleted** recovery (`Trash` module)

### 👩‍🎓 Student & Faculty Management
- CRUD operations for student and faculty records
- **Students Dashboard** with role-based registration (Student / Librarian / Admin)
- Associated borrowed-book history per student
- Auto-complete search fields for quick lookup

### 🔄 Borrowing & Transactions
- Issue and return books with due-date enforcement
- Real-time transaction history per student (`Borrowed`, `BorrowedTable`)
- Email notifications for overdue returns (via nodemailer)
- Overdue reminder scheduler (node-cron)

### 📊 Attendance Tracking
- Manual attendance entry and Kiosk-style attendance modes
- Attendance dashboard with per-student statistics and charts (`recharts`)
- Table view with per-session filtering (`AttendanceTable`)

### 🔑 Authentication & Access Control
- Role-based login: **Student**, **Librarian**, **Admin**
- Session management via express-session
- Password hashing with bcrypt/bcryptjs
- Rate limiting on auth endpoints

### 🏷️ RFID Integration
- RFID card tap for check-in / check-out at library kiosk
- Simulate mode for testing without physical hardware
- Real-time WebSocket updates via socket.io
- RFID model tracks card ownership and activity state

### 🔍 Search
- Fuzzy search powered by Fuse.js across books and students
- Debounced search input for UI performance

### 🗑️ Audit Logging
- Immutable audit trail for all sensitive operations (CRUD, auth, RFID taps)
- WebSocket-driven real-time updates on the AuditLog page
- Supports entity tracking: attendance, transactions, books, trash, users

### 🗑️ Trash / Soft Delete
- Soft-delete support for books, students, and transactions
- Preview and restore items from the **Recently Deleted** page

### 📈 Analytics
- Dashboard with charts showing borrowing trends, attendance stats, and library health
- Model-level aggregation services for report generation

### 🖨️ Export
- Export book and attendance data as Excel (xlsx) or PDF (jspdf + jspdf-autotable)

### 💬 Real-Time Notifications
- Toast notification system (`Toast`, `useToast`) for user feedback

### 🗺️ Floor Map
- Library floor-map view using Leaflet / react-leaflet

### 🌐 Backend Services
- **Express.js** REST API with full CRUD routes
- **MySQL** database (mysql2 driver)
- **WebSocket** server for live updates (socket.io)
- **Google Cloud Vision** OCR integration placeholder (`@google-cloud/vision`)
- Email service for automated notifications
- CORS and rate-limit middleware for security

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS · Radix UI |
| Backend | Node.js · Express · Socket.io |
| Database | MySQL 8 |
| Auth | express-session · bcrypt |
| Utilities | Fuse.js · nodemailer · node-cron · xlsx · jspdf |
| Maps | Leaflet / react-leaflet |
| Charts | Recharts |
