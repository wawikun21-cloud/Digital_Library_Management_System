# Lexora Books --- Digital Book & 3D Flipbook Upgrade

## 1. Feature Overview

Upgrade the existing **Lexora Books** feature to support complete
digital-book management and an interactive 3D flipbook reader.

### Technology Stack

-   Frontend: React + Vite + JavaScript
-   Backend: Node.js + Express
-   Database: MySQL
-   Flipbook: Replicate the behavior and UI/UX of the provided reference 3D Flipbook repository. Do not assume `react-3d-flipbook` is the final implementation until the reference repository has been inspected.
-   PDF rendering: PDF.js / `pdfjs-dist`
-   Storage: File/object storage or server file storage; do not store
    large PDFs/images as MySQL BLOBs

### Main Goals

-   Upgrade the existing Lexora Books fields.
-   Support PDF and image-based digital books.
-   Add dynamic categories and tags.
-   Add complete bibliographic/book information.
-   Add book-cover management.
-   Add draft/published workflow.
-   Add public/private visibility.
-   Add a 3D flipbook reader.
-   Allow users to bookmark specific pages.
-   Track reading progress.
-   Optimize the reader for large books and lower-end devices.
-   Keep the implementation feature-based and avoid spaghetti code.

------------------------------------------------------------------------

# 2. Admin Book Management

Create and edit books through a structured form divided into logical
sections.

## 2.1 Basic Book Setup

### Title

Field:

-   Label: `Title`
-   Type: text
-   Required: Yes

The title is used for:

-   Book title
-   Search
-   Book card
-   Book details
-   Flipbook reader title
-   Slug generation

------------------------------------------------------------------------

## 2.2 Book Source Type

Field:

-   Label: `Book Source Type`
-   Type: select/radio
-   Required: Yes

Options:

``` text
PDF
Images
```

The selected source type controls the upload interface.

### PDF Source

Display:

``` text
PDF File
PDF Thumbnail Image
```

### Image Source

Display:

``` text
Book Pages
```

with multiple image upload and page ordering.

------------------------------------------------------------------------


# 2A. Reference 3D Flipbook Repository — Replication Requirement

The 3D Flipbook used by Lexora Books must be based on an **existing reference
repository provided by the project owner**.

The goal is to **replicate the reference flipbook experience inside the
existing Lexora Books system**, not to independently redesign or replace it.

## Reference Repository

The repository URL/path will be supplied by the project owner:

```text
REFERENCE_FLIPBOOK_REPOSITORY = <PROVIDE_REFERENCE_REPOSITORY_URL_OR_LOCAL_PATH>
```

If the repository is supplied as a ZIP file, inspect the ZIP before making
implementation decisions.

## Mandatory Inspection Before Implementation

Before writing the Lexora flipbook implementation, inspect the reference
repository and document:

- Flipbook engine/library used
- React version
- Three.js version
- PDF.js / `pdfjs-dist` version
- PDF loading strategy
- PDF page rendering strategy
- Image-page rendering strategy, if supported
- Page-turn animation implementation
- 3D page geometry/material implementation
- Camera configuration
- Lighting/shadows
- Zoom implementation
- Page navigation
- Previous/next controls
- Thumbnail implementation
- Fullscreen implementation
- Keyboard controls
- Mobile/touch controls
- Loading states
- Error states
- Responsive behavior
- Page preloading/lazy loading
- Memory cleanup
- WebGL resource cleanup
- PDF.js worker configuration
- Styling/theme structure
- Component structure
- State-management approach
- URL/routing behavior
- Bookmark behavior, if present
- Reading-progress behavior, if present

Do not guess these details when the reference repository can be inspected.

## Replication Rule

The reference repository is the **visual and interaction source of truth**
for the flipbook.

Replicate its:

```text
Visual appearance
Page-turn behavior
3D effect
Controls
Navigation
Zoom
Thumbnails
Loading behavior
Responsive behavior
Reader layout
Interaction patterns
```

The implementation may refactor the code into Lexora's architecture, but
the resulting reader should preserve the reference repository's intended
user experience.

## Do Not Blindly Copy the Repository

Do NOT copy the entire reference repository into Lexora.

Instead:

1. Identify the minimum required flipbook implementation.
2. Identify required dependencies.
3. Identify reusable components and utilities.
4. Identify PDF/image rendering logic.
5. Identify required CSS/assets.
6. Identify required worker configuration.
7. Recreate or adapt those parts inside the Lexora feature structure.
8. Remove demo-only code.
9. Remove unrelated Storybook/demo/application code.
10. Remove duplicate routing, authentication, API, and database logic.

The reference repository should provide the **flipbook implementation
behavior**, while Lexora remains responsible for:

- Book management
- Authentication
- Authorization
- Database
- File storage
- Categories
- Tags
- Bookmarks
- Reading progress
- Publishing
- Visibility
- OPAC/search
- Existing application navigation

## Reference Repository Compatibility Check

Before integration, verify:

```text
Reference React version
        ↓
Current Lexora React version

Reference Three.js version
        ↓
Current Lexora dependency tree

Reference PDF.js version
        ↓
Current Lexora PDF dependencies

Reference build tooling
        ↓
Current Vite configuration
```

Resolve version conflicts deliberately.

Do not upgrade or downgrade major project dependencies merely to make the
reference repository work unless the impact on the existing Lexora system
has been evaluated.

## Reference Repository Acceptance Test

After implementation, compare the Lexora reader against the reference
repository using the same test PDF.

Verify:

- Same general page proportions
- Same page-turn direction
- Same 3D perspective
- Same page-turn animation behavior
- Same zoom behavior
- Same navigation behavior
- Same reader controls
- Same thumbnail behavior where applicable
- Same loading experience where applicable
- Same responsive behavior where applicable

Minor implementation differences are acceptable only when required by
Lexora integration, accessibility, security, or performance.

## Performance Preservation

The reference implementation must not simply be copied if it causes
unacceptable performance in Lexora.

Because the project has already experienced lag with 3D flipbook rendering,
the integration must specifically test:

```text
Small PDF
Medium PDF
Large PDF
High-resolution PDF
Image-based book
Mobile viewport
Desktop viewport
Lower-end device
```

Measure or observe:

- Initial reader load
- Time until first visible page
- Page-turn responsiveness
- Memory usage behavior
- WebGL stability
- PDF.js rendering behavior
- Page navigation latency
- Reader cleanup after exit

If the reference implementation renders too many pages simultaneously,
adapt it to use a controlled rendering window while preserving the visual
experience.

## Architecture Rule

The reference flipbook must be isolated inside the Lexora feature.

Recommended structure:

```text
client/src/features/lexora-books/
├── flipbook/
│   ├── FlipbookReader.jsx
│   ├── FlipbookEngine.jsx
│   ├── FlipbookToolbar.jsx
│   ├── FlipbookControls.jsx
│   ├── FlipbookThumbnails.jsx
│   ├── FlipbookBookmark.jsx
│   ├── FlipbookLoading.jsx
│   ├── FlipbookError.jsx
│   ├── hooks/
│   │   ├── useFlipbook.js
│   │   ├── usePdfBook.js
│   │   ├── useImageBook.js
│   │   └── useFlipbookCleanup.js
│   ├── utils/
│   │   ├── flipbookConfig.js
│   │   ├── pageLoader.js
│   │   └── resourceCleanup.js
│   └── styles/
│       └── flipbook.css
```

The exact structure may be adjusted after inspecting the reference
repository.

## Separation of Responsibilities

```text
Lexora Book Data
      ↓
Lexora API
      ↓
Book Reader Data Adapter
      ↓
Reference Flipbook Engine
      ↓
PDF/Image Pages
```

The flipbook engine should not directly query MySQL.

The flipbook should receive the book/page data it needs through a clean
adapter or hook.

Example:

```text
useBook(bookId)
       ↓
reader data
       ↓
FlipbookReader
       ↓
FlipbookEngine
```

This prevents the flipbook implementation from becoming tightly coupled to
Lexora's database or API.

## Existing `react-3d-flipbook` Rule

`react-3d-flipbook` may be used if the provided reference repository is
actually based on it or if it provides the closest compatible implementation.

However:

```text
Reference Repository
        >
Assumed Library Choice
```

The reference repository takes priority.

Do not force `react-3d-flipbook` into Lexora if the provided reference
repository uses a different engine.


# 3. PDF Book Source

When `Book Source Type = PDF`:

## 3.1 PDF File Upload

Allow the administrator to upload a PDF.

Display after upload:

``` text
Filename
File Size
Page Count
Upload Status
Replace PDF
Remove PDF
```

The system should automatically calculate:

-   File size
-   Total page count where possible
-   File type

Accepted file type:

``` text
application/pdf
```

Validate:

-   MIME type
-   File extension
-   Maximum configured file size
-   Upload permissions

Never trust only the client-side file extension.

------------------------------------------------------------------------

## 3.2 PDF Thumbnail Image

Allow an administrator to upload a thumbnail/preview image.

Recommended:

``` text
JPG
JPEG
PNG
WEBP
```

The uploaded image is used as the book card/catalog image if selected.

If no thumbnail is supplied, optionally use the book cover as fallback.

------------------------------------------------------------------------

# 4. Image Book Source

When `Book Source Type = Images`:

## 4.1 Upload Book Pages

Allow multiple image uploads.

Supported formats:

``` text
JPG
JPEG
PNG
WEBP
```

Requirements:

-   Multiple upload
-   Drag and drop
-   Page preview
-   Page deletion
-   Page replacement
-   Drag-and-drop page ordering
-   Automatic page numbering
-   Page count calculation

Example:

``` text
001
002
003
004
...
```

The final order must determine the flipbook page order.

------------------------------------------------------------------------

# 5. Book Information

Create a dedicated `BOOK INFORMATION` section.

## Fields

### Title

-   Type: text
-   Required: Yes

If the title already exists in the Basic Book Setup section, do not
store duplicate values. Use one source of truth.

### Book Short Description

-   Type: textarea
-   Required: No

Used for:

-   Book details page
-   Search results
-   Book cards where appropriate

### Publish On

-   Type: date
-   Required: No

This represents the book's bibliographic/publication date.

Do not confuse this with the date the book was published inside Lexora.

Recommended database fields:

``` text
publish_on
published_at
```

`publish_on` = book publication date.

`published_at` = date/time the administrator published it in Lexora.

### ISBN 10

-   Type: text
-   Required: No

### ISBN 13

-   Type: text
-   Required: No

### Total Pages / Length

-   Type: text or structured value
-   Required: No

For digital PDF/image books, automatically determine the page count when
possible.

Allow a separate bibliographic length value when necessary.

Examples:

``` text
245 pages
320 pages
1 volume
```

### Book Dimensions

-   Type: text
-   Required: No

Example:

``` text
8.5 × 11 in
```

### File Size

-   Type: calculated/read-only
-   Required: No

Do not normally allow manual entry.

For PDFs, calculate the uploaded PDF size.

For image-based books, calculate the combined source size where
appropriate.

### Download URL

-   Type: URL
-   Required: No

Optional external download URL.

Security requirement:

Do not expose private/restricted files through an unrestricted direct
URL. Backend authorization must be checked before protected downloads.

### Co-Publisher

-   Type: text
-   Required: No

### Translator

-   Type: text
-   Required: No

### ASIN

-   Type: text
-   Required: No

### DOI

-   Type: text
-   Required: No

### LLCN

-   Type: text
-   Required: No

### Weight

Recommended structure:

``` text
weight_value
weight_unit
```

Example:

``` text
0.75 kg
```

### Edition

-   Type: text
-   Required: No

Examples:

``` text
1st Edition
2nd Edition
Revised Edition
3rd Edition
```

------------------------------------------------------------------------

# 6. Categories

Categories must be dynamic.

Administrators must be able to:

-   Select existing categories.
-   Search categories.
-   Create a new category without leaving the form.
-   Select multiple categories.
-   Remove selected categories.

Example:

``` text
Categories

[ Education × ]
[ Philippine History × ]

Search or create category...
```

If a category does not exist:

``` text
+ Create "Computer Science"
```

The newly created category should immediately become selectable.

## Database

Use a many-to-many relationship.

``` text
lexora_book_categories
lexora_book_category_relations
```

Do not store categories as comma-separated text.

Avoid:

``` text
"Education,History,Science"
```

------------------------------------------------------------------------

# 7. Tags

Tags are separate from categories.

Tags are intended to improve search and discovery.

Example:

``` text
Teaching Social Studies in Elementary Grades (Philippine History & Government)

Academic Assessment (General & Professional Subjects)
```

Administrators should be able to:

-   Add tags
-   Search existing tags
-   Create a new tag
-   Remove tags
-   Assign multiple tags

## Database

``` text
lexora_book_tags
lexora_book_tag_relations
```

Use a many-to-many relationship.

------------------------------------------------------------------------

# 8. Book Cover

Create a dedicated `BOOK COVER` section.

## Empty State

``` text
No Book Cover

[ + Set Book Cover ]
```

## After Upload

Display:

``` text
Book Cover Preview

[ Change Cover ]
[ Remove Cover ]
```

Recommended formats:

``` text
JPG
JPEG
PNG
WEBP
```

The book cover should be used in:

-   Book cards
-   Book details
-   Search results
-   Featured books
-   Related books
-   User bookmarks/history where applicable

If no cover exists, optionally fall back to the PDF thumbnail.

------------------------------------------------------------------------

# 9. Publishing

Create a dedicated `PUBLISH` section.

## Status

Options:

``` text
Draft
Published
Archived
```

## Visibility

Options:

``` text
Public
Private
```

## Actions

``` text
[ Save Draft ]    [ Publish ]
```

### Save Draft

-   Saves the book.
-   Keeps it unavailable from the public catalog.
-   Allows administrators to continue editing.

### Publish

Before publishing, validate all required information.

Minimum validation should include:

``` text
Title
Book Source Type
PDF file OR at least one image page
Book Cover or valid fallback
Category where required by business rules
```

Then set:

``` text
status = published
published_at = current timestamp
```

### Archive

Archived books should not appear in the normal public catalog but should
remain recoverable by administrators.

Do not hard-delete a book unless the application explicitly requires
permanent deletion.

------------------------------------------------------------------------

# 10. Recommended Admin Book Form

Organize the form into these sections:

``` text
CREATE / EDIT LEXORA BOOK

1. Basic Information
   - Title
   - Book Source Type
   - PDF / Image Source

2. Book Information
   - Short Description
   - Publish On
   - ISBN 10
   - ISBN 13
   - Total Pages / Length
   - Book Dimensions
   - File Size
   - Download URL
   - Co-Publisher
   - Translator
   - ASIN
   - DOI
   - LLCN
   - Weight
   - Edition

3. Categories
   - Dynamic category selector

4. Tags
   - Dynamic tag selector

5. Book Cover
   - Cover upload
   - Preview
   - Replace/remove

6. Publish
   - Status
   - Visibility
   - Save Draft
   - Publish
```

Avoid creating one huge monolithic React component.

------------------------------------------------------------------------

# 11. Admin Book Management

The existing Lexora Books management screen should support:

-   Search
-   Category filter
-   Tag filter
-   Status filter
-   Visibility filter
-   Source type filter
-   Sorting
-   Pagination
-   Create
-   Edit
-   Preview
-   Publish/unpublish
-   Archive
-   Delete where permitted

Recommended card information:

``` text
Book Cover
Title
Author if available
Categories
Source Type
Page Count
Status
Visibility
Views
Bookmarks
```

Actions:

``` text
Edit
Preview
Publish
Archive
```

------------------------------------------------------------------------

# 12. User Side --- Lexora Books

Only books satisfying:

``` text
status = published
visibility = public
```

should appear in the public catalog.

Users should be able to:

-   Browse books
-   Search books
-   Filter by category
-   Search by tags
-   Open book details
-   Open the flipbook
-   Bookmark pages
-   Resume reading

------------------------------------------------------------------------

# 13. User Book Details Page

Recommended route:

``` text
/lexora-books/:bookId
```

Display:

``` text
Book Cover

Title
Short Description
Publish On
ISBN 10
ISBN 13
Total Pages
Dimensions
Publisher / Co-Publisher
Translator
Edition
Categories
Tags

[ Bookmark ]
[ Read Book ]
```

The details page should not load the complete PDF just to display
metadata.

------------------------------------------------------------------------

# 14. 3D Flipbook Reader

Recommended route:

``` text
/lexora-books/:bookId/read
```

Use:

``` text
react-3d-flipbook
```

with:

``` text
pdfjs-dist
```

for PDF rendering.

## Reader Flow

``` text
User opens book
        ↓
Fetch book metadata
        ↓
Verify visibility/access
        ↓
Determine source type
        ↓
PDF ────────────────┐
                    │
                    ▼
                 PDF.js
                    │
Images ────────────┤
                    ▼
              Flipbook Engine
                    │
                    ▼
             3D Book Reader
```

------------------------------------------------------------------------

# 15. Flipbook Reader Controls

The reader should support:

-   Previous page
-   Next page
-   Page number
-   Page count
-   Zoom in
-   Zoom out
-   Reset zoom
-   Thumbnails
-   Fullscreen
-   Bookmark current page
-   Search within PDF where supported
-   Return to book details
-   Responsive layout

Example:

``` text
┌─────────────────────────────────────────────┐
│ ← Back        Book Title                    │
├─────────────────────────────────────────────┤
│                                             │
│              3D FLIPBOOK                    │
│                                             │
├─────────────────────────────────────────────┤
│ ◀     Page 24 / 245     ▶                   │
│                                             │
│ Zoom-  Zoom+  Thumbnails  Bookmark  Fullscreen
└─────────────────────────────────────────────┘
```

------------------------------------------------------------------------

# 16. User Bookmarks

Bookmarks must work at page level.

When the user clicks:

``` text
Bookmark Page
```

save:

``` text
user_id
book_id
page_number
created_at
updated_at
```

Example:

``` text
User 15
Book 27
Page 84
```

A user can have multiple bookmarks in the same book.

Example:

``` text
My Bookmarks

Teaching Social Studies
Page 24

Teaching Social Studies
Page 84

Teaching Social Studies
Page 152
```

Clicking a bookmark must open the book directly at that page.

------------------------------------------------------------------------

# 17. Reading Progress

Implement reading progress separately from bookmarks.

A bookmark means:

> The user intentionally saved this page.

Reading progress means:

> The system remembers where the user last stopped.

Store:

``` text
user_id
book_id
page_number
updated_at
```

Example:

``` text
Continue Reading

Teaching Social Studies

Last read: Page 84

[ Continue Reading ]
```

When opening the book, optionally ask:

``` text
Continue from page 84?

[ Continue ] [ Start from Beginning ]
```

------------------------------------------------------------------------

# 18. Database Design

Use clear, normalized tables.

## `lexora_books`

Recommended fields:

``` text
id
title
slug
short_description

source_type

pdf_url
download_url
thumbnail_url
cover_url

publish_on

isbn10
isbn13

total_pages
length
dimensions
file_size

co_publisher
translator
asin
doi
llcn

weight_value
weight_unit

edition

status
visibility

created_by
published_at
created_at
updated_at
```

Do not duplicate the title in multiple places.

------------------------------------------------------------------------

## `lexora_book_pages`

For image-based books:

``` text
id
book_id
page_number
image_url
file_size
created_at
updated_at
```

Add a unique constraint for:

``` text
(book_id, page_number)
```

------------------------------------------------------------------------

## `lexora_book_categories`

``` text
id
name
slug
created_at
updated_at
```

Add a unique constraint for the category slug/name according to
application rules.

------------------------------------------------------------------------

## `lexora_book_category_relations`

``` text
id
book_id
category_id
```

Add a unique constraint:

``` text
(book_id, category_id)
```

------------------------------------------------------------------------

## `lexora_book_tags`

``` text
id
name
slug
created_at
updated_at
```

------------------------------------------------------------------------

## `lexora_book_tag_relations`

``` text
id
book_id
tag_id
```

Add a unique constraint:

``` text
(book_id, tag_id)
```

------------------------------------------------------------------------

## `lexora_bookmarks`

``` text
id
user_id
book_id
page_number
created_at
updated_at
```

Recommended unique constraint:

``` text
(user_id, book_id, page_number)
```

This prevents duplicate bookmarks for the same user/book/page.

------------------------------------------------------------------------

## `lexora_book_progress`

``` text
id
user_id
book_id
page_number
updated_at
```

Recommended unique constraint:

``` text
(user_id, book_id)
```

This allows one current reading position per user/book.

------------------------------------------------------------------------

# 19. File Storage

Do not store large PDF/image files directly inside MySQL.

Recommended structure:

``` text
lexora-books/
└── {book-id}/
    ├── cover.webp
    ├── thumbnail.webp
    ├── book.pdf
    └── pages/
        ├── 001.webp
        ├── 002.webp
        ├── 003.webp
        └── ...
```

MySQL stores metadata and paths/URLs only.

------------------------------------------------------------------------

# 20. File Upload Security

The backend must validate uploads.

## PDF

Validate:

-   MIME type
-   Extension
-   File signature where practical
-   Maximum file size
-   User permission

## Images

Validate:

-   MIME type
-   Extension
-   Maximum dimensions where appropriate
-   Maximum file size
-   User permission

Never trust only the filename or extension supplied by the browser.

Generate safe server-side filenames.

Do not expose filesystem paths directly to clients.

------------------------------------------------------------------------

# 21. Performance Requirements

This is a critical requirement because 3D/WebGL flipbooks can become
resource-intensive.

## Do not do this

``` text
Large PDF
   ↓
Render every page
   ↓
Create every page texture
   ↓
Load everything into WebGL
```

This can cause:

-   High RAM usage
-   High GPU usage
-   Browser freezing
-   Slow page loading
-   Poor performance on mobile/low-end PCs

## Preferred approach

``` text
PDF
 ↓
PDF.js
 ↓
Lazy page rendering
 ↓
Load current/nearby pages
 ↓
3D Flipbook
```

Only keep the pages needed by the current reading position and nearby
pages whenever the library implementation permits it.

------------------------------------------------------------------------

# 22. Image Optimization

For image-based books:

-   Prefer WebP where supported.
-   Generate optimized versions during upload.
-   Keep originals only when business requirements require them.
-   Avoid loading full-resolution source images unnecessarily.
-   Lazy-load page images.
-   Do not load all pages immediately.

------------------------------------------------------------------------

# 23. React Performance Rules

The implementation must:

-   Avoid unnecessary global state.
-   Avoid unnecessary React re-renders.
-   Keep flipbook state isolated.
-   Keep upload state isolated.
-   Use feature-level hooks.
-   Avoid putting the entire book object into unrelated component state.
-   Do not recreate large arrays unnecessarily.
-   Clean up object URLs.
-   Clean up PDF.js resources where applicable.
-   Properly dispose WebGL resources when the reader is
    closed/unmounted.
-   Avoid rendering thumbnails for every page simultaneously when
    unnecessary.

------------------------------------------------------------------------

# 24. Feature-Based Folder Structure

Follow the existing feature-based architecture.

``` text
client/src/features/lexora-books/
│
├── components/
│   ├── BookCard.jsx
│   ├── BookCover.jsx
│   ├── BookFilters.jsx
│   ├── BookSearch.jsx
│   ├── BookInformationForm.jsx
│   ├── BookSourceSelector.jsx
│   ├── PdfUploader.jsx
│   ├── ImagePagesUploader.jsx
│   ├── CategorySelector.jsx
│   ├── TagSelector.jsx
│   ├── BookCoverUploader.jsx
│   └── PublishPanel.jsx
│
├── flipbook/
│   ├── FlipbookReader.jsx
│   ├── FlipbookToolbar.jsx
│   ├── FlipbookControls.jsx
│   ├── FlipbookThumbnails.jsx
│   ├── FlipbookBookmark.jsx
│   └── FlipbookLoading.jsx
│
├── hooks/
│   ├── useBooks.js
│   ├── useBook.js
│   ├── useBookmarks.js
│   ├── useReadingProgress.js
│   └── useFlipbook.js
│
├── services/
│   └── lexoraBooksApi.js
│
├── pages/
│   ├── LexoraBooks.jsx
│   ├── ManageLexoraBooks.jsx
│   ├── CreateLexoraBook.jsx
│   ├── EditLexoraBook.jsx
│   ├── LexoraBookDetails.jsx
│   └── LexoraBookReader.jsx
│
└── utils/
    ├── bookValidation.js
    ├── bookConstants.js
    └── fileValidation.js
```

Do not create one large `LexoraBooks.jsx` containing all upload, form,
API, category, tag, and flipbook logic.

------------------------------------------------------------------------

# 25. Backend Structure

Use feature-oriented backend organization where compatible with the
existing project.

Recommended:

``` text
server/
├── controllers/
│   └── lexoraBooksController.js
│
├── routes/
│   └── lexoraBooksRoutes.js
│
├── models/
│   ├── LexoraBook.js
│   ├── LexoraBookPage.js
│   ├── LexoraBookCategory.js
│   ├── LexoraBookTag.js
│   ├── LexoraBookmark.js
│   └── LexoraBookProgress.js
│
├── services/
│   ├── lexoraBookService.js
│   ├── lexoraBookUploadService.js
│   └── lexoraBookProcessingService.js
│
└── middleware/
    └── lexoraBookUploadMiddleware.js
```

Adapt this to the existing backend conventions rather than blindly
creating duplicate patterns.

------------------------------------------------------------------------

# 26. Suggested API Endpoints

Use REST-style endpoints consistent with the existing API.

## Admin

``` text
POST   /api/lexora-books
GET    /api/lexora-books/manage
GET    /api/lexora-books/:id
PUT    /api/lexora-books/:id
DELETE /api/lexora-books/:id

POST   /api/lexora-books/:id/publish
POST   /api/lexora-books/:id/archive
POST   /api/lexora-books/:id/restore
```

## Uploads

``` text
POST   /api/lexora-books/:id/pdf
POST   /api/lexora-books/:id/cover
POST   /api/lexora-books/:id/pages
DELETE /api/lexora-books/:id/pages/:pageId
PUT    /api/lexora-books/:id/pages/reorder
```

## Categories

``` text
GET    /api/lexora-book-categories
POST   /api/lexora-book-categories
```

## Tags

``` text
GET    /api/lexora-book-tags
POST   /api/lexora-book-tags
```

## User

``` text
GET    /api/lexora-books
GET    /api/lexora-books/:id
GET    /api/lexora-books/:id/reader
```

## Bookmarks

``` text
GET    /api/lexora-books/:id/bookmarks
POST   /api/lexora-books/:id/bookmarks
DELETE /api/lexora-books/:id/bookmarks/:page
```

## Reading Progress

``` text
GET    /api/lexora-books/:id/progress
PUT    /api/lexora-books/:id/progress
```

Use the existing authentication/RBAC middleware.

------------------------------------------------------------------------

# 27. Access Control

## Admin

Authorized administrators can:

-   Create books
-   Edit books
-   Upload files
-   Manage categories
-   Manage tags
-   Publish books
-   Archive books
-   Manage book pages

## Public User

Can:

-   View public published books
-   Read public books
-   Bookmark pages if authenticated
-   Save reading progress if authenticated

## Private Book

Private books must not be accessible through predictable URLs.

The backend must verify access before returning protected book
data/files.

------------------------------------------------------------------------

# 28. Important Existing-System Rule

This is an **upgrade to the existing Lexora Books system**.

Before modifying the database or frontend:

1.  Inspect the existing Lexora Books tables.
2.  Inspect existing Book-related models.
3.  Inspect existing Book APIs.
4.  Inspect existing `Books.jsx` and related components.
5.  Identify fields that already exist.
6.  Reuse existing fields where appropriate.
7.  Create migrations instead of dropping/recreating existing production
    data.
8.  Preserve existing OPAC functionality.
9.  Preserve existing search/filter behavior unless intentionally
    upgraded.
10. Do not create duplicate book systems without a clear relationship.

The implementation must integrate with the existing Lexora architecture.

------------------------------------------------------------------------

# 29. Migration Requirements

Do not destroy existing book data.

Create a database migration that:

-   Adds missing fields.
-   Creates category relationship tables.
-   Creates tag tables.
-   Creates book page tables.
-   Creates bookmark tables.
-   Creates reading-progress tables.
-   Adds required indexes.
-   Preserves existing records.

Before migration:

``` text
Backup database
```

After migration:

``` text
Verify existing books
Verify existing searches
Verify existing filters
Verify existing librarian access
Verify existing OPAC behavior
```

------------------------------------------------------------------------

# 30. User Experience Requirements

## Loading

Show a clear loading state:

``` text
Loading book...
Preparing flipbook...
Loading page...
```

## Upload

Show:

``` text
Uploading...
45%
```

where practical.

## Errors

Display human-readable errors:

``` text
Unable to upload PDF.
The file is larger than the allowed size.
```

Do not expose raw backend stack traces.

## Empty State

If no books exist:

``` text
No books available.
```

## Reader Error

If the PDF cannot be rendered:

``` text
This book could not be loaded.
Please try again later.
```

------------------------------------------------------------------------

# 31. Acceptance Criteria

The feature is complete when all of the following work.

## Admin

-   [ ] Create a book.
-   [ ] Edit a book.
-   [ ] Save a draft.
-   [ ] Publish a book.
-   [ ] Archive a book.
-   [ ] Set public/private visibility.
-   [ ] Upload PDF.
-   [ ] Upload image pages.
-   [ ] Reorder image pages.
-   [ ] Delete image pages.
-   [ ] Upload/change/remove book cover.
-   [ ] Create a category during book creation.
-   [ ] Select multiple categories.
-   [ ] Create and select tags.
-   [ ] Save all book information fields.
-   [ ] Automatically calculate PDF file size.
-   [ ] Automatically determine page count where possible.
-   [ ] Validate uploads.
-   [ ] Preview a book before publishing.

## User

-   [ ] Published public books appear in Lexora Books.
-   [ ] Draft books are hidden.
-   [ ] Private books are protected.
-   [ ] Users can search books.
-   [ ] Users can filter categories.
-   [ ] Users can view book details.
-   [ ] Users can open the 3D flipbook.
-   [ ] PDF books render correctly.
-   [ ] Image books render correctly.
-   [ ] Users can navigate pages.
-   [ ] Users can zoom.
-   [ ] Users can use fullscreen.
-   [ ] Users can view thumbnails.
-   [ ] Users can bookmark pages.
-   [ ] Users can remove bookmarks.
-   [ ] Users can return to bookmarked pages.
-   [ ] Reading progress is saved.
-   [ ] Users can continue from their last page.

## Reference Flipbook Comparison

-   [ ] Reference repository has been inspected.
-   [ ] Actual flipbook engine has been identified.
-   [ ] Lexora uses the required reference behavior rather than an unrelated flipbook implementation.
-   [ ] Page-turn animation matches the reference.
-   [ ] 3D perspective matches the reference.
-   [ ] Reader controls match the reference where applicable.
-   [ ] Zoom behavior matches the reference where applicable.
-   [ ] Thumbnail/navigation behavior matches the reference where applicable.
-   [ ] Responsive behavior matches the reference where applicable.
-   [ ] Same test PDF produces a comparable reading experience.
-   [ ] Reference demo-only code has not been copied into Lexora.
-   [ ] Reference implementation does not bypass Lexora authentication or API architecture.

## Performance

-   [ ] Large PDFs do not render every page simultaneously.
-   [ ] Image pages are lazy-loaded where possible.
-   [ ] The reader does not unnecessarily reload the PDF.
-   [ ] WebGL resources are cleaned up when leaving the reader.
-   [ ] Mobile layout remains usable.
-   [ ] Low-end devices receive reasonable fallback/performance
    behavior.

------------------------------------------------------------------------

# 32. Implementation Order

Implement in this order to reduce risk.

### Phase 1 --- Existing System Analysis

-   Inspect existing Lexora Books.
-   Inspect database.
-   Inspect existing APIs.
-   Inspect existing components.
-   Identify reusable code.

### Phase 2 --- Database

-   Add new book fields.
-   Add categories.
-   Add tags.
-   Add book pages.
-   Add bookmarks.
-   Add reading progress.
-   Add indexes and constraints.

### Phase 3 --- Admin Book Form

-   Basic information.
-   Source type.
-   PDF upload.
-   Image page upload.
-   Book information.
-   Categories.
-   Tags.
-   Cover.
-   Publishing.

### Phase 4 --- Admin Management

-   Search.
-   Filters.
-   Status.
-   Visibility.
-   Edit.
-   Preview.
-   Publish.
-   Archive.

### Phase 5 --- User Catalog

-   Book cards.
-   Search.
-   Categories.
-   Tags.
-   Details page.

### Phase 6 --- Reference Flipbook Analysis

-   Obtain the reference repository.
-   Inspect its package/dependency versions.
-   Identify the actual flipbook engine.
-   Identify PDF.js/Three.js usage.
-   Identify rendering and page-loading strategy.
-   Identify controls and reader UX.
-   Identify performance/resource cleanup behavior.
-   Document the parts that must be replicated.

### Phase 7 --- Flipbook Integration

-   Replicate the reference flipbook behavior.
-   Integrate the reference flipbook engine into Lexora.
-   Support PDF source.
-   Support image source.
-   Add Lexora book-data adapter.
-   Add controls matching the reference implementation.
-   Add responsive behavior matching the reference implementation.
-   Add loading/error states.
-   Preserve Lexora authentication and permissions.
-   Add resource cleanup when leaving the reader.


### Phase 8 --- User Features

-   Page bookmarks.
-   Bookmark list.
-   Reading progress.
-   Continue reading.

### Phase 9 --- Optimization

-   Lazy loading.
-   Image optimization.
-   PDF loading optimization.
-   WebGL cleanup.
-   Reduce React re-renders.
-   Test large books.
-   Test mobile.

### Phase 10 --- Regression Testing

Verify that existing Lexora functionality remains working.

------------------------------------------------------------------------

# 33. Critical Development Rules

1.  **Do not rebuild existing Lexora Books from scratch.**
2.  **Inspect existing implementation before changing the schema.**
3.  **Do not delete existing book data.**
4.  **Use database migrations.**
5.  **Do not store PDFs/images as MySQL BLOBs.**
6.  **Do not load an entire large PDF into WebGL at once.**
7.  **Keep flipbook logic isolated from book-management logic.**
8.  **Use feature-based components.**
9.  **Keep API/business logic outside UI components.**
10. **Do not duplicate existing API utilities.**
11. **Reuse the existing authentication and RBAC system.**
12. **Use server-side validation for uploads and permissions.**
13. **Do not expose private files through unrestricted URLs.**
14. **Use normalized category/tag relationships.**
15. **Do not store categories or tags as comma-separated strings.**
16. **Keep bookmark state separate from reading-progress state.**
17. **Clean up PDF.js and WebGL resources when components unmount.**
18. **Test with both small and large books.**
19. **Test both PDF and image source types.**
20. **Do not introduce unnecessary libraries when existing project
    utilities can handle the requirement.**

------------------------------------------------------------------------

# 34. Final Architecture

``` text
                         LEXORA BOOKS
                              │
             ┌────────────────┴────────────────┐
             │                                 │
           ADMIN                              USER
             │                                 │
      Create / Edit Book                 Browse Books
             │                                 │
      ┌──────┴──────┐                   Search / Filter
      │             │                         │
     PDF          Images                 Book Details
      │             │                         │
   PDF.js       Book Pages                    │
      │             │                         ▼
      └──────┬──────┘                    Read Book
             │                               │
             ▼                               ▼
       Flipbook Engine                3D Flipbook Reader
             │                               │
             │                    ┌──────────┼──────────┐
             │                    │          │          │
             │                  Pages      Zoom     Fullscreen
             │                    │
             │                 Bookmark
             │                    │
             │              Reading Progress
             │
             ▼
      File Storage
             │
             ▼
          MySQL
             │
    ┌────────┼────────────┐
    │        │            │
  Books  Categories     Tags
             │
       Book Relationships
```

------------------------------------------------------------------------

# 35. Definition of Done

The Lexora Books upgrade is considered complete when an administrator
can:

``` text
Create Book
    ↓
Enter complete bibliographic information
    ↓
Choose PDF or Images
    ↓
Upload source
    ↓
Set Cover
    ↓
Create/select Categories
    ↓
Add Tags
    ↓
Save Draft
    ↓
Preview
    ↓
Publish
```

and a user can:

``` text
Browse Book
    ↓
View Details
    ↓
Open 3D Flipbook
    ↓
Read
    ↓
Bookmark Page
    ↓
Leave
    ↓
Return Later
    ↓
Continue from Last Page / Bookmark
```

The implementation must remain performant, maintainable, secure, and
compatible with the existing Lexora Books/OPAC system.

# 36. Reference Repository Input

Before implementation begins, the project owner must provide one of:

```text
GitHub repository URL
Private repository access/source
ZIP archive of the reference repository
Local repository path
```

Example:

```text
Reference Flipbook:
<repository URL or ZIP>
```

The implementation agent must not invent a reference repository.

If no reference repository has been supplied yet, implementation should stop
at the analysis/integration-preparation stage and request the repository
before making final flipbook-engine decisions.
