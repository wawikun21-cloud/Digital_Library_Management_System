// ─────────────────────────────────────────────────────────
//  config/db.js
//  MySQL Database Connection & Initialization
// ─────────────────────────────────────────────────────────

const mysql  = require("mysql2/promise");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const {
  PERMISSION_CATALOG,
  SEED_ROLES,
  SEED_ROLE_GRANTS,
  SEED_BATCHES,
} = require("../features/roles/permissionCatalog");

const dbConfig = {
  host:               process.env.DB_HOST     || "localhost",
  port:               process.env.DB_PORT     || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "lexora",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Return DATE/DATETIME columns as plain strings (e.g. "2025-03-15")
  // instead of JS Date objects, which shift the date by timezone offset.
  dateStrings: true,
};

const createDatabase = process.env.DB_CREATE_DATABASE === "true" ||
  (process.env.DB_CREATE_DATABASE !== "false" && process.env.NODE_ENV !== "production");
const pool = mysql.createPool(dbConfig);

/**
 * One-time repair for rows that predate the roles table, when the only
 * role value was '' (blank = no grants at all, so the user could not use
 * the app). Those rows are promoted to super_admin, matching what this
 * migration always intended.
 *
 * 'admin' MUST NOT be rewritten here. It used to mean the single top role,
 * so this upgrade once promoted it on every boot. Now 'admin' is a real,
 * seeded role with its own grant set, while super_admin short-circuits
 * every permission check — re-promoting 'admin' silently undid every
 * demotion a Super Admin made: the demotion never survived a restart, and
 * with the user back at super_admin their permission restrictions stopped
 * applying as well.
 *
 * The repair is naturally idempotent (once no blank-role rows remain it is
 * a no-op), so unlike the permission seed it needs no batch marker.
 *
 * @returns {Promise<number>} rows promoted
 */
async function repairLegacyUserRoles(conn) {
  const [unroled] = await conn.query("SELECT id FROM users WHERE role = ''");
  if (unroled.length === 0) return 0;

  await conn.query("UPDATE users SET role = 'super_admin' WHERE role = ''");
  console.log(`✅ Promoted ${unroled.length} legacy unroled user(s) to super_admin`);
  return unroled.length;
}

async function initDatabase() {
  try {
    const connectionConfig = {
      host: dbConfig.host, port: dbConfig.port,
      user: dbConfig.user, password: dbConfig.password,
    };

    if (createDatabase) {
      const conn = await mysql.createConnection(connectionConfig);
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await conn.end();
      console.log(`✅ Database '${dbConfig.database}' ready`);
    }

    const conn = await mysql.createConnection({
      ...connectionConfig,
      database: dbConfig.database,
    });

    // ── users ──────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                 INT          AUTO_INCREMENT PRIMARY KEY,
        username           VARCHAR(100) NOT NULL UNIQUE,
        password           VARCHAR(255) NOT NULL,
        role               VARCHAR(50)  NOT NULL DEFAULT 'admin',
        avatar_url         MEDIUMTEXT   NULL,
        created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active          TINYINT(1)   NOT NULL DEFAULT 1,
        full_name          VARCHAR(255) NULL,
        email              VARCHAR(255) NULL,
        position_title     VARCHAR(255) NULL,
        employee_id        VARCHAR(100) NULL,
        contact_number     VARCHAR(50)  NULL,
        date_hired         DATE         NULL,
        birthdate          DATE         NULL,
        address            TEXT         NULL,
        employment_status  VARCHAR(100) NULL,
        student_id_number  VARCHAR(100) NULL,
        INDEX idx_users_role (role),
        INDEX idx_users_active (is_active),
        UNIQUE KEY uk_users_email (email)
      )
    `);

    // ── user_role_history (audit trail for role changes) ───
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_role_history (
        id         INT          AUTO_INCREMENT PRIMARY KEY,
        user_id    INT          NOT NULL,
        old_role   VARCHAR(50)  NULL,
        new_role   VARCHAR(50)  NOT NULL,
        changed_by INT          NULL,
        reason     TEXT         NULL,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log("✅ Users table ready");

    const [existing] = await conn.query("SELECT id FROM users LIMIT 1");
    if (existing.length === 0) {
      const defaultAdminUser = process.env.DEFAULT_ADMIN_USERNAME;
      const defaultAdminPass = process.env.DEFAULT_ADMIN_PASSWORD;
      const defaultHashed = await bcrypt.hash("password123", 10);

      if (defaultAdminUser && defaultAdminPass) {
        const hashed = await bcrypt.hash(defaultAdminPass, 10);
        await conn.query(
          "INSERT INTO users (username, password, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, 1)",
          [defaultAdminUser, hashed, "super_admin", "System Administrator", "admin@lexora.local"]
        );
        console.log(`✅ Default Super Admin created → username: ${defaultAdminUser}`);
      } else if (process.env.NODE_ENV === "production") {
        console.warn("⚠️  No DEFAULT_ADMIN_USERNAME/PASSWORD set — skipping default admin creation. Manual user creation required.");
      } else {
        // Dev seed: create one user of each managed role
        const seedUsers = [
          { username: "superadmin", role: "super_admin", full_name: "Super Admin",        email: "superadmin@lexora.local", password: defaultHashed },
          { username: "admin",       role: "admin",        full_name: "Administrator",       email: "admin@lexora.local",       password: defaultHashed },
          { username: "librarian",   role: "librarian",    full_name: "Librarian User",     email: "librarian@lexora.local",  password: defaultHashed },
          { username: "staff",       role: "staff",        full_name: "Staff User",         email: "staff@lexora.local",      password: defaultHashed },
          { username: "student",     role: "student",      full_name: "Student User",        email: "student@lexora.local",    password: defaultHashed },
        ];

        for (const su of seedUsers) {
          await conn.query(
            "INSERT INTO users (username, password, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, 1)",
            [su.username, su.password, su.role, su.full_name, su.email]
          );
        }
        console.log("✅ Default seeded users created (dev only) → username: superadmin/admin/librarian/staff/student / password: password123");
      }
    } else {
      await repairLegacyUserRoles(conn);
    }

    // ── books ──────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS books (
        id              INT          AUTO_INCREMENT PRIMARY KEY,
        title           VARCHAR(255) NOT NULL,
        subtitle        VARCHAR(255) NULL,
        author          VARCHAR(255) NULL,
        authors         TEXT         NULL,
        genre           VARCHAR(100) NULL,
        isbn            VARCHAR(50)  NULL,
        issn            VARCHAR(20)  NULL,
        lccn            VARCHAR(20)  NULL,
        accessionNumber VARCHAR(50)  NULL,
        callNumber      VARCHAR(100) NULL,
        year            INT          NULL,
        date            INT          NULL,
        publisher       VARCHAR(255) NULL,
        edition         VARCHAR(50)  NULL,
        materialType    VARCHAR(50)  NULL,
        subtype         VARCHAR(50)  NULL,
        extent          VARCHAR(100) NULL,
        size            VARCHAR(50)  NULL,
        volume          VARCHAR(20)  NULL,
        authorName      VARCHAR(255) NULL,
        authorDates     VARCHAR(50)  NULL,
        place           VARCHAR(255) NULL,
        description     TEXT         NULL,
        otherDetails    TEXT         NULL,
        shelf           VARCHAR(100) NULL,
        pages           VARCHAR(20)  NULL,
        sublocation     VARCHAR(255) NULL,
        collection      VARCHAR(50)  NULL,
        status          VARCHAR(50)  DEFAULT 'Available',
        cover           TEXT         NULL,
        quantity        INT          DEFAULT 1,
        created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_accession  (accessionNumber),
        INDEX idx_authors    (authors(100)),
        INDEX idx_callNumber (callNumber),
        INDEX idx_title      (title)
      )
    `);
    console.log("✅ Books table ready");

    // ── book_copies ────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS book_copies (
        id               INT         AUTO_INCREMENT PRIMARY KEY,
        book_id          INT         NOT NULL,
        accession_number VARCHAR(50) NOT NULL UNIQUE,
        status           ENUM('Available','Borrowed','Reserved','Lost','Damaged')
                                     DEFAULT 'Available',
        date_acquired    DATE        NULL,
        condition_notes  TEXT        NULL,
        created_at       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        INDEX idx_book_id (book_id),
        INDEX idx_acc     (accession_number),
        INDEX idx_status  (status)
      )
    `);
    console.log("✅ Book copies table ready");

    // ── borrowed_books ─────────────────────────────────
    // FIX: complete column set so Transaction model never hits "Unknown column"
    await conn.query(`
      CREATE TABLE IF NOT EXISTS borrowed_books (
        id                 INT          AUTO_INCREMENT PRIMARY KEY,
        book_id            INT          NOT NULL,
        accession_number   VARCHAR(50)  NULL,
        borrower_type      VARCHAR(20)  NOT NULL DEFAULT 'student',
        borrower_name      VARCHAR(255) NOT NULL,
        borrower_id_number VARCHAR(50)  NULL,
        borrower_contact   VARCHAR(100) NULL,
        borrower_email     VARCHAR(255) NULL,
        borrower_course    VARCHAR(100) NULL,
        borrower_yr_level  VARCHAR(20)  NULL,
        borrow_date        DATE         NOT NULL DEFAULT (CURDATE()),
        due_date           DATE         NOT NULL,
        return_date        DATE         NULL,
        status             VARCHAR(50)  NOT NULL DEFAULT 'Borrowed',
        fine_paid          TINYINT(1)   NOT NULL DEFAULT 0,
        fine_amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        INDEX idx_book_id          (book_id),
        INDEX idx_borrower_id      (borrower_id_number),
        INDEX idx_status           (status),
        INDEX idx_due_date         (due_date),
        INDEX idx_accession_number (accession_number)
      )
    `);
    console.log("✅ Borrowed books table ready");

    // ── lexora_books ───────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS lexora_books (
        id             INT           AUTO_INCREMENT PRIMARY KEY,
        title          VARCHAR(500)  NOT NULL,
        author         VARCHAR(500)  NULL,
        year           SMALLINT      NULL,
        collection     VARCHAR(150)  NULL,
        source         TEXT          NULL,
        resource_type  VARCHAR(50)   NULL,
        format         VARCHAR(50)   NULL,
        program        VARCHAR(150)  NULL,
        subject_course VARCHAR(500)  NULL,
        created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subject_course (subject_course(191)),
        INDEX idx_program        (program),
        INDEX idx_resource_type  (resource_type)
      )
    `);
    console.log("✅ Lexora books table ready");

    // ── courses ────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        category VARCHAR(100) DEFAULT NULL,
        difficulty ENUM('beginner','intermediate','advanced','all_levels') NOT NULL DEFAULT 'beginner',
        status ENUM('draft','published','archived','under_review') NOT NULL DEFAULT 'draft',
        instructor_id INT DEFAULT NULL,
        thumbnail_url VARCHAR(500) DEFAULT NULL,
        prerequisites JSON DEFAULT NULL,
        learning_outcomes JSON DEFAULT NULL,
        max_enrollments INT DEFAULT NULL,
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        grading_scale ENUM('STANDARD','PERCENTAGE','PASS_FAIL') NOT NULL DEFAULT 'STANDARD',
        allow_self_enrollment BOOLEAN NOT NULL DEFAULT TRUE,
        send_completion_certificates BOOLEAN NOT NULL DEFAULT FALSE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_courses_status (status),
        INDEX idx_courses_category (category),
        INDEX idx_courses_instructor (instructor_id),
        INDEX idx_courses_deleted (is_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Courses table ready");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS course_modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        type ENUM('chapter','unit','lesson','section','topic') NOT NULL DEFAULT 'chapter',
        order_index INT NOT NULL DEFAULT 0,
        release_date DATETIME DEFAULT NULL,
        due_date DATETIME DEFAULT NULL,
        is_graded BOOLEAN NOT NULL DEFAULT FALSE,
        max_score INT DEFAULT NULL,
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        INDEX idx_course_modules_course (course_id),
        INDEX idx_course_modules_order (course_id, order_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Course modules table ready");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS module_content (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        type ENUM('video','reading','document','quiz','assignment','link','presentation','downloadable','live_session','interactive','sop','certificate') NOT NULL DEFAULT 'reading',
        description TEXT DEFAULT NULL,
        order_index INT NOT NULL DEFAULT 0,
        url VARCHAR(2048) DEFAULT NULL,
        duration INT DEFAULT NULL,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        allow_access_after DATETIME DEFAULT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE,
        INDEX idx_module_content_module (module_id),
        INDEX idx_module_content_order (module_id, order_index)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Module content table ready");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        lesson_id INT NOT NULL,
        course_id INT NOT NULL,
        status ENUM('locked','unlocked','in_progress','completed') NOT NULL DEFAULT 'locked',
        completed_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (lesson_id) REFERENCES module_content(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        UNIQUE KEY uk_lesson_progress (user_id, lesson_id),
        INDEX idx_lp_course_user (course_id, user_id),
        INDEX idx_lp_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Lesson progress table ready");

    // ── tools ──────────────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id          INT          AUTO_INCREMENT PRIMARY KEY,
        title       VARCHAR(255) NOT NULL,
        description TEXT,
        thumbnail_url VARCHAR(500) DEFAULT NULL,
        file_path   VARCHAR(500) NOT NULL,
        file_size   INT NOT NULL DEFAULT 0,
        file_type   VARCHAR(50)  NOT NULL,
        category    VARCHAR(100) DEFAULT 'general',
        is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
        download_count INT       NOT NULL DEFAULT 0,
        created_by  INT NULL,
        created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_tools_category (category),
        INDEX idx_tools_active (is_active),
        INDEX idx_tools_created (created_at),
        INDEX idx_tools_downloads (download_count)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Tools table ready");

    await conn.query(`
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('instructor','teaching_assistant','learner','guest') NOT NULL DEFAULT 'learner',
        status ENUM('pending','active','completed','dropped','suspended') NOT NULL DEFAULT 'active',
        enrolled_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME DEFAULT NULL,
        progress_percentage INT NOT NULL DEFAULT 0,
        final_grade DECIMAL(5,2) DEFAULT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_course_enrollment (course_id, user_id),
        INDEX idx_enrollments_user (user_id),
        INDEX idx_enrollments_course (course_id),
        INDEX idx_enrollments_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Course enrollments table ready");

    // ── attendance ─────────────────────────────────────
    await conn.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id                 INT          AUTO_INCREMENT PRIMARY KEY,
        student_name       VARCHAR(255) NOT NULL,
        student_id_number  VARCHAR(50)  NOT NULL,
        student_course     VARCHAR(100) NULL,
        student_yr_level   VARCHAR(20)  NULL,
        school_year        VARCHAR(20)  NULL,
        check_in_time      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        check_out_time     TIMESTAMP    NULL,
        duration           INT          NULL,
        status             VARCHAR(50)  NOT NULL DEFAULT 'checked_in',
        created_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_student_id (student_id_number),
        INDEX idx_check_in   (check_in_time),
        INDEX idx_status     (status)
      )
    `);
    console.log("✅ Attendance table ready");

    if (String(process.env.RUN_MIGRATIONS).toLowerCase() !== "false") {
      await migrateSchema(conn);
    } else {
      console.log("⏭️  Migrations skipped (RUN_MIGRATIONS=false)");
    }
    await conn.end();
    console.log("✅ Database initialization complete\n");
  } catch (error) {
    console.error("❌ Database initialization failed:", error.message);
    throw error;
  }
}

async function migrateSchema(conn) {
  const migrations = [
    // ── users: expand for RBAC + profile fields ─────────────────
    `ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'admin'`,
    `ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`,
    `ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN full_name VARCHAR(255) NULL`,
    `ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL`,
    `ALTER TABLE users ADD COLUMN position_title VARCHAR(255) NULL`,
    `ALTER TABLE users ADD COLUMN employee_id VARCHAR(100) NULL`,
    `ALTER TABLE users ADD COLUMN contact_number VARCHAR(50) NULL`,
    `ALTER TABLE users ADD COLUMN date_hired DATE NULL`,
    `ALTER TABLE users ADD COLUMN birthdate DATE NULL`,
    `ALTER TABLE users ADD COLUMN address TEXT NULL`,
    `ALTER TABLE users ADD COLUMN employment_status VARCHAR(100) NULL`,
    `ALTER TABLE users ADD COLUMN student_id_number VARCHAR(100) NULL`,
    `ALTER TABLE users ADD INDEX idx_users_role (role)`,
    `ALTER TABLE users ADD INDEX idx_users_active (is_active)`,
    `ALTER TABLE users ADD UNIQUE KEY uk_users_email (email)`,
    // ── user_role_history ───────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS user_role_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      old_role VARCHAR(50) NULL,
      new_role VARCHAR(50) NOT NULL,
      changed_by INT NULL,
      reason TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    )`,

    // ── books ──────────────────────────────────────────
    `ALTER TABLE books MODIFY COLUMN author    VARCHAR(255) NULL`,
    `ALTER TABLE books MODIFY COLUMN genre     VARCHAR(100) NULL`,
    `ALTER TABLE books MODIFY COLUMN isbn      VARCHAR(50)  NULL`,
    `ALTER TABLE books MODIFY COLUMN publisher VARCHAR(255) NULL`,
    `ALTER TABLE books ADD COLUMN shelf       VARCHAR(100) NULL`,
    `ALTER TABLE books ADD COLUMN pages       VARCHAR(20)  NULL`,
    `ALTER TABLE books ADD COLUMN sublocation VARCHAR(255) NULL AFTER pages`,
    `ALTER TABLE books ADD COLUMN collection  VARCHAR(50)  NULL`,
    `ALTER TABLE books DROP INDEX isbn`,

    // ── book_copies ────────────────────────────────────
    `ALTER TABLE book_copies ADD COLUMN date_acquired   DATE NULL`,
    `ALTER TABLE book_copies ADD COLUMN condition_notes TEXT NULL`,
    `ALTER TABLE book_copies ADD UNIQUE INDEX idx_acc_unique (accession_number)`,

    // ── Soft-delete columns for book_copies ─────────────
    `ALTER TABLE book_copies ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE book_copies ADD COLUMN deleted_at TIMESTAMP NULL`,

    // ── borrowed_books — add all columns the Transaction model writes ──
    `ALTER TABLE borrowed_books ADD COLUMN accession_number   VARCHAR(50)   NULL AFTER book_id`,
    `ALTER TABLE borrowed_books ADD COLUMN borrower_type      VARCHAR(20)   NOT NULL DEFAULT 'student' AFTER accession_number`,
    `ALTER TABLE borrowed_books ADD COLUMN borrower_id_number VARCHAR(50)   NULL AFTER borrower_name`,
    `ALTER TABLE borrowed_books ADD COLUMN borrower_email     VARCHAR(255)  NULL AFTER borrower_contact`,
    `ALTER TABLE borrowed_books ADD COLUMN borrower_course    VARCHAR(100)  NULL AFTER borrower_email`,
    `ALTER TABLE borrowed_books ADD COLUMN borrower_yr_level  VARCHAR(20)   NULL AFTER borrower_course`,
    `ALTER TABLE borrowed_books ADD COLUMN fine_paid          TINYINT(1)    NOT NULL DEFAULT 0`,
    `ALTER TABLE borrowed_books ADD COLUMN fine_amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00`,
    `ALTER TABLE borrowed_books ADD COLUMN updated_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `ALTER TABLE borrowed_books ADD INDEX idx_borrower_id      (borrower_id_number)`,
    `ALTER TABLE borrowed_books ADD INDEX idx_due_date         (due_date)`,
    `ALTER TABLE borrowed_books ADD INDEX idx_accession_number (accession_number)`,
    // Normalize borrow_date to DATE (was TIMESTAMP in old schema)
    `ALTER TABLE borrowed_books MODIFY COLUMN borrow_date DATE NOT NULL DEFAULT (CURDATE())`,

    // ── Soft-delete columns for books ───────────────────
    `ALTER TABLE books ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE books ADD COLUMN deleted_at TIMESTAMP NULL`,
    `ALTER TABLE books ADD COLUMN deleted_by VARCHAR(100) NULL`,

    // ── Soft-delete columns for borrowed_books ──────────
    `ALTER TABLE borrowed_books ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE borrowed_books ADD COLUMN deleted_at TIMESTAMP NULL`,
    `ALTER TABLE borrowed_books ADD COLUMN deleted_by VARCHAR(100) NULL`,

    // ── Soft-delete columns for attendance ───────────────────
    `ALTER TABLE attendance ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE attendance ADD COLUMN deleted_at TIMESTAMP NULL`,
    `ALTER TABLE attendance ADD COLUMN deleted_by VARCHAR(100) NULL`,

    // ── Soft-delete columns for lexora_books ───────────────────
    `ALTER TABLE lexora_books ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0`,
    `ALTER TABLE lexora_books ADD COLUMN deleted_at TIMESTAMP NULL`,
    `ALTER TABLE lexora_books ADD COLUMN deleted_by VARCHAR(100) NULL`,

    // ── trash_log table for soft-delete audit trail ─────
    `CREATE TABLE IF NOT EXISTS trash_log (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      entity_type     VARCHAR(50)  NOT NULL,
      entity_id       INT          NOT NULL,
      entity_title    VARCHAR(255) NULL,
      entity_meta     TEXT         NULL,
      deleted_by      VARCHAR(100) NULL,
      deleted_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at      TIMESTAMP    NULL,
      INDEX idx_entity (entity_type, entity_id),
      INDEX idx_expires (expires_at)
    )`,

    // ── lexora_books ───────────────────────────────────
    `ALTER TABLE lexora_books ADD COLUMN format         VARCHAR(50)  NULL AFTER resource_type`,
    `ALTER TABLE lexora_books ADD COLUMN subject_course VARCHAR(500) NULL AFTER format`,
    `ALTER TABLE lexora_books ADD COLUMN resource_type  VARCHAR(50)  NULL`,
    `ALTER TABLE lexora_books ADD COLUMN program        VARCHAR(150) NULL`,
    `ALTER TABLE lexora_books ADD COLUMN collection     VARCHAR(150) NULL`,
    `ALTER TABLE lexora_books ADD INDEX idx_subject_course (subject_course(191))`,
    `ALTER TABLE lexora_books ADD INDEX idx_program        (program)`,
    `ALTER TABLE lexora_books ADD INDEX idx_resource_type  (resource_type)`,

    // ── lexora_books flipbook feature columns ───────────
    `ALTER TABLE lexora_books ADD COLUMN slug VARCHAR(500) DEFAULT NULL AFTER title`,
    `ALTER TABLE lexora_books ADD COLUMN short_description TEXT DEFAULT NULL AFTER slug`,
    `ALTER TABLE lexora_books ADD COLUMN source_type ENUM('pdf','images') DEFAULT NULL AFTER resource_type`,
    `ALTER TABLE lexora_books ADD COLUMN pdf_url TEXT DEFAULT NULL AFTER source`,
    `ALTER TABLE lexora_books ADD COLUMN thumbnail_url TEXT DEFAULT NULL AFTER pdf_url`,
    `ALTER TABLE lexora_books ADD COLUMN cover_url TEXT DEFAULT NULL AFTER thumbnail_url`,
    `ALTER TABLE lexora_books ADD COLUMN download_url TEXT DEFAULT NULL AFTER cover_url`,
    `ALTER TABLE lexora_books ADD COLUMN publish_on DATE DEFAULT NULL AFTER download_url`,
    `ALTER TABLE lexora_books ADD COLUMN isbn10 VARCHAR(20) DEFAULT NULL AFTER publish_on`,
    `ALTER TABLE lexora_books ADD COLUMN isbn13 VARCHAR(20) DEFAULT NULL AFTER isbn10`,
    `ALTER TABLE lexora_books ADD COLUMN total_pages INT DEFAULT NULL AFTER isbn13`,
    `ALTER TABLE lexora_books ADD COLUMN table_of_contents JSON DEFAULT NULL AFTER total_pages`,
    `ALTER TABLE lexora_books ADD COLUMN length VARCHAR(100) DEFAULT NULL AFTER total_pages`,
    `ALTER TABLE lexora_books ADD COLUMN dimensions VARCHAR(50) DEFAULT NULL AFTER total_pages`,
    `ALTER TABLE lexora_books ADD COLUMN file_size BIGINT DEFAULT NULL AFTER dimensions`,
    `ALTER TABLE lexora_books ADD COLUMN co_publisher VARCHAR(255) DEFAULT NULL AFTER file_size`,
    `ALTER TABLE lexora_books ADD COLUMN translator VARCHAR(255) DEFAULT NULL AFTER co_publisher`,
    `ALTER TABLE lexora_books ADD COLUMN asin VARCHAR(20) DEFAULT NULL AFTER translator`,
    `ALTER TABLE lexora_books ADD COLUMN doi VARCHAR(100) DEFAULT NULL AFTER asin`,
    `ALTER TABLE lexora_books ADD COLUMN llcn VARCHAR(20) DEFAULT NULL AFTER doi`,
    `ALTER TABLE lexora_books ADD COLUMN weight_value DECIMAL(6,2) DEFAULT NULL AFTER llcn`,
    `ALTER TABLE lexora_books ADD COLUMN weight_unit VARCHAR(20) DEFAULT NULL AFTER weight_value`,
    `ALTER TABLE lexora_books ADD COLUMN edition VARCHAR(50) DEFAULT NULL AFTER weight_unit`,
    `ALTER TABLE lexora_books ADD COLUMN status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft' AFTER edition`,
    `ALTER TABLE lexora_books ADD COLUMN visibility ENUM('public','private') NOT NULL DEFAULT 'public' AFTER status`,
    `ALTER TABLE lexora_books ADD COLUMN created_by INT DEFAULT NULL AFTER visibility`,
    `ALTER TABLE lexora_books ADD COLUMN published_at DATETIME DEFAULT NULL AFTER created_by`,
    `ALTER TABLE lexora_books ADD INDEX idx_lexora_status (status)`,
    `ALTER TABLE lexora_books ADD INDEX idx_lexora_visibility (visibility)`,
    `ALTER TABLE lexora_books ADD INDEX idx_lexora_source_type (source_type)`,

    // ── lexora_book_categories ───────────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_book_categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      slug VARCHAR(150) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_category_slug (slug),
      UNIQUE KEY uq_lexora_category_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── lexora_book_category_relations ────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_book_category_relations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      category_id INT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_book_category (book_id, category_id),
      KEY idx_lexora_cat_book (book_id),
      KEY idx_lexora_cat_category (category_id),
      CONSTRAINT fk_lexora_cat_book FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE,
      CONSTRAINT fk_lexora_cat_category FOREIGN KEY (category_id) REFERENCES lexora_book_categories(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── lexora_book_tags ─────────────────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_book_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_tag_slug (slug),
      UNIQUE KEY uq_lexora_tag_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── lexora_book_tag_relations ────────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_book_tag_relations (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      tag_id INT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_book_tag (book_id, tag_id),
      KEY idx_lexora_tag_book (book_id),
      KEY idx_lexora_tag_tag (tag_id),
      CONSTRAINT fk_lexora_tag_book FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE,
      CONSTRAINT fk_lexora_tag_tag FOREIGN KEY (tag_id) REFERENCES lexora_book_tags(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── lexora_book_pages (image-page books) ─────────────
    // The media-access check answers "is this image one of the book's pages?"
    // per request, so it needs book_id + image_url to be searchable together.
    `CREATE TABLE IF NOT EXISTS lexora_book_pages (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      book_id INT NOT NULL,
      page_number INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      file_size BIGINT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_book_page (book_id, page_number),
      KEY idx_lexora_pages_book (book_id),
      KEY idx_lexora_pages_book_url (book_id, image_url),
      CONSTRAINT fk_lexora_pages_book FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Added after the table above first shipped: keeps the per-request page
    // ownership lookup an index hit instead of a scan of the book's pages.
    `ALTER TABLE lexora_book_pages ADD INDEX idx_lexora_pages_book_url (book_id, image_url)`,

    // ── lexora_bookmarks ─────────────────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_bookmarks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      page_number INT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_bookmark (user_id, book_id, page_number),
      KEY idx_lexora_bookmark_user (user_id),
      KEY idx_lexora_bookmark_book (book_id),
      CONSTRAINT fk_lexora_bookmark_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_lexora_bookmark_book FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── lexora_book_progress ──────────────────────────────
    `CREATE TABLE IF NOT EXISTS lexora_book_progress (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      book_id INT NOT NULL,
      page_number INT NOT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_lexora_progress (user_id, book_id),
      KEY idx_lexora_progress_user (user_id),
      KEY idx_lexora_progress_book (book_id),
      CONSTRAINT fk_lexora_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_lexora_progress_book FOREIGN KEY (book_id) REFERENCES lexora_books(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // ── courses ──────────────────────────────────────────
    `ALTER TABLE courses ADD COLUMN category_id INT DEFAULT NULL AFTER category`,
    `CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id)`,
    `ALTER TABLE module_content ADD COLUMN file_path VARCHAR(500) DEFAULT NULL`,
    `ALTER TABLE module_content ADD COLUMN file_name VARCHAR(500) DEFAULT NULL`,
    `ALTER TABLE courses ADD COLUMN deleted_at TIMESTAMP NULL`,
    `ALTER TABLE courses ADD COLUMN deleted_by VARCHAR(100) NULL`,

    // -- portal_hero_slides (Student Portal hero carousel) --
    `CREATE TABLE IF NOT EXISTS portal_hero_slides (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      image_url VARCHAR(500) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_portal_hero_order (sort_order),
      INDEX idx_portal_hero_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // Remove legacy text columns (no longer used by hero slides)
    `ALTER TABLE portal_hero_slides DROP COLUMN title`,
    `ALTER TABLE portal_hero_slides DROP COLUMN subtitle`,
    `ALTER TABLE portal_hero_slides DROP COLUMN description`,

    // ── Granular permissions: schema ─────────────────────────
    // Order matters: every CREATE runs before any ALTER / seed so a
    // fresh deployment never hits errno 1146 (table doesn't exist).
    `CREATE TABLE IF NOT EXISTS roles (
      name         VARCHAR(50)  NOT NULL PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      description  TEXT         NULL,
      is_system    TINYINT(1)   NOT NULL DEFAULT 1,
      created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS permissions (
      id           INT          AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(100) NOT NULL UNIQUE,
      display_name VARCHAR(150) NOT NULL,
      category     VARCHAR(50)  NOT NULL,
      actions      JSON         DEFAULT NULL,
      is_active    TINYINT(1)   NOT NULL DEFAULT 1,
      created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_permissions_category (category),
      INDEX idx_permissions_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // actions = NULL means "all actions defined on the permission".
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      role_name       VARCHAR(50)  NOT NULL,
      permission_name VARCHAR(100) NOT NULL,
      actions         JSON DEFAULT NULL,
      granted_by      INT DEFAULT NULL,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_permission (role_name, permission_name),
      INDEX idx_rp_role (role_name),
      INDEX idx_rp_permission (permission_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS user_permission_overrides (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      user_id         INT          NOT NULL,
      permission_name VARCHAR(100) NOT NULL,
      granted         TINYINT(1)   NOT NULL DEFAULT 1,
      actions         JSON DEFAULT NULL,
      updated_by      INT DEFAULT NULL,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_permission (user_id, permission_name),
      INDEX idx_upo_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS role_entity_permissions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      role_name   VARCHAR(50)  NOT NULL,
      entity_type VARCHAR(50)  NOT NULL,
      entity_id   INT          NOT NULL,
      granted     TINYINT(1)   NOT NULL DEFAULT 1,
      updated_by  INT DEFAULT NULL,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_role_entity (role_name, entity_type, entity_id),
      INDEX idx_rep_role (role_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS entity_permission_overrides (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT          NOT NULL,
      entity_type VARCHAR(50)  NOT NULL,
      entity_id   INT          NOT NULL,
      granted     TINYINT(1)   NOT NULL DEFAULT 1,
      updated_by  INT DEFAULT NULL,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_entity_override (user_id, entity_type, entity_id),
      INDEX idx_epo_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS permission_seed_batches (
      batch      VARCHAR(50) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    // Safety net for databases whose tables predate the `actions` column.
    // errno 1060 (duplicate column) is already tolerated by the loop below.
    `ALTER TABLE permissions ADD COLUMN actions JSON DEFAULT NULL`,
    `ALTER TABLE role_permissions ADD COLUMN actions JSON DEFAULT NULL`,
    `ALTER TABLE user_permission_overrides ADD COLUMN actions JSON DEFAULT NULL`,
    // Legacy databases may carry the role/permission tables from an earlier
    // abandoned attempt with a different shape — reconcile before seeding.
    `ALTER TABLE roles ADD COLUMN is_system TINYINT(1) NOT NULL DEFAULT 1`,
  ];

  await dropLegacyPermissionTables(conn);

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log(`  ✅ Migration: ${sql.slice(0, 65)}…`);
    } catch (err) {
      // 1091 = can't drop index (doesn't exist)
      // 1060 = duplicate column
      // 1054 = unknown column
      // 1061 = duplicate key name
      // 1292 = incorrect date value (borrow_date DEFAULT expr on older MySQL)
      if ([1091, 1060, 1054, 1061, 1292].includes(err.errno)) {
        console.log(`  ⏭️  Already applied: ${sql.slice(0, 65)}…`);
      } else {
        console.warn(`  ⚠️  Migration warning: ${err.message}`);
      }
    }
  }

  await seedPermissions(conn);
}

/**
 * Drop permission-system tables left behind by an earlier attempt whose
 * schema does not match this implementation (e.g. `granted_at` instead of
 * `updated_at`, a `permission_name` column on the entity tables).
 *
 * Each drop is keyed to a column signature this schema never produces, so
 * it runs exactly once and never touches a correctly migrated database.
 * No application code reads the legacy tables, and the seed recreates the
 * canonical rows immediately afterwards.
 */
async function dropLegacyPermissionTables(conn) {
  // table → column that only exists in the legacy schema
  const LEGACY_SIGNATURES = {
    roles:                      "is_active",
    permissions:                "description",
    role_permissions:           "granted_at",
    user_permission_overrides:  "granted_at",
    role_entity_permissions:    "permission_name",
    entity_permission_overrides: "permission_name",
  };

  for (const [table, legacyColumn] of Object.entries(LEGACY_SIGNATURES)) {
    try {
      const [rows] = await conn.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
         LIMIT 1`,
        [table, legacyColumn]
      );
      if (!rows.length) continue;

      await conn.query("SET FOREIGN_KEY_CHECKS = 0");
      await conn.query(`DROP TABLE ${table}`);
      await conn.query("SET FOREIGN_KEY_CHECKS = 1");
      console.log(`  ♻️  Recreated legacy permission table: ${table}`);
    } catch (err) {
      console.warn(`  ⚠️  Could not reconcile legacy table ${table}: ${err.message}`);
    }
  }
}

/**
 * Seed the permission catalog and the default role grant matrix.
 *
 * Every batch is batch-guarded by `permission_seed_batches` and never
 * re-runs: a plain idempotent seed would silently re-insert grants a
 * Super Admin deleted through the management UI on the next boot.
 */
async function seedPermissions(conn) {
  async function batchApplied(batch) {
    try {
      const [rows] = await conn.query(
        "SELECT batch FROM permission_seed_batches WHERE batch = ? LIMIT 1",
        [batch]
      );
      return rows.length > 0;
    } catch (err) {
      // Table missing (migrations disabled) — treat as not applied and let
      // the seed fail loudly rather than silently skipping.
      console.warn(`  ⚠️  Seed guard check failed for ${batch}: ${err.message}`);
      return false;
    }
  }

  async function markBatch(batch) {
    await conn.query(
      "INSERT IGNORE INTO permission_seed_batches (batch) VALUES (?)",
      [batch]
    );
  }

  // ── v1_roles ─────────────────────────────────────────────
  if (!(await batchApplied(SEED_BATCHES.ROLES))) {
    for (const role of SEED_ROLES) {
      await conn.query(
        `INSERT INTO roles (name, display_name, description, is_system)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), description = VALUES(description)`,
        [role.name, role.display_name, role.description]
      );
    }
    await markBatch(SEED_BATCHES.ROLES);
    console.log("  ✅ Seed batch: v1_roles");
  }

  // ── v1_permissions ───────────────────────────────────────
  // ON DUPLICATE KEY UPDATE never touches `actions` on later runs —
  // actions are server-owned. On this first run the drop above already
  // cleared any legacy rows, so writing actions here is safe.
  if (!(await batchApplied(SEED_BATCHES.PERMISSIONS))) {
    for (const perm of PERMISSION_CATALOG) {
      await conn.query(
        `INSERT INTO permissions (name, display_name, category, actions, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name), category = VALUES(category)`,
        [perm.name, perm.display_name, perm.category, JSON.stringify(perm.actions)]
      );
    }
    // Remove any permission row that is not part of the catalog.
    const catalogNames = PERMISSION_CATALOG.map((p) => p.name);
    const placeholders = catalogNames.map(() => "?").join(", ");
    await conn.query(
      `DELETE FROM permissions WHERE name NOT IN (${placeholders})`,
      catalogNames
    );
    await markBatch(SEED_BATCHES.PERMISSIONS);
    console.log("  ✅ Seed batch: v1_permissions");
  }

  // ── v1_action_backfill ───────────────────────────────────
  // Guarantees `actions` is populated even for rows that existed
  // before the column was added.
  if (!(await batchApplied(SEED_BATCHES.ACTION_BACKFILL))) {
    for (const perm of PERMISSION_CATALOG) {
      await conn.query(
        "UPDATE permissions SET actions = ? WHERE name = ? AND actions IS NULL",
        [JSON.stringify(perm.actions), perm.name]
      );
    }
    await markBatch(SEED_BATCHES.ACTION_BACKFILL);
    console.log("  ✅ Seed batch: v1_action_backfill");
  }

  // ── v1_role_grants ───────────────────────────────────────
  if (!(await batchApplied(SEED_BATCHES.ROLE_GRANTS))) {
    for (const [roleName, granted] of Object.entries(SEED_ROLE_GRANTS)) {
      await conn.query("DELETE FROM role_permissions WHERE role_name = ?", [roleName]);
      for (const permissionName of granted) {
        // actions = NULL → all actions defined on the permission.
        await conn.query(
          "INSERT INTO role_permissions (role_name, permission_name, actions) VALUES (?, ?, NULL)",
          [roleName, permissionName]
        );
      }
    }
    await markBatch(SEED_BATCHES.ROLE_GRANTS);
    console.log("  ✅ Seed batch: v1_role_grants");
  }

  console.log("✅ Permission catalog + default role grants ready");
}

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ MySQL connection established");
    return true;
  } catch (error) {
    console.error("❌ MySQL connection failed:", error.message);
    return false;
  }
}

module.exports = { pool, initDatabase, testConnection, repairLegacyUserRoles };