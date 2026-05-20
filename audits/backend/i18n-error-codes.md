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

## Notes

- **`JOURNAL_CHILD_NOT_ACCESSIBLE` dual HTTP status:** returned as 400 when the `childId` field is structurally invalid (missing or not a UUID), and as 404 when the UUID is valid but the child is inaccessible. Frontend should treat both as "cannot proceed."
- **`detail` field:** All codes above omit the optional `detail` field in normal operation. Unexpected server errors (5xx codes) may include a `detail` string populated from the caught exception message for Sentry context.
- **Older endpoints** (pre-Sprint B) still return `{ error: '<string>' }` under the BACKEND-012 grandfather clause. They will be migrated opportunistically. Do not add those string errors to this catalog — only `{ error: { code } }` shape belongs here.
- **Adding new codes:** Add the row to this table in the same commit that introduces the code. PR review should verify catalog completeness.
