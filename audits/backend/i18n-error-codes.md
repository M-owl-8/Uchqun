# Backend i18n Error Code Catalog

**Canonical reference** for all `{ success: false, error: { code: '...' } }` codes emitted by the backend.

**Rule:** Any PR that introduces a new error code MUST add a row to this file in the same commit. See `CLAUDE.md` Response Shape Standard (BACKEND-012) for the full error shape spec.

**Introduced:** Sprint B (2026-05-20)  
**Last updated:** Sprint B (2026-05-20)

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

## Notes

- **`JOURNAL_CHILD_NOT_ACCESSIBLE` dual HTTP status:** returned as 400 when the `childId` field is structurally invalid (missing or not a UUID), and as 404 when the UUID is valid but the child is inaccessible. Frontend should treat both as "cannot proceed."
- **`detail` field:** All codes above omit the optional `detail` field in normal operation. Unexpected server errors (5xx codes) may include a `detail` string populated from the caught exception message for Sentry context.
- **Older endpoints** (pre-Sprint B) still return `{ error: '<string>' }` under the BACKEND-012 grandfather clause. They will be migrated opportunistically. Do not add those string errors to this catalog — only `{ error: { code } }` shape belongs here.
- **Adding new codes:** Add the row to this table in the same commit that introduces the code. PR review should verify catalog completeness.
