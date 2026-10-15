-- Per-school module license: controls which feature surface a school's
-- scoped users can reach.
--   'both'    → physical library + Lexora digital books (default, legacy behavior)
--   'library' → physical library only; Lexora reads return empty / 404
--   'lexora'  → Lexora only; physical library reads return empty / 404
--
-- Also created automatically by initDatabase()/migrateSchema() in config/db.js;
-- this file is for manual runs / deploys that only run the migrations folder.
ALTER TABLE schools
ADD COLUMN feature_set ENUM('library','lexora','both') NOT NULL DEFAULT 'both';
