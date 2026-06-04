# CLEANUP-07i-SUBPAGES — IRR + Guruhlar + Audit jurnali (full audit pass)

**Status:** ✅ CLOSED (pending user Railway verification)
**Commit:** 3abffb0
**Tests:** 30/30 · 165/165
**Build:** clean
**check:locales:** 560 keys · 0 missing

---

## Pages covered

| Page | Route | Access path |
|---|---|---|
| ManagerIRR | `/admin/irr` | Dashboard Hisobotlar → "IRR →" + Settings Quick Links |
| GroupManagement | `/admin/groups` | Dashboard Hisobotlar → "Guruhlar →" + Settings Quick Links |
| ActivityFeed | `/admin/activity` | Dashboard → "Audit jurnali →" |

---

## STEP 1 — Audit findings (all three pages)

### ActivityFeed (`/admin/activity`)

| Element | State | Action |
|---|---|---|
| Header | ✅ Letterhead + eyebrow "Hisobotlar" | Prior session — holds |
| Actor display | ✅ `firstName + lastName`, not UUIDs | Prior session — holds |
| Action labels | ✅ `t(activityActions.${action}_${entity})` | Prior session — holds |
| Date format | ✅ `DATE_LOCALE[i18n?.language]` — locale-aware | Prior session — holds |
| Filters | ✅ Functional (action select + date range) — not stubs | Verified |
| Pagination | ✅ Translated prev/next/pageOf | Prior session — holds |
| Focus rings | ✅ `ring-brand-600/30` | Prior session — holds |
| **Empty state** | ❌ Single empty state for both no-data and filter-empty | **Fixed this pass** |
| **Entity column** | ❌ Raw strings ("documents", "receptions", "users") | **Fixed this pass** |

### GroupManagement (`/admin/groups`)

| Element | State |
|---|---|
| Header | ✅ Letterhead + eyebrow + `(N)` count |
| Avatar | ✅ `bg-warm-100 text-warm-600` |
| Search input | ✅ `rounded-md h-10 ring-brand-600/30` |
| Read-only | ✅ No create/edit/delete buttons |
| Empty states | ✅ `emptySearch` vs `empty` — distinguished; `emptyReason` explains business logic |
| Tokens | ✅ All warm palette |
| Locale | ✅ Full eyebrow/emptyReason coverage |

### ManagerIRR (`/admin/irr`)

| Element | State |
|---|---|
| Header | ✅ Letterhead + eyebrow "Hisobotlar" |
| SECTION_MAP labels | ✅ `t(labelKey)` — 5 sections × 3 langs |
| Focus rings | ✅ `ring-brand-600/30` on all inputs |
| Toasts | ✅ showError/showSuccess on all mutations (sign, quarterly submit) |
| Empty states | ✅ No-children, no-IRR, no-periods all handled |
| Locale section | ✅ 40 keys × 3 langs (added in ADMIN-LOCALE-FINAL) |
| Tabs | ✅ "Maqsadli davrlar" / "Chorakli monitoring" in locale |

---

## STEP 2 — Decisions

None needed. All findings map to established conventions.

---

## STEP 3 — Implementation (this pass)

### ActivityFeed filter-empty state

```jsx
const hasFilters = !!(filterAction || startDate || endDate);
```

Empty state now branches:
- `!hasFilters` → "No activity yet" + sub-message (no-data state)
- `hasFilters` → "No results for selected filter" + "Clear filter" inline button (filter-empty state)

The "Clear filter" button resets `filterAction`, `startDate`, `endDate`, and `page` in one click.

### ActivityFeed entity column translation

Added `getEntityLabel(entity, t)`:
```js
const getEntityLabel = (entity, t) =>
  t(`activityEntities.${entity}`, { defaultValue: entity });
```

Entity column now renders translated names:
- `documents` → Hujjatlar / Documents / Документы
- `receptions` → Qabulxona / Reception / Регистратура
- `users` → Foydalanuvchilar / Users / Пользователи
- `children` → Bolalar / Children / Дети
- `schools` → Muassasa / School / Учреждение

### Locale additions (× 3 langs)

| Key | UZ | EN | RU |
|---|---|---|---|
| `activityFeed.filterEmpty` | Tanlangan filtr uchun natija topilmadi | No results for selected filter | По выбранному фильтру ничего не найдено |
| `activityFeed.clearFilter` | Filterni tozalash | Clear filter | Сбросить фильтр |
| `activityEntities.documents` | Hujjatlar | Documents | Документы |
| `activityEntities.receptions` | Qabulxona | Reception | Регистратура |
| `activityEntities.users` | Foydalanuvchilar | Users | Пользователи |
| `activityEntities.children` | Bolalar | Children | Дети |
| `activityEntities.schools` | Muassasa | School | Учреждение |

---

## STEP 5 — Gate results

```
check:locales: 560 keys · 0 missing · ✅ PASS
Tests:         30/30 · 165/165 · ✅ PASS
Build:         ✓ clean
```

---

## STEP 7 — Railway verification checklist (user)

### IRR (`/admin/irr`)
- [ ] Header: eyebrow "Hisobotlar" + title "IRR boshqaruvi — Rahbar"
- [ ] Periods tab: children load, expand shows goal periods with sign buttons
- [ ] Quarterly tab: form with section labels in UZ Latin (Axborot tizimi, Ota-onalar bilan ish, etc.)
- [ ] Sign → success toast; quarterly submit → success toast; 409 → duplicate error toast
- [ ] Language UZ→RU→EN: eyebrow, title, section labels, tab labels all switch

### Guruhlar (`/admin/groups`)
- [ ] Header: eyebrow "Boshqaruv" + "Guruhlar (N)"
- [ ] Groups render: name + teacher + capacity/age info
- [ ] No create/edit/delete buttons visible
- [ ] Empty state (if no groups): shows "Guruhlar qabulxona xodimlari tomonidan yaratiladi"
- [ ] Search filter empty: "Guruh topilmadi" (different from no-data message)
- [ ] Language switch: full translation

### Audit jurnali (`/admin/activity`)
- [ ] Header: eyebrow "Hisobotlar" + "Faoliyat tarixchasi"
- [ ] Actor names (Dilnoza Xoliqova format), NOT UUIDs
- [ ] Action labels translated (Hujjat tasdiqlandi, etc.)
- [ ] Entity column translated (Hujjatlar, Qabulxona, etc.)
- [ ] Date adapts on language switch (ru-RU / en-US / uz-UZ)
- [ ] Filter by action → select a type → apply → if no results: "Tanlangan filtr uchun natija topilmadi" + "Filterni tozalash" button
- [ ] "Filterni tozalash" → resets to full list
- [ ] Pagination: Oldingi / Keyingi labels + page count
- [ ] Language switch: full translation

### Final admin portal sweep
- [ ] Every sidebar nav item loads without error, no console errors
- [ ] UZ→RU→EN cycle on Dashboard: date locale, stat labels, all sections
- [ ] Admin login: no decorative patterns (CROSS-LANG-SWITCHER regression)
- [ ] `npm run check:locales` → 0 missing keys confirmed

Screenshots: each page in UZ; Audit jurnali showing entity translation + filter-empty state; one RU view.

---

## STEP 8 — Honest count

| Page | Header | Tokens | Empty states | Locale | Filter-empty | Entity col |
|---|---|---|---|---|---|---|
| ActivityFeed | ✅ | ✅ | ✅ (fixed this pass) | ✅ (7 new keys) | ✅ (added) | ✅ (added) |
| GroupManagement | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| ManagerIRR | ✅ | ✅ | ✅ | ✅ | N/A | N/A |

**Admin portal:** CLOSED COMPLETELY
**Next:** reception portal — RECEPTION-LOCALE-FOUNDATION (extend check:locales to reception/src before any per-page work)
