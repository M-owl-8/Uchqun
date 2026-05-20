# Backend S7 Sprint C Execution Log

**Sprint:** C — Bulk Import (T1-7a validate + T1-7b start/status/errors)  
**Closed:** 2026-05-20  
**Commits:** bbd1396 (T1-7a), _pending_ (T1-7b)

---

## Section 1: Sprint C Items

### T1-7a — Bulk Import Validate

**Commit:** `bbd1396`  
**Files created/modified:**
- `backend/migrations/20260520100005-create-import-jobs.js` — `import_jobs` table: UUID PK, schoolId FK RESTRICT, createdBy FK SET NULL, filename STRING, status ENUM(ready/importing/completed/failed), totalRows/validRows/invalidRows INTEGER, errors JSONB, rawCsv TEXT (not null), paranoid; indexes on (schoolId, createdAt), createdBy, status
- `backend/models/ImportJob.js` — Sequelize model, paranoid
- `backend/models/index.js` — ImportJob import, School/User associations, named export
- `backend/middleware/uploadImportCsv.js` — multer memoryStorage, 5 MB limit, .csv extension filter, `handleImportUploadError` catches `LIMIT_FILE_SIZE` → 400 `IMPORT_FILE_TOO_LARGE`
- `backend/controllers/admin/adminImportController.js` — `validate()`: 6 file-level checks, 11 row-level error codes, batch parent lookup (one `User.findAll` for all unique emails), within-file duplicate detection via Set, ImportJob.create with rawCsv persisted
- `backend/routes/adminRoutes.js` — `POST /import/children/validate`
- `backend/__tests__/controllers/adminImportController.test.js` — 25 tests
- `backend/__tests__/childAuditHook.test.js` — +1 mock (ImportJob)
- `backend/__tests__/controllers/journalController.test.js` — +1 mock (ImportJob)
- `docs/csv-templates/children-import-template.csv` — 3 example rows (Cyrillic, Uzbek apostrophe, Latin)
- `docs/csv-templates/README.md` — column spec, common Excel mistakes, UTF-8 guidance

**Architecture deviation — rawCsv column:**  
Railway's filesystem is ephemeral. Multer `diskStorage` temp files do not survive between the validate and start requests. Solution: store `req.file.buffer.toString('utf8')` in `import_jobs.rawCsv` (TEXT). T1-7b re-parses this without re-upload. Documented as LQ-010.

**Revert-test evidence (T1-7a):**

*Revert-test 1 — role gate:*
```
PRE-FIX: router.use(requireAdmin) removed from adminRoutes.js
  → teacher-role request reaches validate(); controller returns 201
  × Unit test: role gate documented — controller has no double-check (non-safeguarding endpoint)
POST-FIX: requireAdmin restored; teacher-role blocked at middleware with 403
```

*Revert-test 2 — duplicate detection:*
```
PRE-FIX: seenKeys.has(key) removed from validateRow
  × IMPORT_ROW_DUPLICATE test → received errors=[] invalidRows=0
    (both rows accepted; no duplicate flagged)
POST-FIX: check restored → second occurrence flagged IMPORT_ROW_DUPLICATE
  totalRows=2, validRows=1, invalidRows=1 ✓
```

**Test count:** 25 tests (7 file-level, 11 row-level, 7 success/edge)  
**i18n codes added:** 17 (6 file-level: IMPORT_FILE_*, 11 row-level: IMPORT_ROW_*)

---

### T1-7b — Bulk Import Start / Status / Errors

**Commit:** _see tracker — committed after T1-7a_  
**Files modified:**
- `backend/controllers/admin/adminImportController.js` — added `processImport()` (exported), `start()`, `getStatus()`, `getErrors()`
- `backend/routes/adminRoutes.js` — `POST /import/:id/start`, `GET /import/:id/status`, `GET /import/:id/errors`
- `CLAUDE.md` — Bulk Import Semantics section added
- `audits/backend/i18n-error-codes.md` — 8 T1-7b codes appended

**New file:**
- `backend/__tests__/controllers/adminImportController.start.test.js` — 20 tests

**processImport() design:**
- Re-parses `importJob.rawCsv` with csv-parse (no re-upload needed)
- Fresh parent email lookup at start time (parent state may have changed since T1-7a)
- Skips rows in `importJob.errors` by row number (known-invalid from T1-7a)
- Per-row atomicity via independent try/catch per row — row N failure does not block N±1
- `logAudit` called per successfully created child (action='bulk_import', entity='children')
- Row-level create failures appended to `importJob.errors` as `IMPORT_ROW_CREATE_FAILED`
- Fatal error (re-parse failure, parent lookup failure): `status='failed'`

**Revert-test evidence (T1-7b):**

*Revert-test 1 — cross-school IDOR:*
```
PRE-FIX: importJob.schoolId !== req.user.schoolId check removed from start()
  job.schoolId='school-other', req.user.schoolId='school-1'
  × expect(res.status).toHaveBeenCalledWith(403) → received 202
  → cross-school admin could trigger import on another school's ImportJob
POST-FIX: check restored; 403 IMPORT_JOB_FORBIDDEN returned before update call
  expect(mockJobUpdate).not.toHaveBeenCalled() ✓
```

*Revert-test 2 — audit_log integration:*
```
PRE-FIX: logAudit call removed from processImport row-success branch
  × expect(mockLogAudit).toHaveBeenCalledTimes(2) → received 0 calls
  Both children created, no audit trail
POST-FIX: logAudit restored; called once per created child ✓
  audit entry: action='bulk_import', entity='children', entityId=child.id
```

**Test count:** 20 tests (8 start, 6 processImport, 4 getStatus, 2 getErrors)  
**i18n codes added:** 8 (IMPORT_JOB_NOT_FOUND, IMPORT_JOB_FORBIDDEN, IMPORT_JOB_NOT_READY, IMPORT_NO_VALID_ROWS, IMPORT_START_FAILED, IMPORT_STATUS_FAILED, IMPORT_ERRORS_FAILED, IMPORT_ROW_CREATE_FAILED)

---

## Section 2: Final Test Suite State

**Suite:** 80 suites / 784 tests / 0 failures  
**Sprint B baseline:** 78 suites / 739 tests  
**Sprint C delta:** +2 suites / +45 tests  
**Lint:** 0 errors, 0 warnings

---

## Section 3: Coverage Delta

| Metric | Sprint B close (48.64%) | Sprint C close |
|---|---|---|
| Statements | 48.64% | _measured at commit_ |

New controllers are mock-based; absolute coverage delta is modest. All happy paths and explicit error paths covered by tests.

---

## Section 4: npm audit

Pre-existing findings (unchanged from Sprint B): 13 vulnerabilities (2 low, 6 moderate, 5 high). No new CVEs introduced by Sprint C. No critical vulnerabilities.

---

## Section 5: Cross-Portal Handoffs Now Consumable

| ID | Endpoints | Frontend target |
|---|---|---|
| **CP-011** | POST /admin/import/children/validate, POST /admin/import/:id/start, GET /admin/import/:id/status, GET /admin/import/:id/errors | admin portal import UI |

Integration notes:
- Validate: multipart POST with field name `file` (Content-Type multipart/form-data)
- Start: POST with no body; responds 202 immediately
- Status polling: poll every ~3s until `status ∈ {completed, failed}`
- Errors: GET returns `{ importJobId, errors: [{ row, field, code }] }` — use `row` number and `code` for UI display; `field` is the CSV column name (null for non-field errors like DUPLICATE)

---

## Section 6: i18n Key Inventory (Sprint C)

**T1-7a file-level:**
- `IMPORT_FILE_REQUIRED`, `IMPORT_FILE_TOO_LARGE`, `IMPORT_FILE_INVALID_TYPE`
- `IMPORT_FILE_EMPTY`, `IMPORT_PARSE_FAILED`, `IMPORT_MISSING_HEADERS`

**T1-7a row-level:**
- `IMPORT_ROW_FIRST_NAME_REQUIRED`, `IMPORT_ROW_LAST_NAME_REQUIRED`
- `IMPORT_ROW_DOB_INVALID`, `IMPORT_ROW_DOB_IN_FUTURE`
- `IMPORT_ROW_GENDER_INVALID`, `IMPORT_ROW_DISABILITY_TYPE_REQUIRED`
- `IMPORT_ROW_CLASS_REQUIRED`, `IMPORT_ROW_TEACHER_REQUIRED`
- `IMPORT_ROW_PARENT_EMAIL_INVALID`, `IMPORT_ROW_PARENT_NOT_FOUND`
- `IMPORT_ROW_DUPLICATE`

**T1-7b job-level:**
- `IMPORT_JOB_NOT_FOUND`, `IMPORT_JOB_FORBIDDEN`
- `IMPORT_JOB_NOT_READY`, `IMPORT_NO_VALID_ROWS`
- `IMPORT_START_FAILED`, `IMPORT_STATUS_FAILED`, `IMPORT_ERRORS_FAILED`
- `IMPORT_ROW_CREATE_FAILED`

---

## Section 7: Notable Design Decisions

1. **rawCsv in DB (LQ-010)**: Railway ephemeral filesystem prevents disk-based temp file reuse across requests. rawCsv TEXT column is the correct solution for a single-instance deployment. If import jobs scale to 10K+ rows, move to Appwrite or Railway Volume.

2. **Per-row atomicity via try/catch**: No transactions span multiple rows. Each row commits independently. This means partial imports are possible (rows 1-46 committed, rows 47+ not yet). The ImportJob errors JSONB records which rows failed. The admin UI should show the partial result and allow re-upload with the failed rows fixed.

3. **setImmediate (not Bull/BullMQ)**: The sprint rules forbid external queues. setImmediate is sufficient for synchronous-response + async-processing at this scale. A dedicated Bull queue would be needed for multi-instance deployments or very large imports (>1000 rows).

4. **Re-lookup parents at start time**: Between T1-7a and T1-7b, a parent account might be deleted. Rather than trusting the T1-7a parent map, processImport re-queries parents. Rows whose parent was deleted between validate and start are logged as `IMPORT_ROW_PARENT_NOT_FOUND` (not `IMPORT_ROW_CREATE_FAILED`).

5. **processImport exported**: `processImport` is exported from `adminImportController.js` to allow direct unit testing without mocking `setImmediate`. This is the only exported non-HTTP function in the codebase and is explicitly a testing utility.
