# Backend i18n Error Code Catalog

**Canonical reference** for all `{ success: false, error: { code: '...' } }` codes emitted by the backend.

**Rule:** Any PR that introduces a new error code MUST add a row to this file in the same commit. See `CLAUDE.md` Response Shape Standard (BACKEND-012) for the full error shape spec.

**Introduced:** Sprint B (2026-05-20)  
**Last updated:** Sprint E (2026-05-20)

---

## Observations (`observationController.js`)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `OBSERVATION_CHILD_ID_REQUIRED` | 400 | `childId` field missing or not a valid UUID v4 | "Please select a valid child." |
| `OBSERVATION_INVALID_DATE` | 400 | `observationDate` is missing, not a valid date string, or not parseable | "Please enter a valid date." |
| `OBSERVATION_DATE_IN_FUTURE` | 400 | `observationDate` is after today | "Observation date cannot be in the future." |
| `OBSERVATION_INVALID_DOMAIN` | 400 | `domain` value is not one of `communication`, `motor`, `social`, `cognitive`, `self_care` | "Please select a valid development area." |
| `OBSERVATION_NOTE_TOO_SHORT` | 400 | `note` is fewer than 10 characters after trimming | "Note must be at least 10 characters." |
| `OBSERVATION_NOTE_TOO_LONG` | 400 | `note` exceeds 2000 characters | "Note must be 2000 characters or fewer." |
| `OBSERVATION_INVALID_SEVERITY` | 400 | `severity` value is not one of `routine`, `concern`, `urgent` | "Please select a valid severity level." |
| `OBSERVATION_CHILD_NOT_ACCESSIBLE` | 404 | Child does not belong to the teacher's school, or does not exist | "This child is not in your group." |
| `OBSERVATION_DAYS_OUT_OF_RANGE` | 400 | `?days` query param is not an integer between 1 and 30 | "Please choose between 1 and 30 days." |
| `OBSERVATION_CREATE_FAILED` | 500 | Unexpected server error while saving the observation | "Failed to save observation. Please try again." |
| `OBSERVATION_LIST_FAILED` | 500 | Unexpected server error while fetching observations | "Failed to load observations. Please try again." |

---

## Reflections (`reflectionController.js`)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `REFLECTION_FORBIDDEN` | 403 | Caller's role is not `teacher` (reception and admin cannot access reflections) | "Only teachers can access reflections." |
| `REFLECTION_INVALID_DATE` | 400 | `date` is missing, not in `YYYY-MM-DD` format, or not a valid calendar date | "Please enter a valid date." |
| `REFLECTION_DATE_IN_FUTURE` | 400 | `date` is after today | "Reflection date cannot be in the future." |
| `REFLECTION_CONTENT_TOO_SHORT` | 400 | `content` is fewer than 20 characters after trimming | "Reflection must be at least 20 characters." |
| `REFLECTION_CONTENT_TOO_LONG` | 400 | `content` exceeds 5000 characters | "Reflection must be 5000 characters or fewer." |
| `REFLECTION_ALREADY_EXISTS_FOR_DATE` | 409 | A reflection already exists for this teacher on this date | "You've already written a reflection for this date. Edit the existing one or choose a different date." |
| `REFLECTION_CREATE_FAILED` | 500 | Unexpected server error while saving the reflection | "Failed to save reflection. Please try again." |
| `REFLECTION_LIST_FAILED` | 500 | Unexpected server error while fetching reflections | "Failed to load reflections. Please try again." |

---

## Journal (`journalController.js`)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `JOURNAL_CHILD_NOT_ACCESSIBLE` | 400/404 | `childId` is not a valid UUID, child does not exist, or child belongs to a different school | "This child is not accessible. Please check your selection." |
| `JOURNAL_INVALID_DATE` | 400 | `date` is missing, not in `YYYY-MM-DD` format, or not a valid calendar date | "Please enter a valid date." |
| `JOURNAL_DATE_IN_FUTURE` | 400 | `date` is after today | "Journal date cannot be in the future." |
| `JOURNAL_CONTENT_TOO_SHORT` | 400 | `content` is fewer than 10 characters after trimming | "Entry must be at least 10 characters." |
| `JOURNAL_CONTENT_TOO_LONG` | 400 | `content` exceeds 2000 characters | "Entry must be 2000 characters or fewer." |
| `JOURNAL_NOT_FOUND_FOR_PARENT` | 404 | Child does not belong to the requesting parent, or child does not exist | "This child's journal is not available." |
| `JOURNAL_CREATE_FAILED` | 500 | Unexpected server error while saving the journal entry | "Failed to save journal entry. Please try again." |
| `JOURNAL_LIST_FAILED` | 500 | Unexpected server error while fetching journal entries | "Failed to load journal entries. Please try again." |

---

## Attendance (`attendanceController.js`)

Introduced: TP-DAVOMAT-REWORK (2026-06-06)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `ATTENDANCE_RECORDS_REQUIRED` | 400 | `records` array is missing or empty | "Please provide at least one attendance record." |
| `ATTENDANCE_CHILD_ID_REQUIRED` | 400 | A record in the batch is missing `childId` | "Each record must include a child identifier." |
| `ATTENDANCE_DATE_REQUIRED` | 400 | A record in the batch is missing `date` | "Each record must include a date." |
| `ATTENDANCE_INVALID_DATE` | 400 | `date` is not a valid ISO 8601 date string | "Please enter a valid date (YYYY-MM-DD)." |
| `ATTENDANCE_FUTURE_DATE` | 400 | `date` is after today | "Attendance cannot be recorded for a future date." |
| `ATTENDANCE_INVALID_STATUS` | 400 | `status` is not one of `present`, `absent`, `home_leave`, `sick`, `hospitalized` | "Please select a valid presence status." |
| `ATTENDANCE_ACCESS_DENIED` | 400 (per-record) | Child does not belong to this school, or teacher is not assigned to the child | "You do not have access to this child's record." |
| `ATTENDANCE_SAVE_FAILED` | 400/500 | Database error while saving a record | "Failed to save attendance. Please try again." |

---

## Bulk Import — file-level (`adminImportController.js`)

Introduced: Sprint C T1-7a (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `IMPORT_FILE_REQUIRED` | 400 | No file was attached to the multipart request | "Please select a CSV file to upload." |
| `IMPORT_FILE_TOO_LARGE` | 400 | File exceeds the 5 MB limit (emitted by multer, caught by `handleImportUploadError`) | "File is too large. Maximum size is 5 MB." |
| `IMPORT_FILE_INVALID_TYPE` | 400 | File extension is not `.csv`, or multer filter rejected the MIME type | "Only CSV files are supported." |
| `IMPORT_FILE_EMPTY` | 400 | File has 0 bytes, or the CSV has no data rows (only a header row) | "The file is empty. Please add at least one row of data." |
| `IMPORT_PARSE_FAILED` | 400 | csv-parse threw while parsing the buffer (malformed CSV — unclosed quotes, invalid encoding, etc.) | "Could not read the file. Please check it is a valid CSV." |
| `IMPORT_MISSING_HEADERS` | 400 | One or more required column headers are absent. `detail` lists the missing names. | "Required columns are missing: {detail}. Check the template." |

## Bulk Import — row-level (`adminImportController.js`)

Row-level errors are embedded in the ImportJob `errors` JSONB array as `{ row, field, code }` objects. The endpoint still returns HTTP 201 when row-level errors exist (the ImportJob is created regardless).

| Code | Field | Meaning | Frontend translation guidance |
|---|---|---|---|
| `IMPORT_ROW_FIRST_NAME_REQUIRED` | `firstName` | Cell is empty after trimming | "First name is required." |
| `IMPORT_ROW_LAST_NAME_REQUIRED` | `lastName` | Cell is empty after trimming | "Last name is required." |
| `IMPORT_ROW_DOB_INVALID` | `dateOfBirth` | Missing, not in YYYY-MM-DD format, or not a valid calendar date | "Date of birth must be YYYY-MM-DD." |
| `IMPORT_ROW_DOB_IN_FUTURE` | `dateOfBirth` | Date is after today | "Date of birth cannot be in the future." |
| `IMPORT_ROW_GENDER_INVALID` | `gender` | Value is not `Male`, `Female`, or `Other` (case-sensitive) | "Gender must be Male, Female, or Other." |
| `IMPORT_ROW_DISABILITY_TYPE_REQUIRED` | `disabilityType` | Cell is empty after trimming | "Disability type is required." |
| `IMPORT_ROW_CLASS_REQUIRED` | `class` | Cell is empty after trimming | "Class is required." |
| `IMPORT_ROW_TEACHER_REQUIRED` | `teacher` | Cell is empty after trimming | "Teacher name is required." |
| `IMPORT_ROW_PARENT_EMAIL_INVALID` | `parentEmail` | Missing, or fails basic email-format check | "A valid parent email address is required." |
| `IMPORT_ROW_PARENT_NOT_FOUND` | `parentEmail` | Email passes format check but no parent User with that email exists in the system | "No parent account found with this email. Create the parent account first." |
| `IMPORT_ROW_DUPLICATE` | `null` | Row has the same firstName + lastName + dateOfBirth (case-insensitive) as an earlier row in the same file | "This child appears more than once in the file. Remove duplicate rows." |

## Bulk Import — job-level (`adminImportController.js` T1-7b)

Introduced: Sprint C T1-7b (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `IMPORT_JOB_NOT_FOUND` | 404 | No ImportJob found with the given `:id`, or it has been soft-deleted | "Import job not found." |
| `IMPORT_JOB_FORBIDDEN` | 403 | The ImportJob belongs to a different school than the requesting admin | "Access denied." |
| `IMPORT_JOB_NOT_READY` | 409 | Job status is not `ready` (already importing, completed, or failed) | "This import cannot be started. Check its current status." |
| `IMPORT_NO_VALID_ROWS` | 422 | Job has `validRows=0` — nothing to import | "No valid rows to import. Fix the validation errors and re-upload." |
| `IMPORT_START_FAILED` | 500 | Unexpected error in `start()` before background processing begins | "Failed to start import. Please try again." |
| `IMPORT_STATUS_FAILED` | 500 | Unexpected error fetching job status | "Failed to retrieve import status." |
| `IMPORT_ERRORS_FAILED` | 500 | Unexpected error fetching job errors list | "Failed to retrieve import errors." |
| `IMPORT_ROW_CREATE_FAILED` | n/a | A valid row failed at `Child.create()` during T1-7b (stored in `errors` JSONB, not returned as HTTP status) | "Row {n} could not be saved. Check for data conflicts." |

## Child School Transfer (`childController.js`)

Introduced: Sprint D T2-4 (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `CHILD_TRANSFER_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth) | "Only admins can transfer children between schools." |
| `CHILD_TRANSFER_TARGET_REQUIRED` | 400 | `toSchoolId` field is missing from request body | "Please specify the destination school." |
| `CHILD_TRANSFER_NOT_IN_SCHOOL` | 403 | Child does not belong to the admin's school — cross-school pull attempt blocked | "This child is not in your school." |
| `CHILD_TRANSFER_SAME_SCHOOL` | 400 | `toSchoolId` equals the child's current `schoolId` | "The child is already in this school." |
| `CHILD_TRANSFER_SCHOOL_NOT_FOUND` | 404 | No school record with `toSchoolId` exists | "Destination school not found." |
| `CHILD_TRANSFER_FAILED` | 500 | Unexpected server error during transfer | "Transfer failed. Please try again." |

---

## Account Lifecycle (`middleware/auth.js`, `adminParentController.js`)

Introduced: Sprint D T2-2 PR2 (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `ACCOUNT_NOT_ACTIVE` | 401 | User's `status` field is `suspended` or `archived` — emitted by `authenticate` middleware for all non-government users | "Your account has been suspended. Contact your administrator." |
| `PARENT_SUSPEND_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth check) | "Only admins can suspend parent accounts." |
| `PARENT_ACTIVATE_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth check) | "Only admins can reactivate parent accounts." |
| `PARENT_NOT_FOUND` | 404 | No parent user with that ID exists in this school, or the account was deleted | "Parent account not found." |
| `PARENT_ALREADY_SUSPENDED` | 409 | Parent `status` is already `suspended` — suspend is a no-op | "This account is already suspended." |
| `PARENT_ALREADY_ACTIVE` | 409 | Parent `status` is already `active` — activate is a no-op | "This account is already active." |
| `PARENT_SUSPEND_FAILED` | 500 | Unexpected server error while setting `status='suspended'` | "Failed to suspend account. Please try again." |
| `PARENT_ACTIVATE_FAILED` | 500 | Unexpected server error while setting `status='active'` | "Failed to reactivate account. Please try again." |

---

## Restore Endpoints (`admin/adminRestoreController.js`)

Introduced: Sprint E T2-9 (2026-05-20)

Applies to: `PUT /admin/children/:id/restore`, `/admin/users/:id/restore`, `/admin/observations/:id/restore`, `/admin/attendance/:id/restore`

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `RESTORE_NOT_FOUND` | 404 | No record found with the given `:id` (even including soft-deleted rows) | "Record not found." |
| `RESTORE_NOT_DELETED` | 400 | Record exists but `deletedAt` is null — it has not been soft-deleted | "This record has not been deleted and cannot be restored." |
| `RESTORE_FORBIDDEN` | 403 | Caller role is not `admin` or `government`, or admin is attempting to restore a record from a different school | "You do not have permission to restore this record." |
| `RESTORE_FAILED` | 500 | Unexpected server error during restore | "Failed to restore record. Please try again." |

---

## Child Goals / IEP (`goalController.js`, `admin/adminGoalController.js`)

Introduced: Sprint E T2-3 (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `GOAL_CHILD_NOT_ACCESSIBLE` | 404 | Child does not exist, belongs to a different school, or caller lacks access | "This child is not accessible." |
| `GOAL_NOT_FOUND` | 404 | No goal found with the given `:id` in the caller's school | "Goal not found." |
| `GOAL_INVALID_CATEGORY` | 400 | `category` is missing or not one of the 8 enum values | "Please select a valid goal category." |
| `GOAL_TITLE_REQUIRED` | 400 | `title` is missing or empty | "Goal title is required." |
| `GOAL_TITLE_TOO_SHORT` | 400 | `title` is fewer than 5 characters after trimming | "Title must be at least 5 characters." |
| `GOAL_TITLE_TOO_LONG` | 400 | `title` exceeds 200 characters | "Title must be 200 characters or fewer." |
| `GOAL_DESCRIPTION_TOO_LONG` | 400 | `description` exceeds 2000 characters | "Description must be 2000 characters or fewer." |
| `GOAL_MEASUREMENT_TOO_LONG` | 400 | `measurement` exceeds 1000 characters | "Measurement must be 1000 characters or fewer." |
| `GOAL_BASELINE_TOO_LONG` | 400 | `baseline` exceeds 1000 characters | "Baseline must be 1000 characters or fewer." |
| `GOAL_PROGRESS_NOTES_TOO_LONG` | 400 | `progressNotes` exceeds 2000 characters | "Progress notes must be 2000 characters or fewer." |
| `GOAL_INVALID_TARGET_DATE` | 400 | `targetDate` is not a valid YYYY-MM-DD date | "Please enter a valid target date." |
| `GOAL_TARGET_DATE_IN_PAST` | 400 | `targetDate` is before today (on create only) | "Target date must be in the future." |
| `GOAL_INVALID_PROGRESS_STATUS` | 400 | `currentProgress` is not one of the 5 enum values | "Please select a valid progress status." |
| `GOAL_IMMUTABLE_FIELD` | 400 | Attempted to change `childId`, `category`, `createdBy`, or `schoolId` on update | "This field cannot be changed after creation." |
| `GOAL_REVIEW_INVALID_STATUS` | 400 | `status` is not one of the 5 review status enum values | "Please select a valid review status." |
| `GOAL_REVIEW_DATE_REQUIRED` | 400 | `reviewDate` is missing or not a valid YYYY-MM-DD | "Review date is required." |
| `GOAL_REVIEW_DATE_IN_FUTURE` | 400 | `reviewDate` is after today | "Review date cannot be in the future." |
| `GOAL_REVIEW_EVIDENCE_TOO_LONG` | 400 | `evidence` exceeds 2000 characters | "Evidence must be 2000 characters or fewer." |
| `GOAL_REVIEW_NEXT_STEPS_TOO_LONG` | 400 | `nextSteps` exceeds 2000 characters | "Next steps must be 2000 characters or fewer." |
| `GOAL_FORBIDDEN` | 403 | Caller role is not `admin` (admin goal controller defense-in-depth) | "Access denied." |
| `GOAL_LIST_FAILED` | 500 | Unexpected server error while fetching goals | "Failed to load goals. Please try again." |
| `GOAL_FETCH_FAILED` | 500 | Unexpected server error while fetching a single goal | "Failed to load goal. Please try again." |
| `GOAL_CREATE_FAILED` | 500 | Unexpected server error while creating goal | "Failed to save goal. Please try again." |
| `GOAL_UPDATE_FAILED` | 500 | Unexpected server error while updating goal | "Failed to update goal. Please try again." |
| `GOAL_DELETE_FAILED` | 500 | Unexpected server error while deleting goal | "Failed to delete goal. Please try again." |
| `GOAL_REVIEW_CREATE_FAILED` | 500 | Unexpected server error while creating review | "Failed to save review. Please try again." |
| `GOAL_REVIEW_LIST_FAILED` | 500 | Unexpected server error while fetching reviews | "Failed to load reviews. Please try again." |

---

## School Archival (`governmentController.js`, `middleware/schoolScope.js`)

Introduced: Sprint D T2-7 (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `SCHOOL_NOT_FOUND` | 404 | No school record found with the given `:id` | "School not found." |
| `SCHOOL_ALREADY_ARCHIVED` | 409 | School `isActive` is already `false` — archive is a no-op | "This school is already archived." |
| `SCHOOL_ALREADY_ACTIVE` | 409 | School `isActive` is already `true` — reactivate is a no-op | "This school is already active." |
| `SCHOOL_ARCHIVE_FAILED` | 500 | Unexpected server error while setting `isActive=false` | "Failed to archive school. Please try again." |
| `SCHOOL_REACTIVATE_FAILED` | 500 | Unexpected server error while setting `isActive=true` | "Failed to reactivate school. Please try again." |
| `SCHOOL_ARCHIVED` | 403 | Emitted by `requireSchoolScope` middleware when a non-government user's school has `isActive=false` | "Your school has been archived. Contact the platform administrator." |

---

## Government Region Authorization (`middleware/regionScope.js`)

Introduced: CP-021 Region Sprint A (2026-05-21)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `GOV_ACCOUNT_NOT_CONFIGURED` | 403 | Government user has `govLevel = null` — account was not backfilled by the migration or was created before CP-021 landed. Requires admin action to assign govLevel. | "Your government account is not fully configured. Please contact the platform administrator." |
| `GOV_ACCESS_DENIED` | 403 | Secondary government account attempted to access a feature not in their `govAccessGrants`. | "You don't have permission to access this feature." |

## Government Account Provisioning (`controllers/admin/adminUserController.js`)

Introduced: CP-021 Region Sprint B (2026-05-21)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `PROVISION_FORBIDDEN` | 403 | Caller is a secondary account (cannot provision) or a region-main trying to create a republic-level account. | "You don't have permission to create government accounts." |
| `PROVISION_INVALID_LEVEL_TYPE` | 400 | Missing required fields or invalid govLevel/govType value. | "Please provide all required fields." |
| `PROVISION_REGION_REQUIRED` | 400 | `govRegionId` missing for a region-level account, or `govRegionId` does not match a known region. | "Please specify a valid region." |
| `PROVISION_REGION_OUT_OF_SCOPE` | 403 | Region-main tried to create an account for a different region. | "You can only create accounts in your own region." |
| `PROVISION_GRANTS_REQUIRED` | 400 | Secondary account creation did not include `govAccessGrants`. | "Please specify access grants for this account." |
| `PROVISION_INVALID_GRANTS` | 400 | `govAccessGrants` contains unknown capability keys or non-boolean values. | "One or more grant keys are invalid." |
| `REPUBLIC_MAIN_EXISTS` | 409 | Attempt to create a second republic-main account (single super-admin invariant). | "A super-admin account already exists." |
| `PROVISION_CREDENTIAL_TAKEN` | 409 | The auto-generated email (`name@regioncode`) is already in use. | "This credential is already taken. Choose a different name or contact the super-admin." |
| `DELETE_FORBIDDEN` | 403 | Secondary account tried to delete, or region-main tried to delete an out-of-scope account. | "You don't have permission to delete this account." |
| `DELETE_LAST_REPUBLIC_MAIN` | 403 | Attempt to delete the last republic-main account. | "The super-admin account cannot be deleted." |
| `RESET_FORBIDDEN` | 403 | Secondary account tried to reset a password, or actor tried to reset an out-of-scope or stronger account. | "You don't have permission to reset this password." |
| `RESET_OUT_OF_SCOPE` | 403 | Region-main tried to reset a password for a republic-level or other-region account. | "You can only reset passwords for accounts in your region." |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Account has `mustChangePassword=true`; blocked until password is changed at `PUT /api/user/password`. | "You must change your password before continuing." |

---

## Admin Audit Log (`controllers/admin/adminAuditController.js`)

Introduced: Admin S7 Phase 1 (2026-05-22)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `AUDIT_LOG_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth) | "You do not have permission to view the audit log." |
| `ADMIN_AUDIT_LOG_INVALID_FILTER` | 400 | `action` or `entity` query param is outside the admin audit scope allowlist, or `startDate`/`endDate` is not a valid date | "Invalid filter value." |
| `ADMIN_AUDIT_LOG_FETCH_FAILED` | 500 | Unexpected server error fetching audit entries | "Failed to load audit log." |

---

## Admin School Profile (`controllers/admin/adminSchoolController.js`)

Introduced: Admin S7 Phase 1 (2026-05-22)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `SCHOOL_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth) | "You do not have permission to access school settings." |
| `SCHOOL_FETCH_FAILED` | 500 | Unexpected server error fetching school record | "Failed to load school profile. Please try again." |
| `SCHOOL_UPDATE_FAILED` | 500 | Unexpected server error updating school contact fields | "Failed to update school profile. Please try again." |

---

## Admin Teacher Detail (`controllers/admin/adminTeacherController.js`)

Introduced: Admin S7 Phase 1 (2026-05-22)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `TEACHER_FORBIDDEN` | 403 | Caller role is not `admin` (controller-level defense-in-depth) | "You do not have permission to view teacher details." |
| `TEACHER_NOT_FOUND` | 404 | No teacher with that ID exists in this admin's school scope (via reception chain) | "Teacher not found." |
| `TEACHER_FETCH_FAILED` | 500 | Unexpected server error fetching teacher record | "Failed to load teacher. Please try again." |

---

## Parent Data Export (`controllers/parent/parentDataExportController.js`)

Introduced: Sprint E T2-10 (2026-05-20)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `DATA_EXPORT_FORBIDDEN` | 403 | Caller is not `role=parent` (defense-in-depth controller check) | "You don't have permission to export data." |
| `DATA_EXPORT_RATE_LIMITED` | 429 | Parent has already exported data within the last 24 hours | "You can only export your data once per day. Please try again tomorrow." |
| `LOGIN_RATE_LIMITED` | 429 | Too many failed login attempts for this email within the rate-limit window | "Too many failed login attempts. Please wait a few minutes and try again." |
| `DATA_EXPORT_FAILED` | 500 | Unexpected server error during export assembly | "Failed to generate export. Please try again." |
| `AUDIT_LOG_INVALID_FILTER` | 400 | action or entity query param is outside the government audit scope allowlist | "Invalid filter value." |
| `AUDIT_LOG_FETCH_FAILED` | 500 | Unexpected server error fetching audit entries | "Failed to load audit log." |

---

## Reception Documents / School Info (`controllers/receptionController.js`)

Introduced: Reception S3 U-4 (2026-05-23) · GOV-ACCOUNT-AUDIT-FIX (2026-06-02)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `DOCUMENT_NOT_FOUND` | 404 | No document found with the given `:id` | "Document not found." |
| `DOCUMENT_ACCESS_DENIED` | 403 | Document belongs to a different user — caller is not the owner | "You do not have permission to delete this document." |
| `DOCUMENT_CANNOT_DELETE_NON_PENDING` | 400 | Document status is `approved` or `rejected` — only pending documents may be deleted | "Only pending documents can be deleted." |
| `SCHOOL_NOT_ASSIGNED` | 404 | Reception user has no `schoolId` on their account | "School not assigned to your account." |
| `SCHOOL_NOT_FOUND` | 404 | The school record referenced by `schoolId` no longer exists | "School not found." |

---

## Reception Parent & Teacher Lifecycle (`controllers/receptionParentController.js`, `controllers/receptionTeacherController.js`)

Introduced: Reception S6 (2026-05-24)

Shared codes (already in locale from Admin section): `PARENT_NOT_FOUND`, `PARENT_ALREADY_ACTIVE`, `PARENT_ACTIVATE_FAILED`, `PARENT_ALREADY_SUSPENDED`, `PARENT_SUSPEND_FAILED`, `TEACHER_NOT_FOUND`.

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `RECEPTION_PARENT_ACTIVATE_FORBIDDEN` | 403 | Defense-in-depth: caller role is not `reception` | "You do not have permission to activate parents." |
| `RECEPTION_PARENT_SUSPEND_FORBIDDEN` | 403 | Defense-in-depth: caller role is not `reception` | "You do not have permission to suspend parents." |
| `RECEPTION_CREDENTIAL_RESET_FORBIDDEN` | 403 | Defense-in-depth: caller role is not `reception` (shared by parent and teacher reset endpoints) | "You do not have permission to reset credentials." |
| `PARENT_CREDENTIAL_RESET_FAILED` | 500 | Unexpected server error during parent temp-password generation or save | "Failed to reset credentials. Please try again." |
| `RECEPTION_TEACHER_ACTIVATE_FORBIDDEN` | 403 | Defense-in-depth: caller role is not `reception` | "You do not have permission to activate teachers." |
| `TEACHER_ALREADY_ACTIVE` | 409 | Teacher's `status` is already `active` | "This teacher account is already active." |
| `TEACHER_ACTIVATE_FAILED` | 500 | Unexpected server error during teacher status update | "Failed to activate teacher. Please try again." |
| `RECEPTION_TEACHER_SUSPEND_FORBIDDEN` | 403 | Defense-in-depth: caller role is not `reception` | "You do not have permission to suspend teachers." |
| `TEACHER_ALREADY_SUSPENDED` | 409 | Teacher's `status` is already `suspended` | "This teacher account is already suspended." |
| `TEACHER_SUSPEND_FAILED` | 500 | Unexpected server error during teacher status update | "Failed to suspend teacher. Please try again." |
| `TEACHER_CREDENTIAL_RESET_FAILED` | 500 | Unexpected server error during teacher temp-password generation or save | "Failed to reset credentials. Please try again." |

---

## ИРР — IRR Core (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `IRR_CHILD_NOT_ACCESSIBLE` | 404 | Child does not exist, belongs to a different school, or requesting teacher is not assigned to this child | "This child is not in your group." |
| `IRR_ALREADY_EXISTS` | 409 | An active IRR already exists for this child | "This child already has an active development plan." |
| `IRR_NOT_FOUND` | 404 | No IRR found with the given ID, belongs to a different school, or teacher is not assigned to the child | "Development plan not found." |
| `IRR_HEADER_INCOMPLETE` | 400 | One or more of the 9 mandatory header fields are missing — IRR cannot be activated in draft state | "Please fill in all required fields before activating the plan." |
| `IRR_INVALID_STATUS` | 409 | IRR status transition is not allowed (e.g. archiving an already-archived IRR, or activating a non-draft IRR) | "This operation is not allowed in the current plan status." |
| `IRR_CREATE_FAILED` | 500 | Unexpected server error while creating IRR | "Failed to create development plan. Please try again." |
| `IRR_FETCH_FAILED` | 500 | Unexpected server error while fetching IRR | "Failed to load development plan. Please try again." |
| `IRR_UPDATE_FAILED` | 500 | Unexpected server error while updating or changing IRR status | "Failed to update development plan. Please try again." |

## ИРР — Assessment Sessions (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `ASSESSMENT_INVALID_TYPE` | 400 | `sessionType` is missing or not one of `intake`, `3mo`, `6mo`, `9mo`, `12mo`, `custom` | "Please select a valid assessment type." |
| `ASSESSMENT_SESSION_EXISTS` | 409 | A non-custom session of this type already exists for this IRR | "An assessment of this type already exists for this plan." |
| `ASSESSMENT_INCOMPLETE` | 400 | `scores` array is missing, not an array, or does not contain exactly 17 values | "Please provide scores for all 17 assessment criteria." |
| `ASSESSMENT_INVALID_SCORE` | 400 | One or more scores are not integers in the range 0–4 | "Each criterion score must be a whole number between 0 and 4." |
| `ASSESSMENT_CRITERIA_MISSING` | 500 | Fewer than 17 active assessment criteria found in the database — seeder may not have run | "Assessment criteria are not configured. Contact your administrator." |
| `ASSESSMENT_NOT_FOUND` | 404 | No assessment session found with the given ID in this school | "Assessment session not found." |
| `ASSESSMENT_CREATE_FAILED` | 500 | Unexpected server error while creating assessment session or score rows | "Failed to save assessment. Please try again." |
| `ASSESSMENT_LIST_FAILED` | 500 | Unexpected server error while listing assessment sessions | "Failed to load assessments. Please try again." |
| `ASSESSMENT_FETCH_FAILED` | 500 | Unexpected server error while fetching a single assessment session | "Failed to load assessment. Please try again." |

## ИРР — Long-Term Goals (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `LONG_TERM_GOAL_NOT_FOUND` | 404 | No long-term goal found with the given ID, or teacher is not assigned to this child | "Long-term goal not found." |
| `LONG_TERM_GOAL_TEXT_TOO_SHORT` | 400 | `goalText` is missing or fewer than 5 characters after trimming | "Goal description must be at least 5 characters." |
| `LONG_TERM_GOAL_CREATE_FAILED` | 500 | Unexpected server error while creating long-term goal | "Failed to save goal. Please try again." |
| `LONG_TERM_GOAL_UPDATE_FAILED` | 500 | Unexpected server error while updating long-term goal | "Failed to update goal. Please try again." |
| `LONG_TERM_GOAL_DELETE_FAILED` | 500 | Unexpected server error while deleting long-term goal | "Failed to delete goal. Please try again." |
| `LONG_TERM_GOAL_LIST_FAILED` | 500 | Unexpected server error while listing long-term goals | "Failed to load goals. Please try again." |

## ИРР — Goal Periods (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `GOAL_PERIOD_NOT_FOUND` | 404 | No goal period found with the given ID, or teacher is not assigned to this child | "Goal period not found." |
| `GOAL_PERIOD_DATES_REQUIRED` | 400 | `periodStart` or `periodEnd` is missing | "Please provide both start and end dates for the goal period." |
| `GOAL_PERIOD_CREATE_FAILED` | 500 | Unexpected server error while creating goal period | "Failed to create goal period. Please try again." |
| `GOAL_PERIOD_UPDATE_FAILED` | 500 | Unexpected server error while updating goal period review or signature | "Failed to update goal period. Please try again." |
| `GOAL_PERIOD_LIST_FAILED` | 500 | Unexpected server error while listing goal periods | "Failed to load goal periods. Please try again." |

## ИРР — Short-Term Goals (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `SHORT_TERM_GOAL_NOT_FOUND` | 404 | No short-term goal found with the given ID, or teacher is not assigned to this child | "Short-term goal not found." |
| `SHORT_TERM_GOAL_TEXT_TOO_SHORT` | 400 | `goalText` is missing or fewer than 3 characters after trimming | "Goal description must be at least 3 characters." |
| `SHORT_TERM_GOAL_CREATE_FAILED` | 500 | Unexpected server error while creating short-term goal | "Failed to save goal. Please try again." |
| `SHORT_TERM_GOAL_UPDATE_FAILED` | 500 | Unexpected server error while updating short-term goal | "Failed to update goal. Please try again." |
| `SHORT_TERM_GOAL_DELETE_FAILED` | 500 | Unexpected server error while deleting short-term goal | "Failed to delete goal. Please try again." |
| `SHORT_TERM_GOAL_LIST_FAILED` | 500 | Unexpected server error while listing short-term goals | "Failed to load goals. Please try again." |

## ИРР — Daily Monitoring (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `DAILY_ENTRY_CHILD_NOT_ACCESSIBLE` | 404 | Child does not exist, belongs to a different school, or teacher is not assigned | "This child is not in your group." |
| `DAILY_ENTRY_DATE_REQUIRED` | 400 | `entryDate` is missing | "Please provide the entry date." |
| `DAILY_ENTRY_DUPLICATE` | 409 | A daily monitoring entry already exists for this child on this date | "A daily entry for this date already exists." |
| `DAILY_ENTRY_CREATE_FAILED` | 500 | Unexpected server error while creating daily monitoring entry | "Failed to save daily entry. Please try again." |
| `DAILY_ENTRY_LIST_FAILED` | 500 | Unexpected server error while listing daily monitoring entries | "Failed to load daily entries. Please try again." |

## ИРР — Weekly Monitoring (`controllers/teacher/irrController.js`)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `WEEKLY_ENTRY_CHILD_NOT_ACCESSIBLE` | 404 | Child does not exist, belongs to a different school, or teacher is not assigned | "This child is not in your group." |
| `WEEKLY_ENTRY_DATE_REQUIRED` | 400 | `weekStart` is missing | "Please provide the week start date." |
| `WEEKLY_ENTRY_DUPLICATE` | 409 | A weekly monitoring entry already exists for this child for this week | "A weekly entry for this week already exists." |
| `WEEKLY_ENTRY_CREATE_FAILED` | 500 | Unexpected server error while creating weekly monitoring entry | "Failed to save weekly entry. Please try again." |
| `WEEKLY_ENTRY_LIST_FAILED` | 500 | Unexpected server error while listing weekly monitoring entries | "Failed to load weekly entries. Please try again." |

## ИРР — Quarterly Monitoring (`controllers/teacher/irrController.js`, admin-only)

Introduced: Teacher S5 Phase 2 (2026-05-26)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `QUARTERLY_ACCESS_DENIED` | 403 | Caller role is not `admin` or `reception` (defense-in-depth; route layer uses `requireAdmin`) | "Only managers can create quarterly monitoring reports." |
| `QUARTERLY_ENTRY_DATES_REQUIRED` | 400 | `quarterStart` or `quarterEnd` is missing | "Please provide both start and end dates for the quarter." |
| `QUARTERLY_ENTRY_DUPLICATE` | 409 | A quarterly monitoring entry already exists for this school and quarter | "A quarterly report for this period already exists." |
| `QUARTERLY_ENTRY_CREATE_FAILED` | 500 | Unexpected server error while creating quarterly monitoring entry | "Failed to save quarterly report. Please try again." |
| `QUARTERLY_ENTRY_LIST_FAILED` | 500 | Unexpected server error while listing quarterly monitoring entries | "Failed to load quarterly reports. Please try again." |

---

## School Rating — CP-020 (`controllers/parent/parentSchoolRatingController.js`, `controllers/government/governmentSchoolRatingController.js`)

Introduced: CP-020 Backend (2026-05-27)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `RATING_FORBIDDEN` | 403 | Caller role is not `parent` (defense-in-depth; route middleware is `requireParent`) | "Only parents can submit school ratings." |
| `RATING_COMMENT_REQUIRED` | 400 | `comment` field is missing, null, or whitespace-only | "Please write a comment before submitting." |
| `RATING_SCHOOL_ID_REQUIRED` | 400 | `schoolId` field is missing or null | "Please select a school." |
| `RATING_INDICATORS_REQUIRED` | 400 | `indicators` object is absent or not an object | "Please rate all 5 indicators." |
| `RATING_INDICATOR_INVALID` | 400 | One or more indicator values are missing or outside 1–5 integer range | "Each indicator must be rated 1–5." |
| `RATING_SCHOOL_NOT_FOUND` | 404 | School not found (parent direction: by PK; government direction: by PK + region scope) | "School not found." |
| `RATING_SCHOOL_FORBIDDEN` | 403 | Parent's `schoolId` is null or does not match the rated school (TP-05 deny-on-null) | "You can only rate your own school." |
| `RATING_PERIOD_INVALID` | 400 | `period` is missing or does not match `Q1-YYYY`…`Q4-YYYY` format | "Please select a valid rating period (e.g. Q2-2026)." |
| `RATING_DIRECTION_INVALID` | 400 | `?direction=` query param is not `parent` or `gov` | "Invalid direction parameter." |
| `RATING_CHILD_NOT_FOUND` | 404 | Child not found or does not belong to this parent (getMySchoolRating) | "Child not found." |
| `RATING_CREATE_FAILED` | 500 | Unexpected server error while saving a rating | "Failed to save rating. Please try again." |
| `RATING_FETCH_FAILED` | 500 | Unexpected server error while fetching ratings or schools | "Failed to load ratings. Please try again." |

---

## CP-022 — Parent Message Routing + Escalation

Added 2026-05-27. Introduced by `parentSendMessage` (parent route), `getAllMessages` level filter (gov route), `getOwnerMessages` (admin route).

| Code | HTTP | When triggered | User-facing meaning |
|---|---|---|---|
| `MESSAGE_SEND_FORBIDDEN` | 403 | Non-parent attempted to use parent send endpoint (defense-in-depth role check) | "Only parents can send messages via this channel." |
| `MESSAGE_SUBJECT_REQUIRED` | 400 | `subject` missing or empty | "Please enter a subject." |
| `MESSAGE_BODY_REQUIRED` | 400 | `message` body missing or empty | "Please write your message." |
| `MESSAGE_RECIPIENT_LEVEL_INVALID` | 400 | `recipientLevel` missing or not in `['owner','region','republic']`; also used for invalid `?level=` query param | "Please select a valid recipient level." |
| `MESSAGE_ESCALATE_NOT_FOUND` | 400 | `escalatedFromId` provided but no matching message found | "The original message to escalate was not found." |
| `MESSAGE_ESCALATE_NOT_OWN` | 403 | `escalatedFromId` points to a message sent by a different user | "You can only escalate your own messages." |
| `MESSAGE_NO_SCHOOL` | 400 | Admin or parent has no `schoolId` (edge case — should not occur with correct data) | "Your account is not associated with a school." |
| `MESSAGE_SEND_FAILED` | 500 | Unexpected server error while creating the message | "Failed to send message. Please try again." |
| `MESSAGE_FETCH_FAILED` | 500 | Unexpected server error while fetching owner-level messages | "Failed to load messages. Please try again." |

**Role restriction note:** Admin, teacher, and reception roles retain their own dedicated send routes (`POST /admin/message-to-government`, `/teacher/message-to-government`, `/reception/message-to-government`) using the flat `sendMessage` handler (no routing). CP-022 routing features (`recipientLevel`, `escalatedFromId`) are parent-only by design.

## Media (`controllers/mediaController.js`)

| Code | HTTP | Meaning | Frontend translation guidance |
|---|---|---|---|
| `MEDIA_STORAGE_NOT_CONFIGURED` | 503 | Production upload attempted with no Appwrite and no `LOCAL_STORAGE_FALLBACK=true` | "Media uploads are not available. Contact your administrator." |
| `MEDIA_UPLOAD_STORAGE_FAILED` | 502 | Appwrite SDK threw during file upload (bad credentials, non-existent bucket, network issue) | "File upload failed. Please try again." |

---

## Notes

- **`JOURNAL_CHILD_NOT_ACCESSIBLE` dual HTTP status:** returned as 400 when the `childId` field is structurally invalid (missing or not a UUID), and as 404 when the UUID is valid but the child is inaccessible. Frontend should treat both as "cannot proceed."
- **`detail` field:** All codes above omit the optional `detail` field in normal operation. Unexpected server errors (5xx codes) may include a `detail` string populated from the caught exception message for Sentry context.
- **Older endpoints** (pre-Sprint B) still return `{ error: '<string>' }` under the BACKEND-012 grandfather clause. They will be migrated opportunistically. Do not add those string errors to this catalog — only `{ error: { code } }` shape belongs here.
- **Adding new codes:** Add the row to this table in the same commit that introduces the code. PR review should verify catalog completeness.
