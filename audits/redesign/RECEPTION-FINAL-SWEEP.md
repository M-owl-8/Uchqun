# RECEPTION-FINAL-SWEEP

**Date:** 2026-06-05  
**Scope:** Reception portal — all 11 routes + shared components  
**Locale check:** 396 unique t() keys · 0 missing in UZ/EN/RU (PASS)

---

## Findings Summary

| Category | Found | Fixed inline | Surfaced |
|---|---|---|---|
| Dead UI (no onClick / no flow) | 3 | 3 | 0 |
| Avatar brand/accent tokens | 6 | 6 | 0 |
| Raw color tokens (purple, amber) | 8 | 8 | 0 |
| Hardcoded UZ strings | 22 | 22 | 0 |
| Date locale missing | 4 | 4 | 0 |
| Silent catch (no feedback) | 2 | 2 | 0 |
| Module-level translated const | 1 | 1 | 0 |
| Header count missing | 2 | 2 | 0 |
| Filter-empty no clear-CTA | 3 | 3 | 0 |
| Pill → dot pattern | 1 | 1 | 0 |
| **STRUCTURAL (not fixed)** | **2** | **0** | **2** |

---

## Inline Fixes Applied

### Dead UI Removed
- `Layout.jsx` — Bell button with notification dot; no `/reception/notifications` route exists. Button and import removed.
- `Login.jsx` — "Forgot password" button (`tabIndex={-1}`, no backend flow). Removed.
- `DocumentUpload.jsx` — `MoreHorizontal` button on pending file row (no action). Removed. Import removed.
- `Dashboard.jsx` — "Ko'rish" view button in pending docs list (no `onClick`, no navigation target). Removed.

### Token Fixes
- `ParentManagement.jsx` — `AVATAR_COLORS`: replaced `bg-brand-100 text-brand-800` with `bg-slate-100 text-slate-700`.
- `parents/ParentCard.jsx` — parent avatar `bg-brand-100` → `bg-slate-100`; child avatar same; group box `bg-purple-50 border-purple-100` → `bg-info-50 border-info-100`.
- `TeacherManagement.jsx` — teacher card avatar `bg-brand-100` → `bg-slate-100`.
- `Profile.jsx` — avatar `bg-brand-100` → `bg-slate-100`.
- `ParentWizard/WizardCompletePage.jsx` — all `amber-*` → available `warning-*` shades (50, 100, 600, 700).
- `ParentWizard/ParentWizardPage.jsx` — draft-restore banner `amber-*` → `warning-*`.

### i18n Fixes
- `CommandPalette.jsx` — module-level `quickActions` array with hardcoded UZ labels moved inside component; labels now use `t('palette.actions.newParent')`, `t('documents.upload')`, `t('palette.groups')`. Footer navigation hints (`navigatsiya`, `tanlash`, `yopish`) → `t('palette.navigate/select/close')`.
- `Documents.jsx` — progress card dt labels (`Tasdiqlangan`, `Ko'rib chiqilmoqda`, `Rad etilgan`, `Jami`) → `t('documentStatus.*')` + `t('documents.progressTotal')`. Help card bullet text → `t('documents.help*')` keys.
- `ParentManagement.jsx` — empty state h3 and description paragraph → `t('parentsPage.emptyTitle/emptyDesc/emptySearchDesc')`.
- `ParentCard.jsx` — `<span className="font-medium">Teacher:</span>` → `t('parentsPage.teacherLabel')`.
- `Profile.jsx` — hardcoded `<p>Reception</p>` → `t('role.reception')`.

### Date Locale
- `DocumentUpload.jsx` — `toLocaleDateString()` → `toLocaleDateString(dateLocale)` with DATE_LOCALE map.
- `TeacherManagement.jsx` — `formatDate()` `toLocaleString()` → `toLocaleString(dateLocale)`.
- All `i18n.language` references hardened to `i18n?.language` for test-environment safety.

### Header Counts
- `TeacherManagement.jsx` — `({filteredTeachers.length})` count added to h1.
- `GroupManagement.jsx` — `({filteredGroups.length})` count added to h1.

### Filter-Empty Clear CTAs
- `TeacherManagement.jsx`, `GroupManagement.jsx`, `ParentManagement.jsx` — when `searchQuery` is truthy and no results, show "Clear search" button that calls `setSearchQuery('')`.

### Silent Catch Feedback
- `Settings.jsx` — `loadMessages` catch now calls `showError(t('settings.loadMessagesError'))`.
- `Profile.jsx` — `loadMessages` catch now calls `showError(t('profile.loadMessagesError'))`.

### MessagesModal
- `settings/MessagesModal.jsx` — "Replied" full pill (`rounded-full bg-success-100`) → dot pattern (inline flex, `w-1.5 h-1.5 rounded-full bg-success-500`).

### Locale Keys Added (18 new keys × 3 languages)
`parentsPage`: emptyTitle, emptyDesc, emptySearchDesc, clearSearch  
`teachersPage`: clearSearch  
`groupsPage`: clearSearch  
`settings`: loadMessagesError  
`profile`: loadMessagesError  
`palette`: actions.newParent, navigate, select, close  
`documents`: progressTotal, helpFormats, helpMaxSize, helpReviewTime, helpContact  

---

## Structural Findings (Surfaced — Not Fixed)

### S-01: ParentStep.jsx — Zero i18n coverage
**File:** `reception/src/pages/ParentWizard/steps/ParentStep.jsx`  
**Issue:** The entire parent registration form has zero `t()` calls. All field labels, placeholders, select options (gender), section headings, and emergency contact fields are hardcoded in Uzbek. This is the core of the parent wizard — it's visible to every reception user.  
**Scope:** ~25 strings + 3 select option values × 3 languages. Requires dedicated locale keys under `parentStep.*`.  
**Action required:** Dedicated pass before launch.

### S-02: ChildStep.jsx — Zero i18n coverage
**File:** `reception/src/pages/ParentWizard/steps/ChildStep.jsx`  
**Issue:** Same as S-01 for the child registration step. All labels, placeholders, gender/disability select options, and the `calcAge()` function's return string ("yosh") are hardcoded Uzbek. Also visible to every user adding a child.  
**Scope:** ~20 strings + calcAge + select options × 3 languages. Requires dedicated locale keys under `childStep.*`.  
**Action required:** Can be addressed in same pass as S-01.

---

## Portal Closure Gate

**REQUIRED:** User Railway walkthrough to close this portal.

Walkthrough checklist:
- [ ] Login (RU locale) — no UZ text visible, password label has no forgotten-password button
- [ ] Dashboard — date/time shows in Russian format; pending docs list has no stray "Ko'rish" button
- [ ] Parent Management — empty state shows Russian text; search-empty shows clear-search button
- [ ] Add Parent Wizard — step labels in Russian; draft banner is warning-* colors
- [ ] Wizard Complete — credentials box is warning-* colors; no amber anywhere
- [ ] Teacher Management — count shows in header; filter-empty shows clear-search
- [ ] Group Management — count shows in header; filter-empty shows clear-search
- [ ] Documents page — progress card shows Russian labels (Одобрено/На рассмотрении/Отклонено/Итого); help card in Russian
- [ ] Settings — messages load; if API fails, toast appears
- [ ] Profile — role label shows "Qabulxona xodimi" (UZ) or equivalent; no hardcoded "Reception"
- [ ] Command palette (⌘K) — quick action labels are in Russian; footer hints are in Russian
