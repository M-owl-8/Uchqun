# Children Import CSV Template

Use `children-import-template.csv` as a starting point. Remove the three example rows and replace with real data.

## Required columns

| Column | Type | Example | Notes |
|---|---|---|---|
| `firstName` | text | Алишер | Child's given name. Supports Cyrillic, Latin, and Uzbek alphabet. |
| `lastName` | text | Мусаев | Child's family name. |
| `dateOfBirth` | date | 2018-03-15 | ISO 8601 (YYYY-MM-DD). Must not be in the future. |
| `gender` | enum | Male | Exactly one of: `Male`, `Female`, `Other`. Case-sensitive. |
| `disabilityType` | text | Аутизм спектри | Primary disability classification. Free text, max 500 chars. |
| `class` | text | 2А | Class or grade identifier. |
| `teacher` | text | Нодира Камалова | Teacher's full name (stored as text, not a portal link). |
| `parentEmail` | email | parent@example.com | Must match an existing parent account. Create the parent portal account first. |

## Optional columns

| Column | Type | Example | Notes |
|---|---|---|---|
| `specialNeeds` | text | Нутқий терапия | Additional support requirements. |
| `medicalDiagnosis` | text | F84.0 | ICD-10 code or free-text diagnosis. Max 500 chars. |
| `institutionStartDate` | date | 2023-09-01 | YYYY-MM-DD. Date the child enrolled. |
| `fatherFullName` | text | Мусаев Темур Акбарович | Father's full name. |
| `motherFullName` | text | Мусаева Зулайхо | Mother's full name. |
| `address` | text | Тошкент ш. Юнусобод | Home address. |
| `contactPhone` | text | +998901234567 | Contact phone number. |

Leave optional cells blank (empty between commas) — do not omit the commas.

## Common mistakes

**Excel auto-formats dates:** Excel may save dates as `15/03/2018` instead of `2018-03-15`. Format the column as Text before entering dates, or use a plain-text editor.

**UTF-8 BOM:** Save as UTF-8 (not "UTF-8 BOM"). A leading byte-order mark corrupts the first column header. In Excel: File → Save As → CSV UTF-8 (without BOM). In LibreOffice: uncheck "BOM" in export options.

**parentEmail must exist first:** Create the parent portal account before uploading the CSV. The validate step looks up each email; rows with unrecognised emails are marked invalid and will not be imported.

**Duplicates:** Two rows with the same `firstName` + `lastName` + `dateOfBirth` (case-insensitive) will both be flagged. Review and remove duplicates before running the import.

**File size:** Maximum 5 MB. For very large imports (>5,000 rows) split the file into batches.
