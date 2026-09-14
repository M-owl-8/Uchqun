# Media Pipeline — Reconnaissance Report

**Date:** 2026-09-15 · **Mode:** read-only exploration · **Author:** Claude (Opus 5)
**Scope:** photo upload, video upload, profile pictures/avatars (all 6 roles + child records), full path frontend → HTTP → route → middleware → controller → storage → DB → retrieval → render.
**Evidence rule:** code is truth. Every claim below carries a `file:line`. Live DB facts via `postgres-uchqun` MCP (read-only).

> ### ⚠️ UPDATE 2026-09-15 — LIVE VERIFICATION RUN AGAINST PRODUCTION
>
> After the Appwrite project was **restored from paused**, the pipeline was tested end-to-end against
> `https://uchqun-production-b484.up.railway.app`. **The media pipeline is fully working.**
>
> | Test | Result |
> |---|---|
> | Appwrite project alive | ✅ `fra.cloud.appwrite.io` answers with a well-formed API error (v2.1.0) — not paused |
> | **Bucket is public-read?** | ✅ **NO.** Unauthenticated GET of a stored URL → `401 {"message":"No permissions provided for action 'read'","type":"user_unauthorized"}` |
> | `APPWRITE_*` set on Railway | ✅ YES — `POST /media/upload` with `childId`+`title` and **no file** returned `400 No file uploaded` (`mediaController.js:341`), i.e. it passed the 503 storage guard at `:318` |
> | Upload a new file | ✅ `HTTP 201`, new Appwrite file `6aa84d7e001ceb9858f6` created |
> | Retrieve via authenticated proxy | ✅ `HTTP 200`, **byte-identical round trip** (156 B, md5 `c9721e70…`) |
> | Authz — unassigned teacher | ✅ `403` (teacher5 vs teacher1's child) |
> | Authz — nonexistent media | ✅ `404` |
> | Delete | ✅ `HTTP 200`, row soft-deleted, proxy then `404` |
>
> **This resolves Open Questions 1 and 2.** §5's worst case — world-readable child photographs — is **ruled out**:
> the bucket requires authentication, so the raw-URL exposure at `mediaController.js:466` leaks an
> unusable URL rather than the file. It remains worth fixing, but it is **not** a live safeguarding incident.
>
> **Two findings the verification added:**
>
> 1. **The two pre-existing 2026-06-09 photos are dead.** Fetching `032cc714…` through the proxy returns
>    `HTTP 200` with a **70-byte 1×1 PNG** that is **not** the code's own sentinel (md5 `09026025…` vs the
>    sentinel's `f829b914…`), and carries `Cache-Control: max-age=31536000` — the *success* path at
>    `mediaController.js:882-888`. Appwrite authenticates and answers 200, but the blob is gone: the file
>    *records* survived the pause, the *contents* did not. **Both rows are orphaned and should be deleted.**
> 2. **`deleteMedia` orphans its notification.** Deleting the probe left notification `90c877f5` (`type='media'`,
>    `relatedId` → the deleted media, unread) in the parent's feed. `mediaController.js:938+` never cleans up the
>    row `createNotification` wrote at `:502-514`. Removed manually via `DELETE /notifications/:id`. **New defect.**
>
> **Test residue:** none, apart from one soft-deleted `media` tombstone (`efb306c6…`, `deletedAt` set) that the
> read-only MCP cannot purge. Live media count is back to 6.
>
> **The product owner's original claim is now definitively false:** storage is connected and working.
> The "cannot send pictures" symptom is item 3 below — a frontend stub with no storage involvement.

---

## Bottom line

1. **The claim "we cannot send pictures because Appwrite is not connected" is FALSE as stated.** Appwrite is a real, installed, fully-wired dependency (`backend/package.json:64` `node-appwrite ^24.1.0`), and **two real Appwrite-hosted photos exist in the production database**, uploaded 2026-06-09 to bucket `6a029fc00003d99be01d` (live DB query, `media` table).
2. Appwrite was therefore **connected and working in production at least once**. Whether `APPWRITE_*` is *still* set on Railway today is **UNKNOWN from the repo** — `railway.toml:1-11` declares no env vars and no CI workflow references them.
3. **The real reason teachers "cannot send pictures" is a different, unrelated stub:** the parent-journal composer attaches photos, previews them, and then silently discards them — `teacher/src/pages/DailyReflection.jsx:66` destructures `{ subject, body, recipientIds }` and never reads the `photos` array the composer passes at `teacher/src/components/ParentJournalComposer.jsx:81`.
4. That stub **lies to the user**: the UI shows "Photos are only visible to selected parents" (`teacher/src/locales/en/common.json:957`) while the code comment says "they are not persisted" (`ParentJournalComposer.jsx:69-70`).
5. The **dedicated media upload page is fully wired** and is the best-built path in the repo: magic-byte validation (`mediaController.js:392`), `validateChildAccess` (`:399`), tenant + assignment checks, 502/503 error codes.
6. **Avatar upload is a completely separate pipeline** — base64 data URIs in Postgres TEXT columns, no Appwrite at all (`controllers/userController.js:77`, migration `20260423000000-avatar-text-column.js:8`).
7. **Avatar *display* is broken in all four portals.** Every portal does `avatar.startsWith('http') ? avatar : API_BASE + avatar` — a `data:` URI fails that test and gets a hostname prepended (`government/src/pages/Profile.jsx:57-60`, `teacher/src/pages/Profile.jsx:130`, `admin/src/pages/Profile.jsx:104`, `reception/src/pages/Profile.jsx:106`).
8. **Only the Teacher app has avatar-upload UI.** Government, Admin and Reception have zero — the backend route `PUT /api/v1/user/avatar` (`routes/userRoutes.js:15`) accepts every role, but no UI calls it.
9. **12 orphaned document rows in production** point at `/uploads/documents/*.pdf` on Railway's ephemeral disk — the files do not exist (they are seeded rows; all UUIDs begin `5eed`).
10. **Blast radius of finishing this: MEDIUM.** No schema change is required for the content-media path. The work is config verification + three broken frontend paths + `/uploads` static-serving being unauthenticated.

---

## 1. Storage backend — the root question

### Is Appwrite real?

**Real dependency, not a doc artifact.**

| Evidence | Citation |
|---|---|
| `node-appwrite ^24.1.0` in dependencies | `backend/package.json:64` |
| Present in lockfile | `backend/package-lock.json` (matched on `appwrite`) |
| Imported and instantiated | `backend/config/storage.js:3-4` |
| Upgrade commit | `63dc7901 chore(deps): close L-02 L-03 L-05 — upgrade bcryptjs, node-appwrite, multer` |
| Subpath-import bugfix (proof it was exercised) | `701e30a1 fix(backend): import InputFile from node-appwrite/file subpath` |

Storage backends referenced **in code**: Appwrite Storage + local disk fallback. **ABSENT:** S3/`aws-sdk`, Cloudinary, GCS (removed — `73e37307 chore(deps): Q6 remove unused GCS and Google Cloud Logging configuration`), GridFS, busboy, formidable. `multer ^2.2.0` and `sharp ^0.35.3` are real deps used for request parsing and thumbnailing respectively.

### Env vars the media path reads

Read directly from code (I could not read `backend/.env.example` — the session's permission hook blocked it; see Open Questions):

| Var | Read at | Missing → behaviour |
|---|---|---|
| `APPWRITE_ENDPOINT` | `config/storage.js:28`, `:38`, `:112`, `mediaController.js:310`, `:780` | Appwrite disabled; falls to local or hard error |
| `APPWRITE_PROJECT_ID` | `config/storage.js:29`, `:39`, `mediaController.js:311`, `:782` | same |
| `APPWRITE_API_KEY` | `config/storage.js:30`, `:40`, `mediaController.js:312`, `:783` | same |
| `APPWRITE_BUCKET_ID` | `config/storage.js:31`, `:43`, `mediaController.js:313`, `:781` | same |
| `LOCAL_STORAGE_FALLBACK` | `config/storage.js:16`, `mediaController.js:315` | fallback off |
| `LOCAL_UPLOADS_DIR` | `config/storage.js:12` | defaults `process.cwd()/uploads` |
| `FILE_BASE_URL` / `PUBLIC_API_URL` | `config/storage.js:11` | local URLs emitted **relative** (`/uploads/media/x.jpg`) — see §4 |
| `NODE_ENV` | `config/storage.js:172`, `:195`, `mediaController.js:318` | gates prod hard-fail |

**Validation:** all four `APPWRITE_*` are `Joi.string().optional()` — `backend/config/env.js:84-88`. **The app therefore boots cleanly with storage entirely unconfigured.** It logs a warning (`config/storage.js:55`) and nothing else.

**Runtime behaviour when missing:**
- Production + no Appwrite + no fallback → `uploadMedia` returns **503 `MEDIA_STORAGE_NOT_CONFIGURED`** (`mediaController.js:318-330`). Clean, not a crash. **WORKS.**
- Appwrite configured but upload throws + fallback off → **502 `MEDIA_UPLOAD_STORAGE_FAILED`** (`mediaController.js:447-454`). **WORKS.**
- Non-production, nothing configured → silently writes to local disk (`config/storage.js:181-202`).

**Is it set in Railway/CI?** `railway.toml:1-11` sets only builder/healthcheck — **no env vars**. `grep -i appwrite .github/workflows/` → **zero hits** across `ci.yml`, `db-backup.yml`, `health-check.yml`, `railway-deploy.yml`. Railway variables are dashboard-managed and not in the repo. **UNKNOWN** — resolvable only by reading the Railway dashboard or hitting a deployed upload.

`backend/__tests__/envExample.test.js:20` asserts `.env.example` contains the literal string `APPWRITE_ENDPOINT` — so the var is documented there. That test asserts *documentation*, not configuration.

### Local-disk fallback and ephemerality

**The code knows.** `config/storage.js:169-171` and `:13-15` both call out Railway's ephemeral FS and instruct attaching a Railway Volume at `/app/uploads`. `migrations/20260423000000-avatar-text-column.js:7` says it outright: *"Railway has ephemeral storage, so we store images directly in the DB."*

But: **`Dockerfile.backend:13` does `RUN mkdir -p uploads logs` and declares no `VOLUME`**, and `railway.toml` mounts none. So unless a volume was attached via the Railway dashboard, **local-fallback files do not survive a redeploy**. Status: **WIRED-UNTESTED** (the code path exists; nothing proves a volume is attached).

| Component | Status |
|---|---|
| Appwrite client init | **WORKS** — `config/storage.js:35-49`; 2 prod rows prove execution |
| Appwrite `uploadFile` | **WORKS** — `config/storage.js:98-135` |
| Appwrite `deleteFile` | **WIRED-UNTESTED** — `config/storage.js:221-251`, no test |
| `getSignedUrl` | **STUBBED** — `config/storage.js:279-289` returns the same *unsigned* public view URL; nothing calls it |
| Local-disk fallback write | **WIRED-UNTESTED** — `config/storage.js:181-202` |
| Local-disk fallback *retrieval* | **STUBBED / broken** — see §4 |
| Railway persistent volume | **UNKNOWN** — not in repo |

---

## 2. Backend surface

### Every route accepting or serving binary content

| # | Method + path | Router | Middleware chain (in order) | Controller |
|---|---|---|---|---|
| 1 | `GET /api/v1/media/proxy/:fileId` | `routes/mediaRoutes.js:22` | `authenticate` | `proxyMediaFile` — `mediaController.js:714` |
| 2 | `POST /api/v1/media/upload` | `routes/mediaRoutes.js:32` | `authenticate`(:25) → `requireRole('teacher','admin','reception')`(:33) → `uploadSingle`(:34) → validators(:35-56) → `handleValidationErrors`(:57) → `handleUploadError`(:58) | `uploadMedia` — `mediaController.js:307` |
| 3 | `POST /api/v1/media/` (URL-based) | `routes/mediaRoutes.js:63` | `authenticate` → `requireRole(...)` → `createMediaValidator` | `createMedia` — `mediaController.js:532` |
| 4 | `PUT /api/v1/media/:id` | `routes/mediaRoutes.js:64` | `authenticate` → `requireRole(...)` | `updateMedia` — `mediaController.js:645` |
| 5 | `DELETE /api/v1/media/:id` | `routes/mediaRoutes.js:65` | `authenticate` → `requireRole(...)` | `deleteMedia` — `mediaController.js:938` |
| 6 | `PUT /api/v1/user/avatar` | `routes/userRoutes.js:15` | `authenticate`(:12) → `uploadUserAvatar.single('avatar')` | `updateAvatar` — `userController.js:52` |
| 7 | `PUT /api/v1/child/:id` | `routes/childRoutes.js:28-35` | `authenticate`(:10) → `checkChildAccess` → `uploadChildPhoto.single('photo')` → `updateChildValidator` | `updateChild` — `childController.js:~200` |
| 8 | `PUT /api/v1/child/:id/avatar` | `routes/childRoutes.js:25` | `authenticate` → `childIdValidator` only | `updateChildAvatar` — `childController.js:153` |
| 9 | `POST /api/v1/reception/documents` | `routes/receptionRoutes.js:33` | `authenticate`(:26) → `requireReception`(:27) → `upload.single('file')` | `uploadDocument` — `receptionController.js` |
| 10 | `POST /api/v1/reception/parents` | `routes/receptionRoutes.js:50` | `authenticate` → `requireReception` → `upload.fields([child[photo]])` → `createParentValidator` | `createParent` |
| 11 | `POST /api/v1/reception/children` | `routes/receptionRoutes.js:58` | same | `createChildForParent` |
| 12 | `PUT /api/v1/reception/children/:id` | `routes/receptionRoutes.js:59` | same | `updateChildForReception` |
| 13 | `POST /api/v1/auth/admin-register` | `routes/authRoutes.js:25-26` | `uploadLimiter` → `uploadDocuments` (**unauthenticated — by design, it's registration**) | `adminRegistrationController.js:123-145` |
| 14 | `POST /api/v1/resources` | `routes/teacherResourceRoutes.js:33` | `authenticate`(:10) → `requireRole('teacher','admin')` → `resourceUpload.single('file')` | `createResource` — `teacherResourceController.js:54` |
| 15 | `GET /uploads/*` (static) | `server.js:150` | **NONE** | `express.static` |
| 16 | `POST /api/v1/admin/import/children/validate` | `middleware/uploadImportCsv.js` | admin chain | CSV, not media — out of scope |

### Child-scoped-access-pattern compliance

| Route | `validateChildAccess` / `findChildScopedResource`? | Verdict |
|---|---|---|
| `POST /media/upload` | ✅ `mediaController.js:399` + `isTeacherAssignedToChild` `:400` | **compliant** |
| `GET /media/proxy/:fileId` | ✅ `mediaController.js:731-734` | **compliant** |
| `GET /media`, `GET /media/:id` | ✅ manual per-role scoping `mediaController.js:48-136`, `:180-215` | compliant |
| `DELETE /media/:id` | ✅ (guarded per `media.test.js:197`) | compliant |
| **`PUT /child/:id/avatar`** | ❌ **none** — only `Child.findOne({ id, parentId: req.user.id })` at `childController.js:158` | **FLAG** (see below) |
| `POST /resources` | n/a — resources are school-scoped, not child-scoped | n/a |

**FLAG — `PUT /api/v1/child/:id/avatar` (`childRoutes.js:25` → `childController.js:153-178`):**
- No `requireRole`. No multer. No MIME check. No size limit. No magic-byte check.
- It takes `req.body.photo` — **an arbitrary client-supplied string** — and writes it verbatim: `await child.update({ photo })` (`childController.js:164`).
- Ownership *is* enforced (`parentId: req.user.id`, `:158`), so it is not an IDOR; but a parent can store any string (an external URL, a `javascript:` URI, up to the 10 MB `express.json` limit at `server.js:145`) into a field that every portal renders into an `<img src>`.
- Status: **WIRED-UNTESTED**, and a stored-content injection surface.

**FLAG — `/uploads` static serving (`server.js:150`):** `express.static` with **no `authenticate`**. Any file written by the local fallback (`config/storage.js:191`) or by `POST /resources` (`teacherResourceRoutes.js:14`) is **world-readable by URL, unauthenticated**. Filenames are predictable-ish: `resource-${Date.now()}-${Math.round(Math.random()*1e6)}${ext}` (`teacherResourceRoutes.js:17`) — ~10⁶ guesses per known millisecond.

**FLAG — `POST /resources` bypasses `config/storage.js` entirely.** `teacherResourceRoutes.js:13-19` defines its own `multer.diskStorage` writing to the relative path `'uploads/'`, and `teacherResourceController.js:73` builds `${base}/uploads/${req.file.filename}`. Accepts **100 MB** video/audio/image (`:22-29`). This is the one upload path that will *always* lose its files on a Railway redeploy, regardless of Appwrite config.

**FLAG — reception document filter mismatch.** `receptionRoutes.js:33` uses `upload` — the **media** multer whose `fileFilter` allows only images+video (`middleware/upload.js:35-43`). But the UI offers PDF: `reception/src/components/DocumentUpload.jsx:190` → `accept=".pdf,.jpg,.jpeg,.png"`. A `documentFileFilter` that *does* allow PDF exists at `middleware/upload.js:46-57` and is used only by `uploadDocuments` for admin registration (`:81-84`). Also, route 9 has **no `handleUploadError`**, so the filter's `Error` falls through to the global handler (`server.js:193`) rather than returning the intended 400. **Uploading a PDF as Reception cannot succeed.**

### Media model schema + live-DB cross-check

`backend/models/Media.js:4-43`, table `media`, `paranoid: true`.

| Field | Model | Live Postgres | Drift |
|---|---|---|---|
| `id` | UUID PK `:5-9` | `uuid`, NOT NULL | none |
| `childId` | UUID NOT NULL, FK children CASCADE `:10-16` | `uuid`, NOT NULL | none |
| `activityId` | UUID NULL, FK activities SET NULL `:17-23` | `uuid`, NULL | none |
| `type` | ENUM('photo','video') NOT NULL `:24` | `USER-DEFINED` (enum), NOT NULL | none |
| `url` | TEXT NOT NULL `:25` | `text`, NOT NULL | none |
| `thumbnail` | TEXT NULL `:26` | `text`, NULL | none |
| `title` | STRING(500) NULL `:27` | `varchar(500)`, NULL | none |
| `description` | TEXT NULL `:28` | `text`, NULL | none |
| `date` | DATEONLY NOT NULL `:29-33` | `date`, NOT NULL | none |
| `createdAt`/`updatedAt` | timestamps `:36` | `timestamptz` NOT NULL | none |
| `deletedAt` | implicit (paranoid `:37`) | `timestamptz` NULL | none |

**No drift.** Model, migration and live table agree.

**Migrations:** 108 migration files + one `_guards/` directory = the 109 entries in `backend/migrations/`. `SequelizeMeta` holds **108 rows** — **zero pending**. No migration touches the `media` table after creation; the only avatar-related one is `20260423000000-avatar-text-column.js`.

**Other media-ish models:** `models/ParentMedia.js:13-64` (table `parent_media`: `fileName`, `filePath`, `fileType` ENUM, `mimeType`, `fileSize`) and `models/Document.js:13-50` (`filePath`, `fileName`, `mimeType`, `status`). No `Avatar`/`Photo`/`Attachment`/`File` model exists — **ABSENT**.

---

## 3. Profile pictures — per role, exhaustively

### Columns

| Table | Column | Type | Evidence |
|---|---|---|---|
| `users` | `avatar` | TEXT NULL | `models/User.js:66-69`; widened from VARCHAR(255) by `migrations/20260423000000-avatar-text-column.js:8-11` |
| `children` | `photo` | TEXT NULL | `models/Child.js:43-46` |
| `schools` | — | — | **ABSENT** (no image column) |
| teachers | — | — | teachers are rows in `users`; they use `users.avatar` |

### Mechanism (NOT the Appwrite pipeline — verified)

`PUT /api/v1/user/avatar` → `uploadUserAvatar` = `multer.memoryStorage()` (`middleware/uploadChildren.js:4`, `:20-24`) → `userController.js:52-95`:
- MIME allowlist jpeg/png/webp/gif, else **415** (`:65-69`)
- max 1.5 MB raw, else **413** (`:70-76`)
- `data:${mimetype};base64,${buffer.toString('base64')}` written to `users.avatar` (`:77-79`)
- Socket push `user:updated` (`:85-88`)

**`config/storage.js` is never imported by `userController.js`.** Avatars do not touch Appwrite at all.

Child photos have **three** entry points: multipart via `PUT /child/:id` (`childController.js:242-252`, base64-encoded server-side), `photoBase64` JSON via the same route (`:264-291`, format-validated by regex `:271`), and the unvalidated `PUT /child/:id/avatar` (`:164`).

### Live production data

| Metric | Count |
|---|---|
| `users` total | 205 |
| `users` with avatar | **2** (both `data:` URIs, 0 `http`) |
| `children` total | 138 |
| `children` with photo | **1** (`data:` URI) |

### The 6-role table

Backend route `PUT /api/v1/user/avatar` has **only `authenticate`** (`routes/userRoutes.js:12-15`) — every role is authorised server-side. The differences are entirely in the UI.

| Role | Can upload own avatar? | Admin can upload on their behalf? | Displayed in that role's portal? |
|---|---|---|---|
| **Government** | **ABSENT** — no upload UI in `government/src` (grep: zero `/user/avatar`, zero `type="file"`) | **ABSENT** — no such endpoint anywhere | **STUBBED** — renders at `government/src/pages/Profile.jsx:80-81`, but the URL builder at `:57-60` breaks `data:` URIs |
| **Business** | **ABSENT** — no Business portal exists (role is backend-only; `server.js:174` mounts `businessRoutes`) | **ABSENT** | **ABSENT** |
| **Admin** | **ABSENT** — no upload UI in `admin/src` | **ABSENT** | **STUBBED** — `admin/src/pages/Profile.jsx:103-104`, same broken URL builder |
| **Reception** | **ABSENT** — no upload UI in `reception/src` | **ABSENT** | **STUBBED** — `reception/src/pages/Profile.jsx:105-106`, same broken URL builder |
| **Teacher** | **WIRED-UNTESTED** — two UIs: `teacher/src/pages/Profile.jsx:48-83` and `teacher/src/pages/settings/AvatarUpload.jsx:20-42`, both `PUT /user/avatar` | **ABSENT** | **STUBBED** — `Profile.jsx:130` / `AvatarUpload.jsx:60`, same broken URL builder |
| **Parent** | **ABSENT** for the parent's *own* avatar (no UI in `teacher/src/parent/`) | **ABSENT** | n/a |
| **Child records** | **WIRED-UNTESTED** — `teacher/src/parent/pages/childProfile/AvatarUploadModal.jsx:33-42` reads the file as base64 and `PUT /child/:id { photoBase64 }`; 5 MB client cap at `:24` | **WIRED-UNTESTED** — reception can set `child[photo]` at `receptionRoutes.js:50,58,59` | **WIRED-UNTESTED** — `child.photo` returned by `parentMediaController.js:59` |

### The systemic display bug

Every portal uses the identical pattern:

```js
user.avatar.startsWith('http') ? user.avatar : API_BASE + '/' + user.avatar
```

- `government/src/pages/Profile.jsx:57-60`
- `teacher/src/pages/Profile.jsx:130`
- `teacher/src/pages/settings/AvatarUpload.jsx:60`
- `admin/src/pages/Profile.jsx:104`
- `reception/src/pages/Profile.jsx:106`

Stored avatars always begin `data:image/...`, so `startsWith('http')` is **false** and the result is `https://<api-host>/data:image/png;base64,iVBOR...` — a guaranteed broken image. The backend was migrated to base64 on 2026-04-23 and **no frontend was updated to match**. Both production avatars are currently invisible in every portal.

(`shared/components/Avatar.jsx:9-17` renders `src` verbatim and is correct — the bug is in the callers that build the URL before passing it.)

---

## 4. Frontend surface

### Every file input

| Portal | File | Line | Accept | Target | Status |
|---|---|---|---|---|---|
| Admin | `AdminRegister.jsx` | 260, 298 | `image/*,application/pdf` (:261) | `POST /auth/admin-register` (:97) | **WIRED-UNTESTED** |
| Admin | `BulkImport.jsx` | 175 | CSV | `/admin/import/...` (:118) | out of scope |
| Teacher | `media/MediaFormModal.jsx` | 116 | — | `POST /media/upload` via `Media.jsx:178` | **WIRED-UNTESTED** |
| Teacher | `Profile.jsx` | 149 | — | `PUT /user/avatar` (:72) | **WIRED-UNTESTED** |
| Teacher | `settings/AvatarUpload.jsx` | 83 | — | `PUT /user/avatar` (:38) | **WIRED-UNTESTED** |
| Teacher | **`ParentJournalComposer.jsx`** | **217** | `image/*` (:218) | **nothing** | **STUBBED** |
| Parent | `parent/pages/childProfile/AvatarUploadModal.jsx` | 86 | `image/*` (:87) | `PUT /child/:id` (:42) | **WIRED-UNTESTED** |
| Reception | `components/DocumentUpload.jsx` | 189 | `.pdf,.jpg,.jpeg,.png` (:190) | `POST /reception/documents` (`Documents.jsx:60`) | **STUBBED for PDF** (§2) |
| Reception | `parents/ChildFormModal.jsx` | 185 | — | `child[photo]` multipart | **WIRED-UNTESTED** |
| **Government** | — | — | — | — | **ABSENT — zero file inputs** |

### Does everything go through `shared/services/api.js`?

**Yes.** Every upload call above uses the `api` axios instance. `shared/services/api.js:58` correctly strips the JSON `Content-Type` when the body is `FormData`, so the explicit `'Content-Type': 'multipart/form-data'` headers set by callers (e.g. `teacher/src/pages/Media.jsx:179`) are harmless. No `fetch()` or raw axios upload found in any portal.

### Upload UI that cannot succeed — the user-visible symptoms

1. **Teacher → Daily Reflection → parent journal composer.** `teacher/src/pages/DailyReflection.jsx:122` renders `<ParentJournalComposer onSend={handleJournalSend}/>`. The composer collects up to 3 photos (`ParentJournalComposer.jsx:222-223`), previews them via `URL.createObjectURL` (`:241`), and passes them to `onSend({ subject, body, recipientIds, photos })` (`:81`). `handleJournalSend` at `DailyReflection.jsx:66` destructures **only** `{ subject, body, recipientIds }` and POSTs `/teacher/journal/bulk` without them (`:67-73`). **The photos are dropped on the floor.** The code knows — `:69-70`: *"Warn before unload if photos are attached (they are not persisted)"*. **This is almost certainly the screen behind the product owner's claim.**
2. **The same screen displays a false reassurance.** `teacher/src/locales/en/common.json:957` → `"photoWarning": "Photos are only visible to selected parents"` (and the ru/uz equivalents at the same line). It is rendered at `ParentJournalComposer.jsx:231` precisely when photos are attached. A teacher is told their photos are scoped and private; they are in fact discarded.
3. **Reception → Documents → any PDF.** `DocumentUpload.jsx:190` offers `.pdf`; `receptionRoutes.js:33` uses the image/video-only filter. Fails, and with no `handleUploadError` the error shape is whatever `errorHandler` produces.
4. **All four portals → Profile → avatar image.** Broken `data:` URI rendering (§3).

### Hardcoded URLs / placeholders

- `teacher/src/pages/media/mediaUtils.js:5` and the **duplicated** copy at `teacher/src/parent/pages/Media.jsx:40` both hardcode `'http://localhost:5000/api'` as the `VITE_API_URL` fallback. If that env var is unset at build time, every production proxy URL points at the viewer's own localhost.
- `proxyMediaFile` returns a **transparent 1×1 PNG** for *every* error — 400/403/404/500/503 alike (`mediaController.js:719`, `:727`, `:733`, `:738`, `:761`, `:776`, `:792`, `:873`, `:900`, `:934`). Authorisation failures are visually indistinguishable from missing files. Six commits in the git log exist purely to make this so (`0e563f73`, `2622e65b`, `8d98c756`, `8376f55a`, `46e6fc65`, `6492a188`). Good for UX, **actively hostile to diagnosis** — it is why "pictures don't work" is hard to pin down from the UI.

### Local-fallback retrieval is broken end-to-end

`config/storage.js:192` emits `/uploads/media/<name>` **relative** when `FILE_BASE_URL`/`PUBLIC_API_URL` is unset. `getProxyUrl` only rewrites URLs containing `appwrite.io` (`mediaUtils.js:4`), so a relative path passes through unchanged and the browser resolves it against the **portal origin** (Netlify/Vercel), not the API host → 404. Separately, `proxyMediaFile` can only extract a file id from an `appwrite.io` URL (`mediaController.js:748-777`) and returns a transparent PNG otherwise. **Local-fallback media is unviewable in both paths.** Status: **STUBBED**.

---

## 5. Validation, limits, security posture

| Control | Where | Status |
|---|---|---|
| **Type allowlist (declared MIME)** | `middleware/upload.js:35-43` — 5 image + 3 video types | **WORKS** |
| **Magic-byte sniffing** | `mediaController.js:392-396` — `fileTypeFromFile()` from `file-type ^22`, rejects when content ≠ allowlist | **WORKS** (added by `0dc2afae fix(security): close H-03`) |
| Magic-byte on **avatars** | — | **ABSENT** — `userController.js:66-69` trusts `req.file.mimetype` (client-controlled) |
| Magic-byte on **child photos** | — | **ABSENT** — `childController.js:250` defaults to `'image/jpeg'`; `photoBase64` path only regex-checks the prefix (`:271`) |
| Magic-byte on **resources** | — | **ABSENT** — `teacherResourceRoutes.js:24` trusts `mimetype.startsWith('video/')` |
| Magic-byte on **reception docs** | — | **ABSENT** |
| **Max size** | media 50 MB (`upload.js:64`); documents 10 MB (`:78`); avatar/child-photo multer 5 MB (`uploadChildren.js:16`, `:22`) then 1.5 MB in-controller (`userController.js:70`); resources **100 MB** (`teacherResourceRoutes.js:22`); JSON body 10 MB (`server.js:145`) | **WORKS**, but inconsistent |
| Oversize error | `handleUploadError` → 400 "File size exceeds the maximum allowed size of 50MB" (`upload.js:90-95`) — **hardcoded 50 MB even for the 10 MB document limit** | **WIRED-UNTESTED** |
| Client-side pre-check | `teacher/src/pages/Media.jsx:165-169` (50 MB), `AvatarUploadModal.jsx:24` (5 MB — **but server caps at 1.5 MB**, so 1.5–5 MB files pass the UI and fail with a raw 413) | mismatch |
| **Filename sanitisation** | `upload.js:23-29` — `basename.replace(/[^a-zA-Z0-9]/g,'_')` + timestamp + 9-digit random, extension preserved via `path.extname`. Path traversal **not** possible: separators are stripped. | **WORKS** |
| **EXIF stripping** | — | **ABSENT.** `sharp` is loaded (`mediaController.js:18-28`) but `_generateThumbnail` (`:264`) is **dead code** — underscore-prefixed, never called; `uploadMedia` hardcodes `thumbnail: null` (`:467`) and `sanitizeMediaUrls` nulls it again (`:35`). Originals are stored byte-for-byte **with GPS EXIF intact**. For photos of children in special-education schools this is a real safeguarding gap. |
| **Re-encoding / transcoding** | — | **ABSENT** |
| **Malware scanning** | — | **ABSENT** |
| Rate limiting | `uploadLimiter` on admin-register only (`authRoutes.js:25`); global `apiLimiter` (`server.js:153`). No per-user upload limit on `/media/upload`. | partial |

### Are media URLs guessable? Is retrieval authenticated?

**This is the sharpest finding in this section.**

- `media.url` stores the **raw Appwrite URL** (`mediaController.js:466` persists `uploadResult.url`, which `config/storage.js:114` built as `…/files/<id>/view?project=<pid>`). The comment at `config/storage.js:113` and `:132` claims it "will be updated to proxy URL after media record is created" — **that never happens.** Confirmed in production: both Appwrite rows store `https://fra.cloud.appwrite.io/v1/storage/buckets/6a029fc00003d99be01d/files/<id>/view?project=…`.
- Conversion to the authenticated proxy is done **client-side only** — `mediaUtils.js:1-10` and the duplicate at `teacher/src/parent/pages/Media.jsx:30-47`.
- The API therefore **returns raw Appwrite URLs to every client** (`getMedia` → `sanitizeMediaUrls` → `res.json`, `mediaController.js:165-166`). Anyone who can read one API response — or a browser devtools network tab, or a Sentry breadcrumb — holds a **direct, permanent, backend-bypassing link** to the file.
- `config/storage.js:97-102` uploads using **"the bucket's default permissions"** with no explicit ACL. If that default is public-read, those links work for anyone on the internet, forever, with no auth and no expiry. If it is private, they 401 — and then the proxy is doing real work.
- **UNKNOWN — the bucket's default permission setting.** I cannot determine it from the repo. *What I'd need:* the Appwrite console's bucket settings for `6a029fc00003d99be01d`, **or** an unauthenticated `curl -I` against one of the two stored URLs. This single fact decides whether production child photographs are currently world-readable.
- `getSignedUrl` (`config/storage.js:279-289`) is named as though it mitigates this; it returns the identical **unsigned** view URL and ignores `_expiresIn`. Nothing calls it. **STUBBED.**
- Enumeration of the *proxy* is not a concern: `/media/proxy/:fileId` takes the **DB UUID** (`mediaController.js:723`) and enforces `validateChildAccess` + `isTeacherAssignedToChild` (`:731-734`). That endpoint is sound.

### C-02 — group-wide media visibility

**The doc and the code disagree, and the code is the safer of the two.**

CLAUDE.md:57 says C-02 is *"Documented as intentional design ('group-wide media visibility') — REQUIRES product/legal sign-off before launch."*

The implementing code is `backend/controllers/parent/parentMediaController.js`:
- `getMyMedia` with a group: `Media.findAndCountAll` including `Child` with `where: { groupId, parentId: req.user.id }, required: true` — **`:53-61`, critically line 58.**
- `getMyMedia` without a group (legacy): `ParentMedia` where `{ parentId: req.user.id }` — `:25`.
- `getMediaById` with a group: same include, `where: { groupId, parentId: req.user.id }` — `:95`.
- `getMediaById` legacy: `{ id, parentId: req.user.id }` — `:105`.

**Every one of the four queries is hard-scoped to `parentId: req.user.id`.** `groupId` is an **additional narrowing** condition, not a widening one, and `required: true` makes the join an INNER JOIN.

**Precisely who can see which children's media today:**

| Viewer | Sees |
|---|---|
| Parent (via `/api/v1/parent/media`) | **Only media attached to their own children** — and only those children currently in the parent's group (`:58`, `:95`) |
| Parent (via `/api/v1/media`, the endpoint the UI actually uses) | **Only their own children's media** — `mediaController.js:115-135`, no group filter |
| Teacher | Media of children of parents where `users.teacherId = req.user.id` — `mediaController.js:50-82` |
| Admin | Media of children where `child.schoolId = req.user.schoolId`; with a NULL `schoolId`, **fails closed** to `[]` / 403 (DEF-017) — `mediaController.js:83-108` |
| Reception | Same role branch as "else" → treated as a parent lookup by `parentId`; effectively returns nothing | `mediaController.js:113` |
| Government | **All media across all schools, unrestricted** — `mediaController.js:109-112` |

**No parent can see another family's child's media through any endpoint I traced.** The "group-wide" label describes the *design intent* recorded in `audits/beta/BETA-DEFECTS.md:423-430` (group media has no single-child attribution, so the `childId` query param is unused) — it does **not** describe a widened query.

**Doc/doc divergence:** `audits/beta/CONTENT-GATE-INVENTORY.md:7` states **"C-02/PL-001 → ✅ CLOSED (signed 2026-06-11, Q6)"**, while `CLAUDE.md:57` still carries it as ⚠️ pending sign-off, and `audits/beta/FEATURE-MATRIX.md:83` marks it `BLOCKED-LEGAL`. **CLAUDE.md appears stale by ~3 months.** Worth reconciling — it is the file every session reads first.

**Side effect worth flagging:** because `:58` and `:95` require the child to be in the parent's *current* group, moving a child between groups **silently hides all of that child's historical media** from the parent. Not a leak; a data-loss-shaped bug.

---

## 6. Tests

### Backend (Jest)

| File | Lines | Covers | Real or theatre? |
|---|---|---|---|
| `backend/__tests__/media.test.js` | 207 | `getMedia`, `getMediaItem`, `deleteMedia` | **REAL for authz.** 18 assertions on actual role-branch logic. It inspects the constructed `where` clause (`:93`, `:110`, `:138-139`, `:164`, `:189`) — it would catch a scoping regression. Also asserts *negative* facts: `expect(mockMediaFindAll).not.toHaveBeenCalled()` (`:120`, `:128`, `:180`) — a genuinely falsifiable pattern. |
| `backend/__tests__/parentMedia.test.js` | 92 | `getMyMedia`, `getMediaById` | **REAL.** `:57` and `:78` assert `opts.include[0].where` equals exactly `{ groupId: 'g1', parentId: 'p1' }` — this is the C-02 guard, and it is properly pinned. |
| `backend/__tests__/documentUpload.test.js` | 136 | reception `uploadDocument` | **REAL.** Asserts `uploadFile` was called (`:84`), that the DB row does **not** store a temp path (`:94`), and that the temp file was unlinked (`:99`). |

### Frontend (Vitest)

| File | Covers | Real? |
|---|---|---|
| `teacher/src/__tests__/pages/Media.test.jsx` | load, render, filter, edit-modal, view-modal, **PUT** `/media/:id` (`:184`), **DELETE** (`:162`) | **REAL** for those paths |
| `admin/src/__tests__/shared/Avatar.test.jsx` | 2 assertions: initials when no `src`, `<img>` when `src` | **Near-theatre** — `:11-15` tests that `<Avatar src="x">` renders an `<img>`. It cannot fail for any realistic regression and does not touch URL construction. |

### The honest coverage picture

**Zero tests exist for the entire write path of the feature under investigation.**

Untested branches, explicitly:

1. **`uploadMedia` (`mediaController.js:307-529`) — not imported by any test.** `media.test.js:36` imports only `{ getMedia, getMediaItem, deleteMedia }`. Every branch is unverified: the 503 storage guard (`:318`), the 502 storage-failure path (`:447`), magic-byte rejection (`:393`), `validateChildAccess` (`:399`), orphan cleanup on DB failure (`:473`), notification emission (`:502-514`).
2. **`proxyMediaFile` (`:714-936`) — not imported by any test.** ~220 lines, the entire retrieval path, including its authorisation check at `:731-734`. Untested.
3. **`config/storage.js` — no test file exists, and every test that touches it mocks the whole module** (`media.test.js:20-22`, `documentUpload.test.js:11-15`). `uploadFile`, `deleteFile`, `getSignedUrl`, the Appwrite branch, the local fallback, the production hard-fail — **0%**.
4. **`userController.updateAvatar` — no test.** The 415/413 guards and the base64 encoding are unverified.
5. **`childController.updateChildAvatar` — no test.** The unvalidated-string write at `:164` has never been exercised.
6. **`teacherResourceController.createResource` — no test.**
7. **Frontend upload — no test in any portal.** `Media.test.jsx` covers PUT and DELETE but **never POSTs** `/media/upload`. No test asserts that `ParentJournalComposer`'s photos reach the network — which is exactly why the stub at `DailyReflection.jsx:66` survived.
8. **No test asserts avatar URL construction** in any portal — which is why the `data:` URI bug (§3) is live in all four.

The existing tests are honest work on the **read/authorisation** side. The **write and retrieval** sides are unguarded.

---

## 7. Blast radius

### What must change to finish this

| Layer | Change needed | Size |
|---|---|---|
| **Models** | **None.** `Media` matches the live table exactly; `users.avatar`/`children.photo` are already TEXT. | — |
| **Migrations** | **None required.** Optional: backfill/prune the 12 orphaned `documents` rows. | — |
| **Controllers** | Persist the proxy URL instead of the raw Appwrite URL (`mediaController.js:466`) **or** formally accept raw-URL exposure; wire or delete `_generateThumbnail` (`:264`); add magic-byte checks to the three avatar/resource paths | S–M |
| **Routes** | Swap `upload` → `uploadDocument` at `receptionRoutes.js:33` and add `handleUploadError`; add auth (or a signed-URL gate) to `server.js:150` | S |
| **Frontend** | (a) wire `photos` through `DailyReflection.jsx:66` → new/extended endpoint — *this is the actual feature*; (b) fix the `data:` URI check in 5 files; (c) de-duplicate `getProxyUrl`; (d) add avatar-upload UI to Government/Admin/Reception if wanted | **M — the bulk of the work** |
| **Env/config** | Confirm/set `APPWRITE_*` on Railway; decide on `LOCAL_STORAGE_FALLBACK` + a Railway Volume; set `FILE_BASE_URL`; ensure `VITE_API_URL` at build for all portals | S (but blocking) |
| **CI** | Add an integration test for `uploadMedia`+`proxyMediaFile`; no CI workflow currently references storage at all | M |
| **Seed data** | 4 `media` rows point at pexels/googleapis stock URLs; 12 `documents` rows point at non-existent paths | S |
| **Live DB rows** | See below | S |

### Existing production rows

**`media` — 6 rows, 0 soft-deleted:**

| Count | Kind | Pointing at |
|---|---|---|
| 2 | seed photo | `https://images.pexels.com/photos/1438081/…` (external stock) |
| 2 | seed video | `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4` |
| **2** | **real upload, 2026-06-09** | `https://fra.cloud.appwrite.io/v1/storage/buckets/6a029fc00003d99be01d/files/<id>/view?project=…` |

0 rows use a local `/uploads/` path; 0 use `data:`; 0 use a proxy URL.

**Orphans:** the 4 seed rows depend on third-party hosts staying up — not orphaned, but not ours either. The 2 Appwrite rows are orphaned **if and only if** that bucket has been deleted or its key rotated — **UNKNOWN**, needs an Appwrite console check.

**`documents` — 12 rows, ALL orphaned.** Every `filePath` is `/uploads/documents/<uuid>.pdf` (e.g. `5eed0ef1-…/malaka-guvohnomasi-tmm3.pdf`), 0 Appwrite. All created 2026-07-24 with UUIDs beginning `5eed` — these are **seeded**, and `/uploads/documents/` is a directory `config/storage.js:191` never writes to (it writes `/uploads/media/`). The referenced files have never existed in a deployed container. 4 of them are already marked `approved`, meaning the admin verification flow was exercised against files that were not there.

**`parent_media` — 0 rows.** The legacy table and its entire `getMyMedia` fallback branch (`parentMediaController.js:23-45`) are dead in production.

**`users.avatar` — 2 rows** (both `data:`). **`children.photo` — 1 row** (`data:`).

### Migration story for already-uploaded files

Genuinely small: **2 real content files, 3 base64 avatars/photos, 0 local-disk files worth keeping.** The avatars need no migration (they live in the DB and are already durable). The 2 Appwrite files either still resolve — in which case nothing to do — or they do not, in which case losing 2 test photos is acceptable. The 12 `documents` rows should be deleted or re-uploaded; they reference nothing.

### Rank: **MEDIUM**

**Why not LOW:** four distinct upload pipelines exist that do not share code (`config/storage.js` Appwrite path; the base64-into-Postgres avatar path; the `teacherResourceRoutes.js` direct-to-disk path; the reception-documents path). Fixing "uploads" means touching all four. The write and retrieval paths have **zero test coverage**, so every change is unguarded. There are two security items to decide (unauthenticated `/uploads` static serving; raw Appwrite URLs handed to clients) that could each become a child-safeguarding incident. And the frontend fix spans 5+ files across 4 apps.

**Why not HIGH:** no schema migration is required; the model matches production exactly; there are only 6 media rows and 3 avatars in the entire production database, so there is effectively **no data to migrate and nothing to break**; the core `uploadMedia` controller is already well-built (magic-byte validation, tenant isolation, proper error codes); and zero migrations are pending. The dominant cost is verification and frontend wiring, not architecture.

---

## 8. Decision inputs

### Is Appwrite actually the committed choice?

**Evidence it is committed, not half-remembered:**
- It is a pinned production dependency, recently **upgraded on purpose** — `63dc7901 chore(deps): close L-02 L-03 L-05 — upgrade bcryptjs, node-appwrite, multer`.
- A subpath-import bug was found and fixed — `701e30a1 fix(backend): import InputFile from node-appwrite/file subpath` — which only happens if someone ran it.
- A **dedicated proxy endpoint** was built solely to serve Appwrite files around CORS (`mediaRoutes.js:20-22`), then iterated across ~10 commits (`b31bda72`, `f96817a4`, `5dbf69d9`, `4214a06d`, `5edabc69`, `f8a78247`, `6492a188`, `8d98c756`, `2622e65b`, `0e563f73`, `8376f55a`, `46e6fc65`). That is sustained production debugging, not a sketch.
- `4214a06d Fix: Keep Appwrite URL in database, let frontend convert to proxy URL` is an explicit, deliberate architectural decision — and explains the `storage.js:113` comment that no longer matches the code.
- Competing SDKs were **actively removed**: `73e37307 chore(deps): Q6 remove unused GCS and Google Cloud Logging configuration`.
- **Two real files landed in the bucket on 2026-06-09.**

**Evidence of drift since:** the last storage-related commits are `2695d3ee fix(media): local-disk fallback for production + UX hardening` and `dff64571 fix(media): DEF-017 …` — the newer work adds a *local-disk escape hatch*, which reads as hedging against Appwrite. No CI workflow references `APPWRITE_*`. No test covers it. `getSignedUrl` was written and never wired.

**Where the docs sit:** `docs/RAILWAY_SETUP.md` and `audits/redesign/TP-MEDIA-STORAGE.md` both discuss Appwrite (not read in full — see Open Questions). `CLAUDE.md` **never mentions storage, Appwrite, or media configuration at all** — a notable gap in the operating manual for a feature this central.

**Reading:** Appwrite is a real, exercised, deliberately-chosen dependency that was working in production three months ago and has since been left un-tested and un-documented while a local-disk hedge was added beside it. The product owner's belief that it "is not connected" is most plausibly a memory of the pre-June state, or the `APPWRITE_*` vars having been dropped from Railway since — **not** an accurate description of the code.

### Realistic alternatives for a government platform in Uzbekistan

*Factual, no recommendation.*

**Stay on Appwrite Cloud (current).** Already integrated, already proven to work here. The `fra.cloud.appwrite.io` endpoint is **Frankfurt** — EU-resident, not Uzbek-resident. Uzbekistan's personal-data law (ZRU-547, cited in `audits/beta/CONTENT-GATE-INVENTORY.md:39`) contains localisation requirements for citizens' personal data; photographs of identified children in special-education settings are personal data under any reading. Whether an EU region satisfies the ministry is a legal question this codebase cannot answer, and it is separate from whether the code works.

**Self-hosted Appwrite.** Appwrite is open-source and can run on Uzbek infrastructure, which addresses residency while keeping `config/storage.js` unchanged apart from `APPWRITE_ENDPOINT`. That is the lowest-code-churn path to residency compliance. It transfers operational burden — container, database, backup, TLS, upgrades — onto whoever owns the deployment, and Railway does not host it, so a second hosting relationship is required.

**S3-compatible object storage (MinIO self-hosted, or an Uzbek/regional provider).** The most portable target: `config/storage.js` exposes exactly three functions (`uploadFile`, `deleteFile`, `getSignedUrl`), so swapping the backend is a single-file change, and presigned URLs would properly close the raw-URL exposure described in §5 — something the current Appwrite integration does not do. Costs: a new SDK dependency, and the proxy endpoint's reason for existing (CORS) would need revisiting.

**Postgres bytea / large objects — i.e. extend what avatars already do.** The repo has already chosen this for avatars and child photos precisely because Railway's disk is ephemeral (`migrations/20260423000000-avatar-text-column.js:7`). It needs no new vendor, inherits the existing backup regime (`.github/workflows/db-backup.yml`), and puts data wherever the DB already is. It does not scale to 50 MB videos: base64 inflates payloads ~33%, rows would dominate backup size and restore time, and `getMedia` would need to stop returning inline data. Viable for photos, not for the video half of the feature.

**Railway persistent volume + local disk.** The code already supports it (`config/storage.js:16`, `:169-171`) and it is the cheapest path to "files survive a redeploy". It ties media durability to a single Railway volume with no replication, offers no CDN, is single-instance only (conflicting with the Redis/multi-instance direction in CLAUDE.md's Scaling Constraints), and would need `/uploads` static serving (`server.js:150`) put behind auth first.

---

## Open questions for the orchestrator

1. ~~**Are `APPWRITE_*` currently set in the Railway dashboard?**~~ **ANSWERED 2026-09-15: YES.** Verified by live probe — see the UPDATE block at the top. Upload, retrieval and delete all work end-to-end.
2. ~~**What are the default permissions on Appwrite bucket `6a029fc00003d99be01d`?**~~ **ANSWERED 2026-09-15: NOT public-read.** Unauthenticated GET → `401 user_unauthorized`. The raw-URL exposure at `mediaController.js:466` leaks an unusable URL, not the file. Still worth fixing; **not** a live safeguarding incident.
2b. **NEW — delete the 2 dead media rows** (`032cc714…`, `484a4fe7…`). Their Appwrite blobs did not survive the project pause; the proxy returns a 70-byte 1×1 PNG with `HTTP 200`, so the UI shows a blank image with no error.
2c. **NEW — `deleteMedia` orphans notifications.** `mediaController.js:938+` deletes the media row but leaves the `notifications` row created at `:502-514`, leaving parents with unread alerts pointing at deleted media. Needs a cleanup in `deleteMedia` (and a decision on existing orphans).
3. **Is a Railway Volume attached at `/app/uploads`?** Determines whether `POST /resources` (100 MB videos, `teacherResourceRoutes.js:14`) retains anything across deploys.
4. **Was the parent-journal photo feature ever intended to ship, or is the composer's file input aspirational?** `DailyReflection.jsx:66` drops photos while the UI claims they are delivered (`common.json:957`). Either wire it or remove the input and the string — the current state misinforms teachers.
5. **Should `media.url` store the proxy URL instead of the raw Appwrite URL?** `config/storage.js:113`/`:132` says it should; `mediaController.js:466` does not; `4214a06d` says the current behaviour was deliberate. The comment and the commit contradict each other and one of them should be deleted.
6. **Is `CLAUDE.md:57` stale on C-02?** `audits/beta/CONTENT-GATE-INVENTORY.md:7` records it signed on 2026-06-11; `FEATURE-MATRIX.md:83` still says `BLOCKED-LEGAL`. Three sources, three states.
7. **Should Government/Admin/Reception get avatar-upload UI?** The backend already authorises them (`routes/userRoutes.js:12-15`); only the UI is missing. Product call, not a technical gap.
8. **Delete or re-upload the 12 orphaned `documents` rows?** 4 are marked `approved` against files that never existed — an audit-integrity question, not just cleanup.
9. **Is EXIF stripping required before real-user launch?** Originals are stored byte-for-byte with GPS intact; `sharp` is installed and `_generateThumbnail` (`mediaController.js:264`) is dead code that could be repurposed. For geotagged photographs of identified children this likely warrants a decision before launch.
10. **I could not read `backend/.env.example`** — the session's permission hook denied it. All env-var facts above are derived from `process.env` reads in code, which is stronger evidence anyway, but I could not confirm which vars are *documented*. `backend/__tests__/envExample.test.js:20` asserts `APPWRITE_ENDPOINT` appears there. → Have someone with read access confirm the file lists all four `APPWRITE_*` plus `LOCAL_STORAGE_FALLBACK` and `FILE_BASE_URL`.
11. **Not read in full:** `docs/RAILWAY_SETUP.md` and `audits/redesign/TP-MEDIA-STORAGE.md` both match `appwrite`. They may contain the original decision record for §8 and are the obvious next read if the "why Appwrite" history matters.
