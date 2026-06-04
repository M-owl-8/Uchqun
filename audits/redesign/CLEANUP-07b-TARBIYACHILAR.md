# CLEANUP-07b-TARBIYACHILAR

**Status:** 🟡 Code complete — awaiting user Railway verification  
**Scope:** Admin Tarbiyachilar (TeacherManagement) page — card cleanup, terminology, list convention  
**Commit:** `fe2ef2c`

---

## STEP 1 — Current state (pre-change)

`admin/src/pages/TeacherManagement.jsx` — 154 lines, **read-only** admin view.

Business constraint (source comment): "Admin can only VIEW teachers (read-only). Admin cannot create, edit, or delete teachers." Confirmed in backend `adminTeacherController.js` — no POST/PUT/DELETE handlers exist. Teachers are created by reception staff.

Layout: 3-column card grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), search, SkeletonList loading state, single empty state message.

TeacherCard had:
- Avatar: `bg-brand-100 text-brand-700` (accent color on non-functional element)
- Name + email in top div
- Email AGAIN as icon row → **duplicate** 
- Phone row (optional)
- "Tarbiyachi akkaunti" badge at bottom → **redundant** on a teacher list page
- `hover:shadow-lg transition-shadow` → decorative shadow jump on hover

---

## STEP 2 — Terminology audit

| Location | Was | Correct | Action |
|---|---|---|---|
| `uz/common.json` teachersPage.* | Already "Tarbiyachi*" | ✅ | None |
| `ru/common.json` teachersPage.* | Already "Воспитатель*" | ✅ | None |
| `en/common.json` teachersPage.title | "Teacher Management" | "Teachers" (shorter, list convention) | Updated |
| `utils.test.js:30` | `teacher: "O'qituvchi"` | `"Tarbiyachi"` | **Fixed** |
| `utils.test.js:110` | `.toBe("O'qituvchi")` | `.toBe("Tarbiyachi")` | **Fixed** |

No O'qituvchi in production source code — only in the test file's local `getRoleLabel` mock.

---

## STEP 3 — User decisions

- **A1**: Card grid (keep), cleaned styling — no layout switch
- **B1**: `Tarbiyachilar (N)` parenthetical count in header — list-page convention going forward
- **Status dot**: `teacher.isActive` confirmed in API response (`/admin/teachers` uses `User.findAll` with `attributes: { exclude: ['password'] }` — `isActive` included). Green dot for active, grey for inactive.
- **Business logic empty state**: "Tarbiyachilar qabulxona xodimlari tomonidan qo'shiladi" 
- **Whole card as click target**: `<button>` wrapper

Note: verification Step 9 in the session doc referenced "+ Yangi Tarbiyachi" button — confirmed inapplicable. Admin is read-only for teachers by business design. No create button added.

---

## STEP 4 — Implementation

### Changes applied

**`admin/src/pages/TeacherManagement.jsx`:**

| Element | Before | After |
|---|---|---|
| Import | `Mail, UserCheck, Search, Phone, ChevronRight` | `UserCheck, Search, Phone, ChevronRight` (Mail removed) |
| Page wrapper | `max-w-7xl space-y-8 animate-in fade-in duration-700` | `max-w-7xl space-y-6` |
| Header h1 | `text-4xl font-black` + just title key | `text-3xl font-semibold tracking-tight` + title + `(${filteredTeachers.length})` |
| Search input | `pl-12 py-3 rounded-xl` (large) | `pl-10 py-2.5 rounded-lg text-sm` (compact, matches dashboard) |
| Grid | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| Empty state | Single `Card p-12` regardless of cause | Two distinct states: search-empty + no-data-empty |
| Click target | `<div className="cursor-pointer" onClick={...}>` | `<button type="button" onClick={...} className="w-full text-left">` |
| Card hover | `hover:shadow-lg transition-shadow` | `hover:border-warm-300 transition-colors` |
| Avatar | `w-12 h-12 bg-brand-100 text-brand-700 font-bold` | `w-10 h-10 bg-warm-100 text-warm-700 font-semibold` |
| Email row | Shown in header + as `<Mail> icon row` (duplicate) | Header only (icon row removed) |
| Badge | `<UserCheck> Tarbiyachi akkaunti` | **Removed** |
| Status indicator | None | `w-2 h-2 rounded-full` dot: `bg-success-500` (isActive) / `bg-warm-300` (inactive) + `title` attribute |
| Phone row | `p-4 border-t` after the duplicate-email row | `mt-2.5 pt-2.5 border-t border-warm-100` only when phone present |

**New card shape:**
```
┌──────────────────────────────────────────────────────┐
│  [AV]  Ali Valiyev                           ● ›     │
│        ali@school.uz                                 │
│  ─────────────────────────────────────────────────   │  ← shown only if phone exists
│  📞 +998 90 123 45 67                                │
└──────────────────────────────────────────────────────┘
```
● = green (Faol) or grey (Nofaol), shown only if isActive in data.

**Empty state — no data:**
```
     [UserCheck icon, warm-200]
     Hozircha tarbiyachilar yo'q
     Tarbiyachilar qabulxona xodimlari tomonidan qo'shiladi
```

**Empty state — search:**
```
     [UserCheck icon, warm-200]
     Tarbiyachilar topilmadi
     «{searchQuery}»
```

### Token discipline

| Element | Token | Acceptable? |
|---|---|---|
| Avatar bg | `bg-warm-100 text-warm-700` | ✅ Neutral |
| Status dot active | `bg-success-500` | ✅ Functional (status indicator) |
| Status dot inactive | `bg-warm-300` | ✅ Neutral |
| Card hover border | `hover:border-warm-300` | ✅ Subtle, no accent |
| Chevron | `text-warm-300` | ✅ Neutral |
| Phone icon | `text-warm-400` | ✅ Neutral |

No `bg-brand-*` on non-functional elements. CLEANUP-02 compliance maintained.

---

## STEP 5 — Terminology fixes

| File | Change |
|---|---|
| `utils.test.js:30` | `"O'qituvchi"` → `"Tarbiyachi"` |
| `utils.test.js:110` | `.toBe("O'qituvchi")` → `.toBe("Tarbiyachi")` |
| `uz/common.json` teachersPage.title | `"Tarbiyachilar boshqaruvi"` → `"Tarbiyachilar"` |
| `ru/common.json` teachersPage.title | `"Управление воспитателями"` → `"Воспитатели"` |
| `en/common.json` teachersPage.title | `"Teacher Management"` → `"Teachers"` |
| All 3 locales | Added: `emptyBusiness`, `statusActive`, `statusInactive` |

---

## STEP 6 — Responsive behavior

| Viewport | Layout |
|---|---|
| `< sm` (mobile, <640px) | Single column |
| `sm–lg` (640–1023px) | 2 columns (`sm:grid-cols-2`) |
| `≥ lg` (≥1024px) | 3 columns (`lg:grid-cols-3`) |

Previously: 2 columns started at `md` (768px). Now: 2 columns start at `sm` (640px) — more usable on 640-767px range.

---

## STEP 7 — Test + build

| Check | Result |
|---|---|
| Tests | ✅ 30/30 · 162/162 |
| Build | ✅ built in 8.12s |

`utils.test.js` — `getRoleLabel('teacher')` now asserts "Tarbiyachi" ✅.  
`showToast.test.jsx` — still passes (only checks that error toast fires on fetch fail, unaffected by card changes) ✅.

---

## STEP 8 — Commit

Commit: `fe2ef2c`  
Message: `feat(admin): Tarbiyachilar page restructure + complete terminology rename from O'qituvchi`  
Pushed to `origin/main`. Railway auto-deploy triggered.

---

## STEP 9 — User Railway verification (REQUIRED before close)

1. Login as a director → sidebar → Tarbiyachilar
2. **Page header**: "Tarbiyachilar (N)" where N = count — not "Tarbiyachilar boshqaruvi"
3. **Card grid**: 3 columns on desktop, 2 on tablet, 1 on mobile
4. **Each card**: avatar (warm/grey tones, not green/terracotta), name, email once, optional phone. Status dot visible at top-right (green = active, grey = inactive). Chevron at right edge.
5. **No badge at bottom** — "Tarbiyachi akkaunti" text is gone
6. **Whole card clickable** — clicking anywhere on card navigates to teacher detail
7. **Search**: filter updates count in header. If search with no results: shows "Tarbiyachilar topilmadi + «{query}»"
8. **Language switching** (UZ → RU → EN):
   - UZ: "Tarbiyachilar", "Faol" tooltip on dot, "Tarbiyachilar qabulxona xodimlari tomonidan qo'shiladi" (if empty)
   - RU: "Воспитатели", "Активен", "Воспитатели добавляются сотрудниками приёмной"
   - EN: "Teachers", "Active", "Teachers are added by reception staff"
9. ~~+ Yangi Tarbiyachi button~~ — NOT applicable; admin is read-only for teachers by design

Screenshots: desktop UZ view + tablet/mobile view.

Reply "verified" before this is marked ✅.

---

## STEP 10 — Honest count

| Item | Status |
|---|---|
| Current state documented | ✅ READ-ONLY confirmed, 154-line audit |
| Terminology audit complete | ✅ Only O'qituvchi was in utils.test.js |
| User decisions captured | ✅ A1 + B1 + status dot + business empty state + whole-card click |
| Card cleanup: duplicate email removed | ✅ |
| Badge removed | ✅ |
| Status dot added | ✅ isActive confirmed in API response |
| Avatar neutral tokens | ✅ bg-warm-100 text-warm-700 |
| Card hover: no shadow jump | ✅ hover:border-warm-300 |
| Whole card = keyboard-accessible button | ✅ |
| Header count format: Tarbiyachilar (N) | ✅ Convention established |
| Empty state — search | ✅ shows search term |
| Empty state — no data | ✅ business logic explanation |
| Responsive: sm:grid-cols-2 (earlier than md) | ✅ |
| utils.test.js O'qituvchi → Tarbiyachi | ✅ both locations |
| Locale title shortened (UZ/RU/EN) | ✅ |
| New locale keys (emptyBusiness, statusActive, statusInactive) | ✅ × 3 langs |
| Tests passing | ✅ 30/30 · 162/162 |
| Build clean | ✅ |
| User Railway verification | ⏳ pending |

---

## Incidental observations

1. **`TeacherDetail.jsx` still uses `bg-brand-100 text-brand-700`** on its avatar (line 93). Same issue — out of scope for this session but should be caught in a future pass.

2. **`teachersPage.badge` locale key still exists** — the key was removed from the JSX but the locale entry remains (harmless — unused keys don't cause errors). Will be cleaned up if/when locale hygiene pass runs.

3. **List-page count convention established:** `Tarbiyachilar (N)` format. Apply same pattern to Ota-onalar (CLEANUP-07c) and all other admin list pages.

4. **`UserCheck` icon still used** in empty states — its previous use in the badge (`text-brand-600`) is now gone. Empty state uses `text-warm-200` (very muted, appropriate for empty state imagery).
