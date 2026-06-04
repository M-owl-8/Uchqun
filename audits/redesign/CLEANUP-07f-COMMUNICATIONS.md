# CLEANUP-07f-COMMUNICATIONS — Muloqotlar + Xabarlar Page Restructure

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** 5aa23b7  
**Decisions:** All recommended defaults (A1 modal, B1 subject+body, C1 left/right) were already implemented.

---

## Pre-flight

Both pages already had:
- Correct master-detail layout (list left, thread right)
- Compose modal with subject + body fields
- Left/right bubble alignment in Communications thread view
- All strings wired through `t()` — no new locale key drift

Work was token hygiene + header convention cleanup (no layout redesign).

---

## STEP 1 — Audit Findings

### Muloqotlar (Communications.jsx)

| Element | Before | Issue |
|---|---|---|
| Header | Plain `<h1>`, no eyebrow, no count | No letterhead convention |
| Avatar | `bg-brand-100 text-brand-800` | Brand accent on decorative element |
| Role labels | `bg-blue-50 text-blue-700` / `bg-green-50 text-green-700` | Raw Tailwind blue/green — not admin token palette |
| `formatTime` | `toLocaleTimeString('uz-UZ', ...)` | Hardcoded UZ locale |

What was already correct:
- Master-detail layout, search input, read-only notice, empty states, all strings in `t()`

### Xabarlar (GovMessages.jsx)

| Element | Before | Issue |
|---|---|---|
| Header | `flex items-center gap-3` with `Mail` icon + `text-2xl font-bold text-gray-900` | No letterhead convention; Mail icon decorative noise |
| Token discipline | `text-gray-*`, `border-gray-*`, `bg-gray-*`, `divide-gray-*` throughout | ALL wrong — should be `warm-*` and `bg-surface` |
| Compose button | `text-white rounded-lg` | `text-walnut-text`, `rounded-md` per admin convention |
| Status badges | Text only (`bg-success-100 text-success-700`) | No dot indicator pattern from 07b |
| Label style | `uppercase tracking-wide` on "SIZNING XABARINGIZ" / "GOVERNMENT'S REPLY" | Heavy-handed; normal sentence case more appropriate |
| Compose modal | `bg-white rounded-xl shadow-xl` | `bg-surface rounded-lg`; `border-gray-300` → `border-warm-300` throughout |

---

## STEP 2 — Decisions

All three session decisions (A/B/C) were already implemented:
- A1: Modal compose ✅ (existed)
- B1: Subject + body required ✅ (existed)
- C1: Left/right bubble alignment ✅ (existed)

Single user decision: **Keep inline `div.fixed` modal** (not refactor to shared Modal component) — confirmed.

---

## STEP 3 — Fixes Applied

### Communications.jsx — 4 fixes

**Fix 1 — Letterhead header:**
```jsx
// Before
<div className="mb-6">
  <h1 className="text-3xl font-semibold tracking-tight text-warm-900">
    {t('communications.title', ...)}
  </h1>

// After
<div className="letterhead pt-4 mb-6">
  <p className="text-xs font-medium uppercase tracking-wider text-brand-700">
    {t('nav.section.communications', ...)}
  </p>
  <h1 className="mt-1 text-3xl font-semibold tracking-tight text-warm-900">
    {t('communications.title', ...)} ({conversations.length})
  </h1>
```

**Fix 2 — Avatar token:**
`bg-brand-100 text-brand-800` → `bg-warm-100 text-warm-800`

**Fix 3 — `formatTime` locale:**
`toLocaleTimeString('uz-UZ', ...)` → `toLocaleTimeString(undefined, ...)` (browser-native locale)

**Fix 4 — Role label tokens:**
- Parent: `bg-blue-50 text-blue-700` → `bg-info-50 text-info-700`
- Tarbiyachi: `bg-green-50 text-green-700` → `bg-warm-100 text-warm-700`

### GovMessages.jsx — full rewrite (token-level)

**Header:**
- Removed `Mail` icon (decorative noise)
- Added `letterhead pt-4` wrapper with eyebrow `nav.section.communications`
- Title: `text-2xl font-bold text-gray-900` → `text-3xl font-semibold tracking-tight text-warm-900`
- Added `({messages.length})` count
- Added subtitle line: `govMessages.subtitle`
- Compose button: `text-white rounded-lg` → `text-walnut-text rounded-md shadow-xs`; `Plus` icon added

**Token replacement (pervasive):**
| Before | After |
|---|---|
| `text-gray-900/800/700/600/500/400` | `text-warm-*` equivalents |
| `border-gray-200/300` | `border-warm-200/300` |
| `bg-gray-50/100` | `bg-warm-50/100` |
| `divide-gray-100` | `divide-warm-100` |
| `bg-white` | `bg-surface` |
| `rounded-xl` (modal) | `rounded-lg` |
| `rounded-lg` (inputs) | `rounded-md` |

**Status badges:** Added dot indicator before text
```jsx
// Before
<span className="text-xs px-1.5 py-0.5 rounded font-medium bg-success-100 text-success-700">
  {t('govMessages.badge.replied', ...)}
</span>

// After  
<span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm font-medium border bg-success-50 text-success-700 border-success-100">
  <span className="w-1.5 h-1.5 rounded-full bg-success-600" />
  {t('govMessages.badge.replied', ...)}
</span>
```

Status dots appear in both the sent list AND the message detail metadata.

**Label case:** "SIZNING XABARINGIZ" / "GOVERNMENT'S REPLY" uppercase → `govMessages.yourMessage` / `govMessages.govReply` sentence case (removed `uppercase tracking-wide`).

**Compose modal:** All token replacements; `border-warm-*`, `bg-surface`, `text-warm-*` throughout; `focus:ring-brand-600/30` pattern consistent with other admin forms.

**New locale keys (UZ/RU/EN):**
- `govMessages.subtitle`: "Davlat nazorat organiga murojaatlar" / "Обращения в государственный надзорный орган" / "Official communications to the government oversight authority"
- `govMessages.emptyHint`: "Yangi xabar tugmasini bosib birinchi xabarni yuboring." / "Нажмите «+» чтобы отправить первое сообщение." / "Click '+' to send your first message."

---

## STEP 4 — Test updates

**GovMessages.test.jsx** — 5 assertion strings updated from English defaultValues to UZ defaultValues:
- `'Replied'` → `getAllByText('Javob berildi')` (now appears twice: list + detail)
- `'Pending'` → `getAllByText('Kutilmoqda')`
- `'No messages sent yet'` → `'Hali xabar yuborilmagan'`
- `'New Message'` → `'Yangi xabar'`
- `getByPlaceholderText('Enter subject')` → `'Mavzuni kiriting'`
- `getByPlaceholderText('Enter your message')` → `'Xabaringizni kiriting'`
- `getByText('Send')` → `getByText('Yuborish')`

---

## STEP 5 — Test results

30/30 suites, 167/167 tests — all green.

---

## STEP 6 — User Railway verification

Required before full ✅:

### Muloqotlar
1. Open Muloqotlar → header reads **`Muloqotlar (N)`** with conversation count
2. Conversation list: avatars show neutral grey background (not brand blue)
3. Select a conversation → parent messages show blue-ish info badge, tarbiyachi messages show neutral warm badge
4. No input field visible — read-only enforced
5. Switch UZ → RU → EN → full translation throughout

### Xabarlar
6. Open Xabarlar → letterhead header: **`Hukumatga xabarlar (N)`** with eyebrow "Aloqa", subtitle, `+ Yangi xabar` button
7. Sent list shows **no gray colors** — warm tokens throughout
8. Status badges show dot + label: yellow dot + "Kutilmoqda" or green dot + "Javob berildi"
9. Click a message → detail shows:
   - Metadata section (subject, date, status dot-badge)
   - "Sizning xabaringiz" section (normal case, not UPPERCASE)
   - "Davlat javobi" section if replied (normal case)
10. Click "+ Yangi xabar" → modal opens with warm-token styling (not gray/white)
11. Submit empty → form prevents submit (required fields)
12. Submit valid → toast success, message in list with yellow dot "Kutilmoqda"
13. Switch language → full translation

Screenshots: Muloqotlar with thread open; Xabarlar with message selected; Yangi xabar modal open; one RU view.

---

## STEP 7 — Honest count

| Item | Status |
|---|---|
| Header letterhead convention (both pages) | ✅ |
| Communications avatar brand → warm token | ✅ |
| Communications formatTime locale-neutral | ✅ |
| Communications role labels → info/warm tokens | ✅ |
| GovMessages gray-* → warm-* throughout | ✅ |
| GovMessages status dot indicators | ✅ |
| GovMessages label uppercase → sentence case | ✅ |
| GovMessages compose modal tokens clean | ✅ |
| 2 new locale keys (subtitle + emptyHint) × 3 langs | ✅ |
| GovMessages test assertions updated | ✅ 5 assertions |
| 30/30 suites 167/167 tests | ✅ |
| User Railway verification | ⬜ pending |

---

## Incidental observations

**Test data in production (k/j messages):** The user noted test messages "k" (subject) / "j" (body) visible in Railway production. These are data, not code. No migration needed — delete directly in DB via Railway admin or let them age out. Flagged here; not fixed in this session.
