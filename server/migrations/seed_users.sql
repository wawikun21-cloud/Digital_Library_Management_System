-- ============================================================
--  Lexora E-Library — Seed Users
--  File:     server/migrations/seed_users.sql
--  Run via:  Hostinger hPanel → phpMyAdmin → pick your database
--            → "SQL" tab → paste this file → "Go"
-- ============================================================
--
--  PURPOSE
--    Inserts one user per role so you can log in right after
--    deploying to a fresh production database. In production the
--    server intentionally skips creating default dev users
--    (see server/config/db.js, "No DEFAULT_ADMIN_USERNAME/PASSWORD
--    set — skipping default admin creation"), so this seed is the
--    intended way to create the first accounts.
--
--  DEFAULT PASSWORD FOR ALL SEEDED USERS:  password123
--    The hash below is bcrypt with cost factor 10 — exactly what
--    the server produces via bcrypt.hash(password, 10)
--    (server/features/users/users.repository.js), so login works
--    immediately. CHANGE THE PASSWORD after the first login.
--
--  PREREQUISITE
--    The `users` table must already exist with the current schema.
--    It is created/updated automatically every time the server
--    starts (initDatabase + migrateSchema in server/config/db.js).
--    The root database_schema.sql is OUTDATED — if you imported it
--    manually, start the server once first so the newer columns
--    (is_active, full_name, email, ...) are added.
--
--  SAFE TO RE-RUN
--    Rows are keyed on the `username` and `uk_users_email` unique
--    keys, so re-running refreshes the profile fields instead of
--    creating duplicates. To keep a lost password recoverable the
--    seed also restores the default password (see optional RESET
--    block at the bottom if you prefer to keep existing ones).
-- ============================================================

-- One user per role: super_admin, admin, librarian, staff, student
INSERT INTO `users`
  (`username`, `password`, `role`, `full_name`, `email`, `is_active`)
VALUES
  ('superadmin', '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW', 'super_admin', 'Super Administrator', 'superadmin@lexora.local', 1),
  ('admin',      '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW', 'admin',       'System Administrator', 'admin@lexora.local',      1),
  ('librarian',  '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW', 'librarian',   'Head Librarian',       'librarian@lexora.local',  1),
  ('staff',      '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW', 'staff',       'Staff User',           'staff@lexora.local',      1),
  ('student',    '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW', 'student',     'Student User',         'student@lexora.local',    1)
ON DUPLICATE KEY UPDATE
  `role`       = VALUES(`role`),
  `full_name`  = VALUES(`full_name`),
  `email`      = VALUES(`email`),
  `is_active`  = VALUES(`is_active`),
  `updated_at` = CURRENT_TIMESTAMP;

-- ------------------------------------------------------------
-- OPTIONAL — also force-reset the seed passwords to "password123"
-- on every run. Only needed if an existing user's password is
-- lost. Uncomment, run, then change the password after login.
-- ------------------------------------------------------------
-- UPDATE `users`
--    SET `password`   = '$2b$10$1XOFHIhTxwMjnNNifFF0D.pE3Ux7aK2PDMcIZIEHdik3xXqcgaKYW',
--        `updated_at` = CURRENT_TIMESTAMP
--  WHERE `username` IN ('superadmin', 'admin', 'librarian', 'staff', 'student');

-- ------------------------------------------------------------
-- Verify — expect 5 rows, one per role
-- ------------------------------------------------------------
SELECT `id`, `username`, `role`, `full_name`, `email`, `is_active`, `created_at`
FROM `users`
ORDER BY FIELD(`role`, 'super_admin', 'admin', 'librarian', 'staff', 'student');
