# Round 3 — remediation log (2026-09-15)

Companion to `media-pipeline-exploration.md`. Same evidence rule: every claim carries a
`file:line` or a query, and anything I could not determine is marked as such.

## Status reconciliation, rounds 1–3

**Scope correction, stated plainly.** The round-2 brief asked for four phases (quick-win
fixes, journal photo delivery, data cleanup, security hardening) plus a choice of
journal-photo mechanism. The items the round-3 brief lists under "Status reconciliation" —
storage health probe, `X-Media-Error` headers, proxy-URL persistence, `getSignedUrl`, avatar
UI for four roles, the avatar size-limit reconciliation, `teacherResourceRoutes`, and the
three doc updates — were **never round-2 work packages**. They are findings and open
questions I raised in §§2–5 and the Open Questions list of the exploration report. I did not
do them and did not claim to. Each is listed below with its **verified** current state, so
nothing rests on memory.

| # | Item | State | Commit / evidence |
|---|---|---|---|
| R1 | Avatar/child-photo `data:` URI rendering (8 sites) | **DONE** | `349c847c`; verified live 640×640, `broken:false` |
| R1 | Reception PDF upload (wrong multer) | **DONE** | `349c847c` |
| R1 | `deleteMedia` orphans notification | **DONE** | `349c847c` |
| R2 | Journal photo delivery via `/media/upload` | **DONE** | `fb047385` |
| R3 | Retire Playwright test-residue media row | **DONE** | `b78e7ad6`; proxy → 404 |
| R4 | `/uploads` behind `authenticate` | **DONE** | `ca93f502`; verified live **401** |
| R4 | Magic bytes on avatar / child photo / `updateChildAvatar` | **DONE** | `ca93f502` |
| R4 | EXIF/GPS stripping | **DONE** | `ca93f502`; 9 tests on real sharp encodes |
| — | Dependency advisories blocking the deploy gate | **DONE** | `6b316ca8`, `efdf40af` |
| — | `getProxyUrl` never resolved (the root cause) | **DONE** | `2798ecd6`; verified live |
| WP1 | Teacher scope fork | **DONE** | `58e752d8` |
| WP2 | Reception documents → pending | **DONE** | `b581d973`; up/down tested on local PG18 |
| WP4 | `deleteMedia` cleanup + production orphans | **DONE** | fix `349c847c`; orphan count **0** |
| WP5 | Playwright production writes | **DONE** | `b581d973` |
| WP3 | Live journal send on production | **NOT DONE — blocked, see below** | — |
| WP6 | Two open facts | **REPORTED, not closable from here** | — |

### The items asked about specifically — all still open

| Item | Verified state | Evidence |
|---|---|---|
| Storage health probe | **NOT DONE — never scoped** | no match for `media-health` / `storageHealth` in repo |
| `X-Media-Error` headers | **NOT DONE — never scoped** | no match. `proxyMediaFile` still returns a transparent PNG for every error, so 403 and "file missing" are visually identical |
| Backend returns proxy URLs? | **NO — `media.url` still stores the RAW Appwrite URL** | `mediaController.js:455`, `:485` persist `uploadResult.url` |
| `getSignedUrl` | **STILL STUBBED** | `config/storage.js:279`; zero callers |
| Avatar upload UI: Government / Admin / Reception / Parent | **ABSENT in all four** | only `teacher/src/pages/Profile.jsx:72` and `teacher/src/pages/settings/AvatarUpload.jsx:38` call `PUT /user/avatar` |
| Avatar size limit, client vs server | **STILL MISMATCHED** | client 5 MB (`Profile.jsx:59`, `AvatarUpload.jsx:29`), multer 5 MB (`uploadChildren.js:16,22`), controller 1.5 MB (`userController.js:71`) — a 1.5–5 MB file passes the UI and fails with a raw 413 |
| `teacherResourceRoutes` via `config/storage.js` | **NOT DONE** | `teacherResourceRoutes.js:13-14` still has its own `multer.diskStorage` → `'uploads/'` |
| CLAUDE.md storage section | **NOT DONE** | CLAUDE.md has no storage/Appwrite section at all |
| C-02 reconciliation | **NOT DONE** | `CLAUDE.md:57` still says "REQUIRES product/legal sign-off"; `CONTENT-GATE-INVENTORY.md:7` records it signed 2026-06-11 |
| TP-MEDIA-STORAGE superseded | **NOT DONE** | still "🟡 In progress (pending Railway env + volume setup)" |

**On the raw-URL decision, asked for explicitly.** `media.url` still stores the raw Appwrite
URL. The justification is now *stronger* than in round 2, not weaker: the bucket is confirmed
**not public-read** (unauthenticated GET → `401 user_unauthorized`). The URL is an
identifier, not a capability — leaking it grants nothing without the API key, which never
leaves the backend, and retrieval already goes exclusively through the authenticated proxy.
Persisting the proxy URL would be tidier but is cosmetic against a private bucket, and would
need a data migration of existing rows plus a back-compat branch in `proxyMediaFile` (which
already carries a dead branch for old-format proxy URLs at `mediaController.js:754`). Left
as-is deliberately, not by omission.

## WP1 — the teacher authorisation model

**Correction to my own round-2 report and to the round-3 brief.**
`isTeacherAssignedToChild` (`utils/schoolValidation.js:59`) — the gate used by `uploadMedia`,
`proxyMediaFile` and `createMeal` — is **already a union** of group ownership and the legacy
`users.teacherId` link. It is not group-only. The fork was never modern-vs-legacy; it was
**union-vs-legacy-only**, and that changes the fix: the canonical model is the union, because
the write gate already is the union.

### Every `users.teacherId` consumer

| # | Consumer | Model | Forked? |
|---|---|---|---|
| 1 | `utils/schoolValidation.js:59` `isTeacherAssignedToChild` | union | no — the reference |
| 2 | `teacherController.js:265` `getChildren` | union, fail-closed | no — best prior implementation |
| 3 | `teacherController.js:70` `getDashboardCounts` | union (`Op.or`) | no |
| 4 | `emotionalMonitoringController.js:122` `createOrUpdateMonitoring` | union | no |
| 5 | `mealController.js` `getMeals` | union (inline) | no — now shares the helper |
| 6 | `mediaController.js` `getMedia` | legacy-only | **YES → fixed** |
| 7 | `mediaController.js` `getMediaItem` | legacy-only | **YES → fixed** |
| 8 | `mealController.js` `getMeal` | legacy-only | **YES → fixed** |
| 9 | `activityController.js` `getActivities` | legacy-only | **YES → fixed** |
| 10 | `activityController.js` `getActivity` | legacy-only | **YES → fixed** |
| 11 | `emotionalMonitoringController.js` `getMonitoringByChild` | legacy-only | **YES → fixed** |
| 12 | `emotionalMonitoringController.js` `getAllMonitoring` | legacy-only | **YES → fixed** |
| 13 | `emotionalMonitoringController.js` `getMonitoringById` | legacy-only | **YES → fixed** |
| 14 | `receptionParentController.js:66,93-130,188-217` | **writes** the link | n/a — the only writer |
| 15 | `models/index.js:170-171` | association declaration | n/a |
| 16 | `reception/src/pages/ParentManagement.jsx`, `parents/ParentFormModal.jsx` | **write** only | n/a — no portal reads it for scoping |

`mealController` was forked **inside one file**: `getMeals` had the union, `getMeal` did not.

### WP1d — the ungrouped children, handled deliberately

Verified: the three legacy-only children (`SIM-Malika`, `SIM-Bekzod`, `SIM-Nodira`) all have
`groupId IS NULL`, all in one school. **No cross-teacher leak exists today** — every
legacy-but-not-group child is ungrouped, never in another teacher's group.

The rule implemented: **a child with a group is reached by that group's teacher; a child with
no group is reached by the parent's assigned teacher; a child with neither is reached by
nobody.** The union preserves the three ungrouped children; narrowing to groups would have
stranded them — a regression, not a fix.

Related: `controllers/admin/adminImportController.js` sets **neither** `teacherId` nor
`groupId`, so bulk-imported children are invisible to every teacher until reception assigns a
group. The union does not change that, and should not — they genuinely have no assigned
teacher. This refines the brief's "every teacher onboarded from now on is born blind": it is
path-dependent. Reception's parent form *does* set the link from the chosen group's teacher
(`receptionParentController.js:103,130`); bulk import sets nothing. Either way the union fix
makes the group path work on its own.

### WP1f — is `users.teacherId` dead?

**No, and it must not be dropped.** It is the only link for ungrouped children, it is actively
written by reception onboarding, and 12 of the 19 teachers with children depend on it today.
No drop migration is proposed.

### LQ-TEACHERLINK — the hazard the union does NOT close

The legacy link ignores group membership and is never revoked, so a teacher moved off a group
keeps read access through the stale link. The union propagates that consistently rather than
closing it. Closing it is a **revocation** decision — clear `users.teacherId` when a parent's
group changes, plus a one-off reconciliation — not a question of which link to read. Not
implemented: it removes access from whoever currently relies on a stale link, which is an
owner call. The agreement tests in `__tests__/teacherScopeUnion.test.js` pin the current
behaviour so a future change is deliberate.

## WP2 — the 12 reception documents

All 12 rows have a `filePath` under `/uploads/documents/`, a path no backend code writes
(`config/storage.js` writes `/uploads/media/`), and every one 404s in production.

| Account | School | `documentsApproved` | `isActive` | Document |
|---|---|---|---|---|
| `qabul@tmm3.uz` | Toshkent 3-sonli ixtisoslashtirilgan | true | true | certificate: **approved** |
| `qabul@tmm4.uz` | Toshkent 4-sonli maxsus ta'lim markazi | true | true | certificate: **approved** |
| `qabul@smm3.uz` | Samarqand 3-sonli madad | true | true | certificate: **approved** |
| `qabul@smm4.uz` | Urgut tumani maxsus ta'lim | true | true | certificate: **approved** |
| `qabul@smm5.uz` | Kattaqo'rg'on erta yordam markazi | true | true | certificate: **approved** |
| `qabul@amm1.uz` | Andijon 1-sonli maxsus ta'lim | true | true | certificate: **approved** |
| `qabul2@smm3.uz` | Samarqand 3-sonli madad | true | true | identification: pending |
| `qabul2@smm4.uz` | Urgut tumani maxsus ta'lim | true | true | identification: pending |
| `qabul2@smm5.uz` | Kattaqo'rg'on erta yordam markazi | true | true | identification: pending |
| `qabul2@tmm4.uz` | Toshkent 4-sonli maxsus ta'lim markazi | true | true | identification: pending |
| `qabul2@tmm3.uz` | Toshkent 3-sonli ixtisoslashtirilgan | **false** | **false** | identification: pending |
| `qabul2@amm1.uz` | Andijon 1-sonli maxsus ta'lim | **false** | **false** | identification: rejected |

**Lockout impact of the migration: none.** It changes only `documents.status` and never
touches `users.documentsApproved`, which is the flag `middleware/auth.js:108` gates reception
login on. All 10 accounts that can log in today still can afterwards.

Two facts the owner should weigh separately:

- `qabul2@tmm3.uz` and `qabul2@amm1.uz` are **already locked out today**
  (`documentsApproved=false, isActive=false`). The migration does not change that, and they
  are already blocked from re-uploading, because upload requires a reception login.
  Unblocking them needs an admin action, not this migration.
- Four accounts (`qabul2@smm3/smm4/smm5/tmm4`) have `documentsApproved=true` while their only
  document is `pending`. The flag and the documents **already disagree**, which independently
  confirms the flag is stored rather than derived — and that something activated those
  accounts by a path other than document approval.

If the owner later does flip `documentsApproved=false` to force re-upload, the 6 `qabul@*`
accounts lose reception access immediately and cannot upload the replacement themselves. That
is the lockout decision, and it is not part of this migration.

## WP3 — NOT DONE, deliberately not started

`ChildJournalEntry` is `paranoid: true` (`models/ChildJournalEntry.js:47`) but has **no delete
path anywhere**: no route in `teacherRoutes.js`, no `destroy` in `journalController.js`, no
admin or government escape hatch — the only other consumer is a read-only export
(`parentDataExportController.js:67`). The `postgres-uchqun` MCP is read-only, so rows cannot
be removed directly either.

A journal send therefore creates a `child_journal_entries` row that **cannot be cleaned up**.
Creating production fixtures I cannot remove is exactly the residue defect WP5 exists to
prevent, and the brief rules out hand-deleting rows. So no fixtures were created and no
journal was sent. The photo-delivery path itself remains covered by the byte-exact live
`/media/upload` round trip from round 2 plus 5 integration tests, but the **end-to-end
send + adversarial isolation check has not been performed**.

**Proposed prerequisite — `DELETE /api/v1/teacher/journal/:id`:**
`authenticate → requireRole('teacher') → validateChildAccess(entry.childId) →
isTeacherAssignedToChild`, plus the controller-level role check CLAUDE.md mandates for
parent-facing records; author-only (`entry.teacherId === req.user.id`); soft delete via the
paranoid flag; `logAudit` with actor and reason; new error code
`JOURNAL_ENTRY_NOT_DELETABLE` with its `audits/backend/i18n-error-codes.md` row and en/ru/uz
strings in the same commit. Independently justified: a teacher who sends a journal entry to
the wrong family currently has no way to retract it.

## WP4 — orphaned notifications

Fix shipped in `349c847c`: cleanup scoped to `{relatedId, relatedType: 'media'}`, wrapped so a
notification failure can never fail the media delete, 3 tests. Production orphan count queried
this round — media notifications pointing at no live media row: **0**. Nothing to remediate.

## WP5 — how the Playwright spec reached production

**What allowed it:** `playwright.config.js` hardcodes the five production Railway hosts as
per-project `baseURL`, and the specs hardcode them again — 54 occurrences under `tests/`.
There is no environment indirection anywhere, so production was not the *default* target, it
was the **only** target, using the seeded credentials committed in `credentials.md`. A bare
`npx playwright test` on any machine wrote to the live database.
`s22v3-blocked-rows.spec.js:313` then uploaded `FIXTURE.tinyPng` and left a real `media` row
plus an unread parent notification attached to a real child.

Convention could not fix this; the convention already said "don't", and the run happened.
`tests/_guards/no-production-writes.cjs` is wired as `globalSetup`, so a production target
aborts the **entire run before any spec executes** — including a host supplied via
`BASE_URL`, `PLAYWRIGHT_BASE_URL` or `VITE_API_URL`. `ALLOW_PROD_E2E=true` is the deliberate,
greppable opt-in and logs loudly.

Verified by running Playwright for real, with a grep matching no test so a failed guard still
could not write: blocked, exit 1, zero specs executed; and with the opt-in it proceeds.

## WP6 — the two facts

**(a) Railway Volume at `/app/uploads` — UNKNOWN, not determinable from here.**
`railway.toml` declares no volume (Railway volumes are dashboard-only), `Dockerfile.backend:13`
does `mkdir -p uploads` with no `VOLUME`, and no env var in the repo reveals it.
**Owner check:** Railway → backend service → Volumes, for a mount at `/app/uploads`.
**Consequence either way:** with a volume, `POST /resources` (100 MB files,
`teacherResourceRoutes.js:13-14`, which bypasses `config/storage.js` entirely) persists;
without one, every uploaded resource is destroyed on the next deploy, silently, leaving
`teacher_resources` rows pointing at nothing — the same orphan shape as the 12 documents.
Blast radius is zero **today** only because `teacher_resources` is empty in production; it
becomes real the first time a teacher uploads one.

**(b) Reception portal verification — what bundle inspection does and does not prove.**
It proves the deployed asset **contains the new resolver and no longer contains the old
`startsWith("http")` pattern** — the right code shipped. It does **not** prove the page
renders, that login works, or that an avatar displays, because the Chrome extension lacks host
permission for `reception-production-ba41.up.railway.app`. **To close it:** grant that host in
the extension, log in as a reception account, and read the avatar `<img>` `naturalWidth` in the
DOM, as was done for teacher and parent. Note Reception has no avatar-upload UI and no seeded
avatar, so the strongest available check there is "page renders, no console errors, no broken
images" — the avatar fix itself is not demonstrable on that portal.
