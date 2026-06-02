# GOV-ACCOUNT-FORM-AUDIT-2 — Government Account Creation Form Audit + canRateSchools i18n

**Date:** 2026-06-02  
**Status:** ✅ CLOSED (pending user Railway verification gate — STEP 6)  
**Commit:** (see close-out)

---

## Pre-flight — Prior session claims

| Session | Claimed | Actual |
|---|---|---|
| GOV-ACCOUNT-DOMAINS | GovernmentTab.jsx uses credential preview (firstName-derived slug) | ✅ Confirmed — no email field |
| GOV-ACCOUNT-AUDIT-FIX | All 5 update endpoints block email mutation | ✅ Confirmed |
| GOV-PROD-VERIFY | No additional form drift detected | ⚠️ canRateSchools i18n leak present but not caught |

---

## STEP 1 — Form Enumeration

**Search coverage:**
- `grep "Davlat Hisobi Yaratish|Hisob Darajasi"` → hit: `uz/common.json:406` (locale string) + `GovernmentTab.jsx` (component that renders it)
- `grep "GovernmentForm|GovernmentCreate|CreateGovernment"` → 0 matches
- `grep "onCreateGovernment"` → 2 matches: `Platform.jsx:168` (handler) + `GovernmentTab.jsx:19` (prop)
- `grep "canRateSchools"` → `govCapabilities.js:5` + `SchoolDetail.jsx:694`

**Forms found: 1 (one)**

| Form | File | Renders in | Email handling | Status |
|---|---|---|---|---|
| "Davlat Hisobi Yaratish" | `government/src/components/tabs/GovernmentTab.jsx` | Platform.jsx → Government tab | Auto-derived from firstName (no email field) | ✅ Clean |

**There is no second form.** The screenshots showing "Davlat Hisobi Yaratish" with "Hisob Darajasi / Hisob Turi / Viloyat" fields ARE GovernmentTab.jsx. The prior audit correctly covered this form.

---

## STEP 2 — Per-form Verification

### GovernmentTab.jsx

| Check | Status | Evidence |
|---|---|---|
| Email field — split input | N/A — no email field by design | Gov credential auto-derived from `firstName.slug@domain` |
| Credential preview shown | ✅ | `credentialPreview` useMemo (lines 46-52): `${slug}@davlat.uz` or `${slug}@${region.slug}.uz` |
| Domain locked (not editable) | ✅ | Domain derived from `level` + `regionId`, not user input |
| Submit body shape | ✅ | Sends `{firstName, lastName, password, govLevel, govType, govRegionId?, govAccessGrants?}` — no raw email |
| Backend error display | ✅ | `setCreateError` shown with `AlertCircle` banner in form (line 448-453) |
| Permission labels use `t()` | ✅ | Line 439: `t(\`provision.grants.${key}\`, { defaultValue: key })` |
| `canRateSchools` translated | ❌ → ✅ FIXED | Missing from all 3 locale files → added this session |

**Account list view:** Also uses `t('provision.grants.${k}', { defaultValue: k })` at line 240 for active grants display — same missing key would show as raw `canRateSchools` on any secondary account with that grant. Fixed by the same locale additions.

---

## STEP 3 — canRateSchools i18n Fix

**Root cause:** `govCapabilities.js` defines 12 CAPABILITY_KEYS. The `provision.grants` section in all 3 locale files had 11 entries — `canRateSchools` (position 4 in the array) was never added.

**Why it leaked:** The `t()` call uses `{ defaultValue: key }`, so when the translation is missing, the raw camelCase identifier displays. This is visible:
1. In the create form's permission checkboxes (when type=secondary)
2. In the account list's grant badges for secondary accounts that have `canRateSchools: true`

**Fix applied — 3 locale files:**

| Locale | Key added | Translation |
|---|---|---|
| `en/common.json` | `provision.grants.canRateSchools` | "Rate Schools" |
| `uz/common.json` | `provision.grants.canRateSchools` | "Maktablarni Baholash" |
| `ru/common.json` | `provision.grants.canRateSchools` | "Оценивать Школы" |

Inserted after `canViewRatings` to match `CAPABILITY_KEYS` array order.

---

## STEP 4 — Additional Forms

None found. The enumeration is exhaustive: only `GovernmentTab.jsx` handles government account creation.

---

## STEP 5 — Permissions Namespace Completeness

**Full audit: CAPABILITY_KEYS (12 total) vs. locale coverage:**

| Key | EN | UZ | RU |
|---|---|---|---|
| `canViewSchools` | ✅ | ✅ | ✅ |
| `canArchiveSchools` | ✅ | ✅ | ✅ |
| `canViewRatings` | ✅ | ✅ | ✅ |
| `canRateSchools` | ✅ ADDED | ✅ ADDED | ✅ ADDED |
| `canViewAuditLog` | ✅ | ✅ | ✅ |
| `canViewStudents` | ✅ | ✅ | ✅ |
| `canViewTeachers` | ✅ | ✅ | ✅ |
| `canViewParents` | ✅ | ✅ | ✅ |
| `canManageAdmins` | ✅ | ✅ | ✅ |
| `canManageGovernmentUsers` | ✅ | ✅ | ✅ |
| `canViewMessages` | ✅ | ✅ | ✅ |
| `canManageRegistrations` | ✅ | ✅ | ✅ |

**Result: 12/12 keys covered in all 3 locales. Namespace is complete.**

No other raw-key leaks found in GovernmentTab.jsx. All other `t()` calls in the form have catalog entries.

---

## STEP 6 — User Railway Verification Gate

**Required before full ✅:**

Max must verify on Railway production:

1. Open Platform → Government Users tab (logged in as republic-main)
2. Set Account Type = "Secondary" — permission checkboxes appear
3. Confirm NO raw camelCase keys visible (all 12 labels should be in UZ/RU/EN)
4. Specifically confirm "Maktablarni Baholash" / "Rate Schools" / "Оценивать Школы" appears for the rate-schools capability (4th checkbox in the list)
5. Try creating a secondary account with `canRateSchools` checked — confirm the created account's grant badge shows the translated label, not raw key
6. Switch language to RU — confirm Russian translations
7. Switch to UZ — confirm Uzbek translations

Screenshot each step. Reply "verified" with screenshots to close this gate.

---

## STEP 7 — Honest Count

| Finding | Status | Fix |
|---|---|---|
| "Davlat Hisobi Yaratish" drift (email field) | ✅ Non-issue — no email field by design | No fix needed |
| `canRateSchools` raw key displayed in form | ✅ Fixed — added to all 3 locales | locale files |
| `canRateSchools` raw key in account list badges | ✅ Fixed — same locale additions cover this | locale files |
| Additional hidden government creation forms | ✅ None found — thorough grep confirmed | N/A |
| Other permission key gaps | ✅ None — 12/12 now covered | N/A |

**Latent items (not in scope):**
- Admin and Reception portals may have similar grant-display patterns if they ever render government-level grants. Unlikely but flag for LOCALE-HYGIENE pass.
- UZ translations are AI-generated and unverified (existing PL-009-VERIFY). "Maktablarni Baholash" is reasonable but should be reviewed by a native speaker.

---

## STEP 8 — Discipline Observations

**Pattern confirmed (third instance):**
1. GOV-ACCOUNT-DOMAINS — missed AdminsTab.jsx (different component, same page)
2. GOV-PROD-VERIFY — caught AdminsTab.jsx, missed canRateSchools i18n
3. This session — caught canRateSchools, found no additional form drift

**The drift trail:** `canRateSchools` was added to `govCapabilities.js` (backend capability added in Region Sprint C or similar), but the locale file entry was never created alongside it. The frontend used `{ defaultValue: key }` which silently degraded to raw key display — no runtime error, no test failure, only visible to a human looking at the UI.

**Process fix:** When `CAPABILITY_KEYS` or any similar capability array is modified, a checklist item must be triggered: "Add translations for new key to all locale files." This is mechanical work that should be automated — a script can diff `CAPABILITY_KEYS` against `provision.grants` keys in each locale and fail if they diverge.

**Recommendation for future:**
```bash
# Run this after any change to govCapabilities.js
node -e "
  const caps = require('./government/src/config/govCapabilities.js').CAPABILITY_KEYS;
  const en = require('./government/src/locales/en/common.json').provision.grants;
  const missing = caps.filter(k => !en[k]);
  if (missing.length) { console.error('Missing EN grants:', missing); process.exit(1); }
"
```
Add to `lint-staged` or CI.

---

## Files Changed

- `government/src/locales/en/common.json` — `provision.grants.canRateSchools`: "Rate Schools"
- `government/src/locales/uz/common.json` — `provision.grants.canRateSchools`: "Maktablarni Baholash"
- `government/src/locales/ru/common.json` — `provision.grants.canRateSchools`: "Оценивать Школы"

**Test result:** 120/120 government tests green.
