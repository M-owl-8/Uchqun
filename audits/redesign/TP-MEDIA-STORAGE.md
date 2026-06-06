# TP-MEDIA-STORAGE: Media pipeline broken end-to-end

**Status:** 🟡 In progress (pending Railway env + volume setup)  
**Commits:** pending  
**Evidence:** Upload → 502 "Storage upload failed"; gallery 2/4 empty cards

---

## STEP 1 — Diagnosis

### Storage adapter (production)

`appwriteConfigured = Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY && APPWRITE_BUCKET_ID)`

`fallbackEnabled = process.env.LOCAL_STORAGE_FALLBACK === 'true'` (was `&& NODE_ENV !== 'production'` — removed)

### Failure classification: (a) Appwrite configured but credentials/bucket invalid

Evidence:
- Upload returns **502** "Storage upload failed" (not **503** "Storage not configured")
- 503 fires when `!appwriteConfigured && !fallbackEnabled` — the 502 path means Appwrite IS configured (all 4 vars set) but `appwriteStorage.createFile()` threw
- **DB query:** 4 media records, all seed data (Google Storage + Pexels public URLs). Zero Appwrite URLs. Zero local-disk paths. Every upload has failed before `Media.create()` is reached — no orphaned DB records.

### Empty gallery cards: Pexels hotlink protection

2 photo seed records use `pexels.com` URLs. Pexels blocks hotlinking → `img onError` fires → `e.target.style.display = 'none'` → card renders blank. Not a storage failure.

2 video seed records use `commondatastorage.googleapis.com` (Google Storage sample) — load fine.

### Proxy "502" on read

`proxyMediaFile` never returns 502 from application code — all error paths return a transparent 1×1 PNG. The 502 symptom on read is a Railway-level timeout if the Appwrite SDK hangs (30s `axios` timeout), or was observed after a failed upload attempt. Since no real Appwrite records exist in DB, the proxy never runs a meaningful Appwrite fetch.

---

## STEP 2 — Fix

### Code changes (this PR)

| File | Change |
|---|---|
| `backend/config/storage.js:13` | Removed `&& NODE_ENV !== 'production'` from `fallbackEnabled` — when `LOCAL_STORAGE_FALLBACK=true` is set, trust the operator has a persistent volume |
| `backend/controllers/mediaController.js` | Updated production gate to `!appwriteConfigured && !fallbackEnabled`; migrated 503 + 502 error responses to new `{ success, error: { code } }` shape |
| `backend/config/storage.js` (comment) | Updated stale comment about ephemeral local disk to document volume requirement |

### Railway operator actions required (NOT automated)

1. **Attach a Railway persistent volume** to the backend service at `/app/uploads`. Files written by the local-disk fallback survive container restarts only with this volume.

2. **Set env var:** `LOCAL_STORAGE_FALLBACK=true`

3. **Recommended:** Clear broken Appwrite env vars (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_BUCKET_ID`) OR leave them set. If left set, every upload will try Appwrite first (fail quickly with 401/404), then fall through to local disk. Performance is better without them while Appwrite is broken.

4. **Set `PUBLIC_API_URL`** to the Railway backend URL (e.g. `https://uchqun-backend.up.railway.app`) if not already set. This prefixes local-disk URLs so `express.static('/uploads')` serves them correctly.

### How local-disk URLs are served

`server.js:150`: `app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))` is already in place. No new static-serving code needed.

`getProxyUrl()` in `teacher/src/pages/media/mediaUtils.js` only proxies Appwrite URLs (checks for `appwrite.io`). Local disk URLs pass through unchanged — the browser fetches them directly from the backend static route.

---

## STEP 3 — UX Hardening

| File | Change |
|---|---|
| `teacher/src/pages/Media.jsx` | Upload catch: removed raw backend English string; now shows `t('mediaPage.toastUploadFailed')` |
| `teacher/src/pages/Media.jsx` | Added client-side 50 MB file size guard before POST (mirrors backend Multer limit) |
| `teacher/src/pages/media/MediaCard.jsx` | `img onError`: replaced `style.display = 'none'` with gray SVG placeholder — card stays visible instead of going blank |
| `teacher/src/locales/uz/common.json` | Added `mediaPage.toastUploadFailed`, `mediaPage.modal.fileTooLarge`; updated `fileHelp` with "(max 50 MB)" |
| `teacher/src/locales/en/common.json` | Same |
| `teacher/src/locales/ru/common.json` | Same |
| `audits/backend/i18n-error-codes.md` | Added `MEDIA_STORAGE_NOT_CONFIGURED` + `MEDIA_UPLOAD_STORAGE_FAILED` rows |

---

## Verification checklist

- `node backend/scripts/verify-i18n.js`: 226/226 ✅
- `teacher` lint: 0 errors, 0 warnings ✅
- `backend` lint: 0 errors (2 pre-existing warnings, unrelated) ✅

## User Railway verification steps

1. Attach persistent volume at `/app/uploads` in Railway dashboard
2. Set `LOCAL_STORAGE_FALLBACK=true` in Railway env
3. Redeploy backend
4. Upload a photo from the Teacher portal → toast shows success → photo appears in gallery ✓
5. Hard refresh gallery → photo still present (not lost after redeploy) ✓
6. Upload a 60 MB file → client-side toast fires immediately without hitting backend ✓
