# Course Management System

A comprehensive digital library course management module. This document covers the complete lifecycle from **admin/author course creation** through **student enrollment and learning**, including lesson progress tracking and completion mechanics.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Roles & Permissions](#2-roles--permissions)
3. [Data Model](#3-data-model)
4. [Backend API](#4-backend-api)
5. [Frontend Pages & Components](#5-frontend-pages--components)
6. [Admin/Author Flow](#6-adminauthor-flow)
7. [Student Flow](#7-student-flow)
8. [Lesson Completion & Progress Tracking](#8-lesson-completion--progress-tracking)
9. [Video Embedding](#9-video-embedding)
10. [Feature Structure (Anti-Spaghetti)](#10-feature-structure-anti-spaghetti)

---

## 1. Architecture Overview

The Course Management feature follows a **feature-based architecture** (per `ANTI_SPAGHETTI_RULES.md`):

```
server/features/courses/          client/src/features/courses/
├── courses.controller.js          ├── pages/
├── courses.service.js             │   ├── CourseLibrary.jsx
├── courses.repository.js          │   ├── CourseDetailsPage.jsx
├── courses.routes.js              │   └── CourseLearnerView.jsx
├── progress.repository.js         ├── components/
├── progress.routes.js (inline)    │   ├── CourseContentSection.jsx
├── modules.repository.js          │   ├── CourseAdminTabs.jsx
├── content.repository.js          │   ├── LessonProgressBar.jsx
├── enrollments.repository.js      │   └── OverviewSection.jsx
├── builder.controller.js          ├── hooks/
├── builder.routes.js              │   ├── useCourseDetails.js
├── builder.service.js             │   ├── useModules.js
├── courseThumbnail.js             │   └── useLessonProgress.js
└── courses.routes.js              ├── api/
                                   │   └── coursesApi.js
                                   ├── services/
                                   ├── utils/
                                   │   ├── courseHelpers.js
                                   │   └── richText.js
                                   └── validation/
```

**Layer flow (per feature rules):**

```
Page → Component → Hook → API module
        ↓ HTTP
Route → Controller → Service → Repository → MySQL
```

- **Controller**: Parse request, call service, return response. Nothing else.
- **Service**: Business rules, workflows, transactions.
- **Repository**: SQL only. No HTTP concerns.

---

## 2. Roles & Permissions

Authentication uses **session-based auth** (Express sessions, not JWT).

| Role | Can List Courses | Can View Library | Can Read Course | Can Create/Edit/Delete | Can Enroll | Can Mark Lesson | Can View Progress |
|---|---|---|---|---|---|---|---|
| `student` | No | Yes | Yes | No | No | Yes (own) | Yes (own) |
| `staff` | Yes | Yes | Yes | Yes | Yes | Yes (own) | Yes |
| `librarian` | Yes | Yes | Yes | Yes | Yes | Yes (own) | Yes |
| `admin` | Yes | Yes | Yes | Yes | Yes | Yes (own) | Yes |
| `super_admin` | Yes | Yes | Yes | Yes | Yes | Yes (own) | Yes |

Auth middleware is in `server/middleware/authMiddleware.js`:
- `requireAuth` — session required
- `requireAllRoles` — student + staff + librarian + admin + super_admin
- `requireAdminOrStaff` — staff + librarian + admin + super_admin

---

## 3. Data Model

### `courses` table

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Primary key |
| `title` | VARCHAR(255) | Course title |
| `description` | TEXT | Full description |
| `category` | VARCHAR(100) | Category tag |
| `difficulty` | VARCHAR(50) | beginner/intermediate/advanced/all_levels |
| `status` | ENUM | draft/published/archived/under_review |
| `instructor_id` | INT FK | User who created it |
| `thumbnail_url` | VARCHAR(500) | Thumbnail image path |
| `created_at`, `updated_at` | DATETIME | Timestamps |

### `course_modules` table

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Primary key |
| `course_id` | INT FK | Links to courses |
| `title` | VARCHAR(255) | Module title |
| `description` | TEXT | Module description |
| `type` | VARCHAR(50) | chapter/quiz/etc. |
| `order_index` | INT | Display order |
| `is_visible` | BOOLEAN | Visible to students |
| `is_graded`, `max_score` | BOOLEAN, DECIMAL | Grading settings |

### `module_content` table (aka "lessons")

| Column | Type | Description |
|---|---|---|
| `id` | INT PK | Primary key |
| `module_id` | INT FK | Links to course_modules |
| `title` | VARCHAR(255) | Lesson title |
| `type` | ENUM | video/reading/document/quiz/assignment/link/etc. |
| `url` | VARCHAR(2048) | **Video URL or file path** — see [Video Embedding](#9-video-embedding) |
| `description` | TEXT | Rich text content for reading lessons |
| `duration` | INT | Duration in minutes |
| `is_required` | BOOLEAN | Must be completed for certificate |

### `course_enrollments` table

| Column | Type | Description |
|---|---|---|
| `course_id`, `user_id` | INT FK | Enrollment link |
| `status` | ENUM | pending/active/completed/dropped/suspended |
| `completed_at` | DATETIME | Set when course is 100% complete |
| `progress_percentage` | INT | 0-100 |

### `lesson_progress` table (completion tracking)

| Column | Type | Description |
|---|---|---|
| `user_id`, `lesson_id`, `course_id` | INT FK | Lesson progress link |
| `status` | ENUM | locked/unlocked/in_progress/completed |
| `completed_at` | DATETIME | When lesson was marked complete |

**Uniqueness:** `UNIQUE KEY uk_lesson_progress (user_id, lesson_id)` — one progress record per user per lesson.

---

## 4. Backend API

### Routes (`server/features/courses/courses.routes.js`)

| Method | Path | Auth | Controller Method | Description |
|---|---|---|---|---|
| GET | `/api/courses/library` | `requireAuth` | `listLibraryCourses` | Published courses for students |
| GET | `/api/courses/:id` | `requireAllRoles` | `getCourse` | Get course details |
| POST | `/api/courses` | `requireAdminOrStaff` | `createCourse` | Create new course |
| PUT | `/api/courses/:id` | `requireAdminOrStaff` | `updateCourse` | Update course |
| PATCH | `/api/courses/:id/archive` | `requireAdminOrStaff` | `archiveCourse` | Archive course |
| PATCH | `/api/courses/:id/publish` | `requireAdminOrStaff` | `publishCourse` | Publish course |
| POST | `/api/courses/thumbnail` | `requireAdminOrStaff` | `uploadThumbnail` | Upload thumbnail image |
| GET | `/api/courses/:courseId/modules` | `requireAllRoles` | `listModules` | List modules in a course |
| POST | `/api/courses/:courseId/modules` | `requireAdminOrStaff` | `createModule` | Create a module |
| PUT | `/api/courses/:courseId/modules/:moduleId` | `requireAdminOrStaff` | `updateModule` | Update module |
| DELETE | `/api/courses/:courseId/modules/:moduleId` | `requireAdminOrStaff` | `deleteModule` | Delete module |
| GET | `/api/courses/:courseId/modules/:moduleId/content` | `requireAllRoles` | `listContent` | List lessons in a module |
| POST | `/api/courses/:courseId/modules/:moduleId/content` | `requireAdminOrStaff` | `createContent` | Create a lesson |
| PUT | `/api/courses/:courseId/modules/:moduleId/content/:contentId` | `requireAdminOrStaff` | `updateContent` | Update lesson |
| DELETE | `/api/courses/:courseId/modules/:moduleId/content/:contentId` | `requireAdminOrStaff` | `deleteContent` | Delete lesson |
| GET | `/api/courses/:courseId/enrollments` | `requireAllRoles` | `listEnrollments` | List enrolled students |
| POST | `/api/courses/:courseId/enrollments` | `requireAdminOrStaff` | `enrollStudent` | Enroll a student (+ unlock lessons) |
| DELETE | `/api/courses/:courseId/enrollments` | `requireAdminOrStaff` | `unenrollStudent` | Unenroll a student |
| GET | `/api/courses/:courseId/progress` | `requireAllRoles` | `getCourseProgress` | Get student progress |
| POST | `/api/courses/:courseId/lessons/:lessonId/complete` | `requireAllRoles` | `markLessonComplete` | Mark lesson as complete |

### Progress Endpoints

#### GET `/api/courses/:courseId/progress`

Returns progress data for the current user in the specified course.

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": 1,
    "title": "Introduction to Digital Libraries",
    "lessons": [
      {
        "id": 1,
        "title": "What is a Library?",
        "type": "reading",
        "moduleId": 1,
        "moduleTitle": "Fundamentals",
        "order": 0,
        "status": "completed",
        "completedAt": "2024-01-15T10:30:00.000Z",
        "duration": 10,
        "url": null,
        "description": "<p>Library definition...</p>"
      }
    ],
    "summary": {
      "total": 10,
      "completed": 3,
      "completionPct": 30
    },
    "isEnrolled": true,
    "enrollmentStatus": "active"
  }
}
```

**Lesson statuses:**
- `locked` — Prerequisites not met (lesson ahead of current unlocked position)
- `unlocked` — Available to start
- `in_progress` — Started but not finished
- `completed` — Marked as done

#### POST `/api/courses/:courseId/lessons/:lessonId/complete`

Marks a lesson as complete for the current user. Triggers cascading unlocks.

**Response:**
```json
{
  "success": true,
  "message": "Lesson marked complete"
}
```

**Side effects:**
1. Lesson marked as `completed` in `lesson_progress`
2. Next lesson in the same module unlocked (status → `unlocked`)
3. If all lessons in current module complete → next module's first lesson unlocked
4. If all lessons in course complete → enrollment status set to `completed`, `completed_at` set, `progress_percentage` = 100

---

## 5. Frontend Pages & Components

### Pages

| Page | Route | Description |
|---|---|---|
| `CourseLibrary.jsx` | `/dashboard/courses/library` | Catalog of published courses (cards are clickable) |
| `CourseDetailsPage.jsx` | `/dashboard/courses/:id` | Course details — student view (hero + Start Learning + content) or admin view (tabs) |
| `CourseLearnerView.jsx` | `/dashboard/courses/:id/learn` and `/:id/learn/:lessonId` | Student lesson viewer (video/reading + prev/next + Mark Complete) |
| `CourseCatalog.jsx` | `/dashboard/courses` | Admin catalog (full course management) |
| `CourseBuilderPage.jsx` | `/dashboard/courses/:id/builder` | Admin course builder (modules + lessons) |
| `CourseCreatePage.jsx` | `/dashboard/courses/create` | Create new course form |

### Components

| Component | Location | Description |
|---|---|---|
| `CourseContentSection.jsx` | `features/courses/components/` | Expandable modules with clickable lesson rows |
| `CourseAdminTabs.jsx` | `features/courses/components/` | Admin-only tab UI (Overview, Content, Students, Analytics, Actions) |
| `OverviewSection.jsx` | `features/courses/components/` | Section wrapper with title + icon |
| `LessonProgressBar.jsx` | `features/courses/components/` | Progress bar with per-module breakdown |
| `CourseCard.jsx` | `features/courses/components/` | Course card in catalog |

### Hooks

| Hook | Location | Description |
|---|---|---|
| `useCourseDetails.js` | `features/courses/hooks/` | Fetch single course data |
| `useModules.js` | `features/courses/hooks/` | Fetch course modules |
| `useLessonProgress.js` | `features/courses/hooks/` | Fetch progress, mark complete (optimistic update) |
| `useCourseActions.js` | `features/courses/hooks/` | Create/edit/delete/publish/archive courses |

### API Module

`client/src/features/courses/api/coursesApi.js` — All HTTP calls:

```javascript
getCourseLibrary(params)       // GET /api/courses/library
getCourseById(id)              // GET /api/courses/:id
getCourseModules(courseId)     // GET /api/courses/:courseId/modules
getModuleContent(courseId, moduleId)  // GET /api/courses/:courseId/modules/:moduleId/content
getCourseProgress(courseId)    // GET /api/courses/:courseId/progress
markLessonComplete(courseId, lessonId)  // POST /api/courses/:courseId/lessons/:lessonId/complete
```

### Utilities

`client/src/features/courses/utils/courseHelpers.js`:

| Function | Description |
|---|---|
| `normalizeVideoUrl(url)` | Converts YouTube watch URLs to embed format, Vimeo URLs to player URLs |
| `formatDate(date)` | Format date for display |
| `getCourseStatusColor(status)` | Status badge color |
| `getDifficultyColor(difficulty)` | Difficulty badge color |
| `classNames(...classes)` | Conditional class joiner |

---

## 6. Admin/Author Flow

### Step 1: Create a Course
1. Navigate to **Courses → Create** (`/dashboard/courses/create`)
2. Fill course details: title, description, category, difficulty
3. Upload thumbnail image (JPEG/PNG/WebP only)
4. Save → course created with status `draft`

### Step 2: Build the Course (Course Builder)
1. Navigate to course details page → **Content** tab → "Open Builder"
2. Route: `/dashboard/courses/:id/builder`

**Add Modules:**
- Title, description, type (chapter/quiz)
- Drag to reorder (order_index)

**Add Lessons (Content):**
- Click module → "Add Lesson" button
- Fields:
  - **Title** (required)
  - **Type** (required): video, reading, document, quiz, assignment, link, presentation
  - **Video URL**: For video lessons — paste a video URL (see [Video Embedding](#9-video-embedding))
  - **Description**: Rich text content (for reading/document lessons)
  - **Duration**: Lesson length in minutes
  - **is_required**: Must be completed for course completion

### Step 3: Publish
1. On the course details page → **Actions** tab
2. Click **Publish Course**
3. Status changes to `published` → appears in student library

### Step 4: Enroll Students
1. On the course details page → **Students** tab
2. Click **Enroll Student**
3. Select a user → click "Enroll"
4. System creates enrollment record and unlocks lessons:
   - First lesson set to `unlocked`
   - All subsequent lessons set to `locked`

---

## 7. Student Flow

### Step 1: Browse the Library
1. Navigate to **Student Portal → Courses** (`/dashboard/student`)
2. See grid of published courses
3. Click any course card → navigates to `/dashboard/courses/:id`

### Step 2: Course Details (Student View)
On `CourseDetailsPage.jsx` (student view):
- **Hero section** with course thumbnail, title, difficulty badge
- **"Start Learning" button** (PlayCircle icon) — primary CTA
- **About this course** section: description, learning outcomes, prerequisites
- **Course Content** section: expandable modules with clickable lesson rows

### Step 3: Start Learning
1. Click **"Start Learning"** → redirects to `/dashboard/courses/:id/learn`
2. System auto-navigates to the first unlocked lesson
3. Lesson viewer shows:
   - Lesson title and module name
   - **Video iframe** (for video lessons) or **rich text content** (for reading lessons)
   - **"Mark Complete" button** at the bottom

### Step 4: Navigate & Complete Lessons
- Use **Previous/Next** buttons to navigate between lessons
- Click **"Mark Complete"** to mark the current lesson as done
- System automatically unlocks the next lesson
- Progress bar at the top shows overall completion percentage

### Step 5: Course Completion
- When **all lessons** are marked complete:
- The system sets enrollment status to `completed`
- Shows a **green "✓ Completed" badge** on the progress bar
- Back on the course details page, "Start Learning" changes to **"Review course"** (if implemented)

---

## 8. Lesson Completion & Progress Tracking

### Progress States

| Status | Color | Meaning |
|---|---|---|
| `locked` | Gray | Prerequisites not met |
| `unlocked` | Blue (outline) | Ready to start |
| `in_progress` | Blue (filled) | Started but not finished |
| `completed` | Green | Fully done |

### How Completion Unlocks Work

```
1. Lesson 1 (Module A) is unlocked → Student clicks "Mark Complete"
   ↓
2. Lesson 2 (Module A) automatically unlocked
   ↓
3. Student completes all lessons in Module A
   ↓
4. First lesson of Module B automatically unlocked
   ↓
5. Student completes all lessons across all modules
   ↓
6. Enrollment status → "completed", completed_at set, progress = 100%
```

### Optimistic Updates

On the frontend, `useLessonProgress.js` updates the UI optimistically:
- Clicking "Mark Complete" immediately shows the green "Completed" badge
- The progress percentage updates in real-time
- If the API fails, the error is caught and logged

### Progress API Response

The `GET /api/courses/:courseId/progress` endpoint returns:
- All lessons with their completion status
- Summary: total lessons, completed count, completion percentage
- Enrollment status and whether the user is enrolled

---

## 9. Video Embedding

### Supported Platforms

The `normalizeVideoUrl()` utility in `courseHelpers.js` converts URLs to embed-safe formats:

| Input URL | Output (iframe src) |
|---|---|
| `https://www.youtube.com/watch?v=ABC123` | `https://www.youtube.com/embed/ABC123` |
| `https://youtu.be/ABC123` | `https://www.youtube.com/embed/ABC123` |
| `https://www.youtube.com/embed/ABC123` | `https://www.youtube.com/embed/ABC123` (unchanged) |
| `https://vimeo.com/123456789` | `https://player.vimeo.com/video/123456789` |
| `https://example.com/video.mp4` | `https://example.com/video.mp4` (unchanged — direct MP4 works) |

### File Upload Limitation

The `module_content.url` field stores a **URL string only**. There is no built-in file upload for video/lesson files. Admins should paste:
- YouTube video URLs
- Vimeo video URLs
- Direct MP4 file URLs (if hosted externally)

For file upload support, you would need to add:
- A Multer upload route on the backend (like `/api/courses/thumbnail`)
- A file input in the lesson creation form
- Store the file path in the `url` column

---

## 10. Feature Structure (Anti-Spaghetti)

Follows `ANTI_SPAGHETTI_RULES.md` — feature-based architecture with strict boundaries:

### Backend (`server/features/courses/`)

```
courses/
├── courses.controller.js    — HTTP request handlers (thin)
├── courses.service.js       — Business logic
├── courses.repository.js    — SQL queries
├── progress.repository.js   — SQL queries for lesson progress
├── modules.repository.js    — SQL queries for modules
├── content.repository.js    — SQL queries for lessons
├── enrollments.repository.js — SQL queries for enrollments
├── builder.service.js       — Course builder logic
├── courses.routes.js        — All route definitions
├── builder.controller.js    — Builder-specific controller
├── builder.routes.js        — Builder routes
├── courses.validation.js    — Validation schemas
└── courseThumbnail.js       — Image detection util
```

### Frontend (`client/src/features/courses/`)

```
courses/
├── pages/                    — Route-level components
│   ├── CourseLibrary.jsx
│   ├── CourseDetailsPage.jsx — Composed of sub-components (admin + student views)
│   └── CourseLearnerView.jsx — Student lesson viewer
├── components/               — Reusable UI
│   ├── CourseContentSection.jsx
│   ├── CourseAdminTabs.jsx
│   ├── OverviewSection.jsx
│   ├── LessonProgressBar.jsx
│   └── CourseCard.jsx
├── hooks/                    — React state + data fetching
│   ├── useCourseDetails.js
│   ├── useModules.js
│   ├── useLessonProgress.js
│   └── useCourseActions.js
├── api/
│   └── coursesApi.js        — HTTP only
├── utils/
│   ├── courseHelpers.js      — URL normalization, date formatting
│   └── richText.js
├── services/                 — UX-level transformation (if needed)
└── validation/               — Form validation schemas
```

### Key Rules Enforced

- **No raw fetch/Axios in components** — all HTTP goes through `coursesApi.js`
- **Pages are composition only** — no business logic, no raw API calls
- **Hooks are thin glue** — state + API calls, no business rules
- **Services have business logic** — repository calls orchestrated
- **Repositories are SQL only** — no HTTP concerns
