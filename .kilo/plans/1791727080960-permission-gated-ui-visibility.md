# Permission-Driven UI Visibility — Roles, Users & Navigation

**Question answered up front:** yes — hide the action and hide the menu item. The app
already does this correctly in `RolesTable` (`onEditClick &&` …) and `UsersPage`
(`onRoleChange={canManageRoles ? … : undefined}`), but two wiring bugs make almost every
other gate a no-op, so the UI keeps offering actions the server then refuses with a 403.
This plan fixes the wiring first (one root cause fixes ~13 pages), then closes the
navigation and feedback gaps. **No server enforcement change is needed — the server is
already correct and remains the source of truth.**

---

## 1. Root causes (with evidence)

### RC-1 — Auth payload contract break: `permission_details` never reaches the gates (the big one)

* `server/features/roles/roles.service.js:268` — `getAuthPermissionPayload()` returns
  **snake_case**: `{ permissions, permission_details, entity_overrides }`.
* `server/controllers/authController.js:76` (login) and `:117` (`/me`) spread it onto
  `user` unchanged.
* The client stores that raw object into `lexora_user`:
  * `client/src/pages/Login.jsx:50`
  * `client/src/components/auth/ProtectedRoute.jsx:53`
  * `client/src/components/layout/Topbar.jsx:184-185`
* `client/src/utils/permissionUtils.js:52-53` reads **camelCase**
  `user.permissionDetails` → always `undefined` → the legacy fallback
  (`if (!detail …) return true`) makes **every action grant pass**.
* Result: every `hasPermissionAction(...)` gate in the app evaluates `true`:
  `UsersPage` (canManageRoles/canEditPerms/canCreate/canEdit/canDelete/canReactivate —
  `UsersPage.jsx:40-45`), `RolesPage` (canManageRoles, `RolesPage.jsx:31`), `Books`,
  `Borrowed`, `Students`, `Faculty`, `ToolsPage`, `RecentlyDeletedPage`,
  `ManageLexoraBooks`, `LexoraBookDetails/Reader`, `HeroSlidesManager`. Buttons render,
  the server correctly refuses (`Forbidden: requires permission
  'manage_users:manage_roles'`), and nothing on screen explains why.
* Same break silences entity overrides: `permissionUtils.js:65` reads
  `user.entityOverrides` → always `undefined` → `canAccessEntity` always returns `true`.
  (No page consumes it yet, so enabling it is regression-free today.)

### RC-2 — Sidebar renders group children unfiltered

* `client/src/components/layout/Sidebar.jsx:237-240` filters only **top-level** items.
* `GroupMenu` (`Sidebar.jsx:478-508`) maps `children` with **no** visibility check, so a
  child's declared `permission` (`manage_permissions` on "Roles & Permissions"
  `Sidebar.jsx:110`; `manage_students`/`manage_faculty`/`use_kiosk` `Sidebar.jsx:89-92`)
  is ignored.
* The Settings group is visible via `anyPermission` (any of
  manage_settings/manage_users/manage_permissions — `Sidebar.jsx:106`), so an Admin with
  only `manage_users` still **sees** "Roles & Permissions"; clicking it hits
  `PermissionRoute permission="manage_permissions"` (`App.jsx:269-271`) and bounces to
  the dashboard — the reported "redirects back".

### RC-3 — `BottomNav.jsx:4-9` has zero gating

Dashboard / Books / Borrowed / Deleted render for every authenticated user (students
included — the student portal renders inside `Layout`). Clicking any of them bounces the
same way.

### RC-4 — Crash-on-missing-handler pattern in the users tables

* `UserTable.jsx:160-166`: the Edit button renders unconditionally with
  `onClick={() => onEdit(user)}`; `UsersPage.jsx:157` passes `onEdit={canEdit ? … :
  undefined}`. Once RC-1 is fixed, `canEdit` becomes false for restricted users and
  clicking Edit throws `onEdit is not a function`.
* `UserCard.jsx:41-46, 65-79`: Edit / Deactivate / Reactivate have the same shape.
* `RolesTable.jsx:176-197` shows the correct pattern: `{onEditClick && <button …/>}`.

### RC-5 — Failed role change is silently swallowed

* `UserRoleModal.jsx:11-13` awaits `onSubmit(...)` and calls `onClose()`
  **unconditionally** — even when `assignRole` returned `{ success: false, error }`.
* `UsersPage.jsx:76-82` (`handleDeactivate` / `handleReactivate`) ignore the result
  entirely — no toast, no message.

### RC-6 — Stale cache: the restriction "doesn't take effect" for an open tab

* `useLocalStorage.js:14-33` holds state per hook instance with **no** `storage`-event
  or same-tab sync. `ProtectedRoute` writes the fresh `/me` user *after* mount
  (`ProtectedRoute.jsx:48-54`), but the already-mounted `Sidebar`/`useAuth` instances
  keep the old value until a full reload — exactly the "I restricted it but it's still
  visible" symptom.
* `server/controllers/authController.js:190-194`: `updateProfile` responds with a user
  lacking the permission fields, and `Topbar.jsx:184-185` **replaces** the whole cached
  entry with it → after any profile save, `permissions` disappears from the cache and
  `hasPermission` falls back to the role allowlist (librarian/staff/student lose nav
  items and buttons until re-login).

---

## 2. Architecture impact

**Decision: hide, don't disable.** Rationale:

1. It is the pattern the codebase already uses (`RolesTable`, `UsersPage` row actions,
   `RolesPage` Add-Role button).
2. A disabled control still advertises the capability exists and needs a tooltip
   affordance everywhere to be honest; hiding needs no new UI vocabulary.
3. The server is the enforcement point; the client only needs to stop offering what
   will be refused (progressive disclosure).

Supporting decisions:

* **Normalize once, in the API layer** (Anti-Spaghetti §8): add a
  `normalizeAuthUser()` helper in `client/src/services/api/authApi.js` and apply it to
  the `user` returned by `login`, `me`, and `updateProfile`. Every gate then works with
  no per-page change.
* **One source of truth for nav visibility**: keep the nav catalog layout-owned (it is
  chrome spanning features, not a feature). `Sidebar.jsx` is 513 lines (over the ~400
  review trigger), so extracting the catalog + visibility helpers into
  `components/layout/navItems.js` both fixes the size trigger and gives `BottomNav` the
  same `isItemVisibleForUser` implementation.
* **Honest denied-route UX**: change `PermissionRoute` to redirect to the existing
  `/dashboard/unauthorized` page instead of silently bouncing to the role default
  route. `RoleRoute` keeps its role-default bounce (a role mismatch is not a
  permission message).
* No new libraries, no new network calls, no schema change.

---

## 3. Database changes

**None.** No DDL, no migration, no seed change. All fixes are client-side contract and
UI-gating work plus one additive response field (step 1b).

---

## 4. Files affected

### Client — contract & helpers
| File | Change |
|---|---|
| `client/src/services/api/authApi.js` | Add `normalizeAuthUser()` (snake_case → camelCase: `permission_details` → `permissionDetails`, `entity_overrides` → `entityOverrides`); apply in `login`, `me`, `updateProfile`. Idempotent for already-camelCase input. |
| `client/src/utils/permissionUtils.js` | Harden `hasPermissionAction` (RC-1 fallback): when `permissions` is an array but `permissionDetails` is **entirely absent** (pre-details cache), use the same `FALLBACK_ROLES` conservative check as `hasPermission` instead of granting all actions. Keep per-permission missing-detail = granted (old-client compatibility). |
| `client/src/hooks/useLocalStorage.js` | Same-tab cross-instance sync: module-level listener registry keyed by storage key; writer dispatches a `CustomEvent` (`<key>:updated`), listeners update state. Guard `typeof window !== "undefined"` (tests run `renderToString` in the node env). |
| `client/src/utils/permissionUtils.test.js` | Update the "legacy fallback" test to the new conservative semantics; add a server-shaped (normalized) payload case. |

### Client — navigation
| File | Change |
|---|---|
| `client/src/components/layout/Sidebar.jsx` | Filter group **children** with `isItemVisibleForUser`; hide a group whose own route is unreachable **and** has no visible children; render the group parent as a chevron-only header row when its own `permission` is missing (Settings → `manage_settings`, Attendance → `manage_attendance`); auto-open groups from **visible** children only. |
| `client/src/components/layout/navItems.js` (new) | `SECTIONS`, `NAV_ITEMS`, `isItemVisibleForUser`, `groupBySection`, `filterNavItems` moved out of `Sidebar.jsx` (behaviour-preserving extraction), shared with `BottomNav`. |
| `client/src/components/layout/BottomNav.jsx` | Add `permission` per NAV entry (`view_dashboard`, `manage_books`, `manage_transactions`, `manage_trash`); filter via the shared helper; hide the whole bar when nothing is visible (students). |
| `client/src/components/layout/Sidebar.test.jsx` | New cases: admin with `manage_users` only → no "Roles & Permissions"; `use_kiosk` only → Kiosk child yes, Students/Faculty no; super_admin case must still pass. |

### Client — users feature
| File | Change |
|---|---|
| `client/src/features/users/components/UserTable.jsx` | Gate Edit with `onEdit &&` (RolesTable pattern) — prevents the TypeError crash once gates start working. |
| `client/src/features/users/components/UserCard.jsx` | Same gating for Edit / Deactivate / Reactivate. |
| `client/src/features/users/components/UserRoleModal.jsx` | Accept an `error` prop; only `onClose()` when the submit reports success, otherwise show the server message inline (the server message names the exact missing permission). |
| `client/src/features/users/pages/UsersPage.jsx` | Wire `useToast`; surface `assignRole` / `removeUser` / `restoreUser` failures; pass the error state to `UserRoleModal`. |

### Client — routing
| File | Change |
|---|---|
| `client/src/components/auth/ProtectedRoute.jsx` | `PermissionRoute` → `<Navigate to="/dashboard/unauthorized" replace />` on denial (page and route already exist). |

### Server (one additive line)
| File | Change |
|---|---|
| `server/controllers/authController.js` | `updateProfile` response includes `getAuthPermissionPayload(req.session.user)` like `login`/`me`, so a profile save can no longer strip permission fields from the client cache (RC-6). |

---

## 5. Security concerns

* **Client gating stays UX-only.** Every route already has a server guard
  (`can("…", "action")` in `users.routes.js`, super-admin-only in `roles.routes.js`).
  Hiding items does not remove enforcement, and no server check is being weakened.
* The `hasPermissionAction` fallback change only makes the **client more conservative**
  (a stale cache without details now yields the role allowlist instead of "all
  actions"). Worst case is a briefly hidden button until `/me` refreshes.
* `permissionDetails`/`entityOverrides` in `localStorage` is user-owned data the same
  user already receives from `/me`; caching it adds no exposure and grants nothing the
  server did not. Keep it out of `console.log`/telemetry.
* Hide ≠ secure: deep links to a restricted page must still land on `/unauthorized`
  (step 5), and any *new* client-side gate must ship with its server guard.

## 6. Performance concerns

* No new requests. `/me` already refreshes on every mount (`ProtectedRoute.jsx:45-64`)
  and `updateProfile` adds one `resolveUser` (4 parallel indexed reads) only to a
  profile-save response.
* Sidebar/BottomNav filtering is `useMemo`'d over the cached user — negligible.
* `useLocalStorage` sync uses **one module-level listener per storage key** (not per
  hook instance) to avoid listener sprawl across the app's many `LEXORA_USER` readers;
  the `CustomEvent` fires only on writes.
* `resolveUser` remains per-request for guarded endpoints (existing behaviour, out of
  scope here — a per-request cache could be a follow-up, not part of this change).

---

## 7. Implementation order (each step independently verifiable)

1. **Contract fix (highest leverage).** `authApi.normalizeAuthUser` + apply to
   login/me/updateProfile; `authController.updateProfile` includes the payload. Verify
   with a new unit test; manually confirm `UsersPage` hides the Shield (manage_roles)
   button and the KeyRound button for a restricted Admin.
2. **Harden `hasPermissionAction` fallback** + update `permissionUtils.test.js`.
3. **Sidebar child filtering + group rules** (in place first, behaviour-preserving),
   then extract `navItems.js` and wire `BottomNav`. Add Sidebar tests.
4. **users tables gating** (`UserTable`, `UserCard`) + `UserRoleModal` error prop +
   `UsersPage` toasts. Add a render test proving no crash with undefined handlers.
5. **`PermissionRoute` → `/unauthorized`.**
6. **`useLocalStorage` cross-instance sync** (guarded for the node test env).
7. Run the full client suite (`cd client && npm test`) and `npm run build`.

## 8. Verification (manual, the exact reported scenario)

1. Sign in as Super Admin → Users → John Doe (Admin): remove `manage_users:manage_roles`
   and set `manage_permissions` to `view`-only (or remove it) in the permissions drawer.
2. Sign in as John Doe (fresh tab):
   * User Management: no "Change role" (Shield) action; "Create New User" gone if
     `create` was revoked.
   * Sidebar → Settings submenu: **no** "Roles & Permissions" entry; with only
     `manage_users` held, the Settings link itself is a header row (no dead link).
   * Direct visit to `/dashboard/roles` lands on `/dashboard/unauthorized` with the
     permission message instead of a silent dashboard bounce.
   * With `manage_permissions:view` only, the Roles page is still reachable and
     read-only (no Add Role, no Edit/Delete) — the intended "view" behaviour.
3. Save John's profile (avatar/username) → nav and buttons must not change.
4. Revoke a permission while John's tab is open → his UI updates without a manual
   reload (step 6 sync).

## 9. Explicitly out of scope

* Disabled-with-tooltip affordance (rejected; hiding is the chosen model).
* Server-side permission caching / request-scoped memoization of `resolveUser`.
* Moving `routes/`, `services/`, `controllers/` on the server into the feature layout
  (pre-existing structural debt, unrelated to this fix).
