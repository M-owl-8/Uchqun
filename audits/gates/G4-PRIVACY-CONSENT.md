# G4 — Privacy consent UI

**Status:** ✅ CLOSED (engineering); G5 placeholder text drafted in same commit; final sign-off still owed by product/legal.
**Plan ref:** `audits/BETA-LAUNCH-PLAN.md` § The 5 gates.
**Date:** 2026-06-06

## What this gate is

The parent portal must record affirmative consent from every parent before they use the platform. The consent covers two disclosures already on the books but never surfaced in UI:

1. **PL-001 / C-02** — Group-wide media visibility. Parents in the same group can see each other's children's photos and videos. This is intentional design (see `docs/PRIVACY_POSTURE.md`) but until now there has been no in-product notice or affirmative consent.
2. **CP-019 / PL-009** — AI-generated UI translations may contain errors. The platform's UZ/RU strings are currently AI-generated pending native review (PL-009-VERIFY).

The consent is mandatory: a parent cannot interact with the portal until they either accept both items or sign out. Re-consent flows (when the text materially changes) are out of scope for beta.

## What shipped

### Backend

- **Migration `20260606000002-add-privacy-consent-to-users.js`** — adds nullable `privacyConsentedAt` DATETIME column to `users`. NULL = never consented, non-null = recorded at that moment.
- **`models/User.js`** — `privacyConsentedAt` field declared with explanatory comment.
- **`controllers/parent/parentPrivacyConsentController.js`** — two handlers:
  - `getPrivacyConsent` → returns `{ consentedAt, required }`. `required` is `true` iff timestamp is null.
  - `setPrivacyConsent` → idempotently records the consent. Second call returns `{ alreadyConsented: true, consentedAt }` without writing.
- **`routes/parentRoutes.js`** — `GET /parent/privacy-consent` and `POST /parent/privacy-consent` both behind `authenticate + requireParent`. Defense-in-depth role check inside controller (`req.user.role !== 'parent'` → 403).
- **i18n codes** (added to `audits/backend/i18n-error-codes.md` + all 3 lang files):
  - `PRIVACY_CONSENT_PARENT_ONLY` (403)
  - `PRIVACY_CONSENT_USER_NOT_FOUND` (404)
  - `PRIVACY_CONSENT_READ_FAILED` (500)
  - `PRIVACY_CONSENT_WRITE_FAILED` (500)
- **Tests** — `__tests__/controllers/parentPrivacyConsent.test.js`, 10 cases including:
  - happy path GET (required:true / required:false)
  - happy path POST (write + idempotent re-call)
  - **CRITICAL role boundary** — 403 PRIVACY_CONSENT_PARENT_ONLY when caller is admin/teacher; **model must NEVER be queried** for non-parent caller (regression safety net)
  - 404 on missing user row
  - 500 on DB error (both read + write paths)

### Frontend

- **`teacher/src/parent/components/PrivacyConsentModal.jsx`** — undismissible modal. Loads consent state on mount. Renders two sections (media + i18n) with separate acknowledgement checkboxes. Accept button enabled only when both ticked. Decline button calls `logout()`.
- **Layout integration** — `<PrivacyConsentModal />` mounted inside `parent/components/Layout.jsx`. Renders on every parent route, but the modal itself decides whether to show based on the API response.
- **Locale keys** — 12 strings × 3 languages (uz/en/ru):
  - `privacyConsent.title`, `.intro`, `.mediaTitle`, `.mediaBody`, `.mediaAck`, `.i18nTitle`, `.i18nBody`, `.i18nAck`, `.accept`, `.decline`, `.footnote`, `.errorGeneric`

### Modal behavior

- Backdrop click does NOT dismiss. Escape key does NOT dismiss.
- Both checkboxes must be ticked before the accept button enables.
- Accept button shows a spinner during the POST.
- Errors render inline (not as toast) to keep the modal self-contained.
- Decline → `logout()` from `AuthContext`. The redirect chain handles the rest.

## G5 draft (placeholder text — needs partner sign-off)

The consent text below is engineering-drafted and ships with the beta. It is NOT a substitute for product/legal review. Marked PROD-ONLY in `LOOP_PRE_LAUNCH_CHECKLIST.md` for v1 launch — beta acceptable.

**Uzbek (current):**
> Suratlar va videolar guruh bo'yicha ko'rinadi. Tarbiyachi yuklagan suratlar va videolar — bola guruhidagi barcha ota-onalarga ko'rinadi…

**English:**
> Photos and videos are visible group-wide. Photos and videos uploaded by the teacher are visible to all parents whose children are in the same group as yours…

**Russian:**
> Фото и видео видны всей группе. Фотографии и видеозаписи, загруженные воспитателем, видны всем родителям…

Full text in `teacher/src/parent/locales/{uz,en,ru}/common.json` under the `privacyConsent` namespace.

## Verification

- ✅ Backend tests: 10/10 pass (`npm test -- parentPrivacyConsent`)
- ✅ Backend i18n: `verify-i18n.js` green (236 codes × 3 lang files)
- ✅ Frontend locale: `check:locales` green (859 keys × 3 lang files)
- ✅ Frontend build: 1925 modules, 4.36s clean

## Production verification (2026-06-07)

Live API test against `https://uchqun-production-b484.up.railway.app` using `parent4@uchqun.uz` (Test@2026).

**GET before consent:**
```json
{"success":true,"data":{"consentedAt":null,"required":true}}
```

**POST (record consent):**
```json
{"success":true,"data":{"consentedAt":"2026-06-07T04:01:04.863Z","alreadyConsented":false}}
```

**GET after consent:**
```json
{"success":true,"data":{"consentedAt":"2026-06-07T04:01:04.863Z","required":false}}
```

- ✅ `users.privacyConsentedAt` column confirmed present in Railway DB (via postgres-uchqun MCP schema inspection)
- ✅ Full consent cycle verified live: null → timestamp → idempotent read
- ✅ `required` flag flips correctly on second GET

## What's left for the gate to be fully closed

1. **Product + legal sign-off on the consent text (G5).** Engineering placeholder ships with beta; production needs reviewed text.
2. **Manual walk on Railway** after deploy — confirm modal renders on first login, blocks interaction, accepts both checkboxes, POSTs consent, doesn't re-render on next page load. Part of G3.
3. **Re-consent migration plan** (post-beta) — when the text materially changes, decide whether to bump a server-side version and force re-prompt. Out of scope for beta.

## Files changed (8 + 3 locale files = 11)

```
A  audits/gates/G4-PRIVACY-CONSENT.md
A  backend/migrations/20260606000002-add-privacy-consent-to-users.js
A  backend/controllers/parent/parentPrivacyConsentController.js
A  backend/__tests__/controllers/parentPrivacyConsent.test.js
A  teacher/src/parent/components/PrivacyConsentModal.jsx
M  backend/models/User.js                  (+9 lines)
M  backend/routes/parentRoutes.js          (+5 lines)
M  backend/i18n/ru.json                    (+6 codes)
M  backend/i18n/uz-latn.json               (+6 codes)
M  backend/i18n/uz-cyrl.json               (+6 codes)
M  audits/backend/i18n-error-codes.md      (+14 lines, +1 section)
M  teacher/src/parent/components/Layout.jsx (+2 lines)
M  teacher/src/parent/locales/uz/common.json (+12 keys)
M  teacher/src/parent/locales/en/common.json (+12 keys)
M  teacher/src/parent/locales/ru/common.json (+12 keys)
```
