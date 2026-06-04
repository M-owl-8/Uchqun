# ADMIN-LOCALE-FINAL — Locale Completeness Enforcement

**Status:** ✅ CLOSED (pending user Railway verification)
**Commit:** a99af8f
**Tests:** 30/30 · 165/165 · build clean

---

## STEP 1 — Script output (before fixes)

```
=== LOCALE COMPLETENESS CHECK (admin portal) ===

Source files scanned: 53
Unique t() keys found: 558

❌ UZ: 162 missing keys
❌ EN: 162 missing keys
❌ RU: 162 missing keys

❌ FAIL — catalog gaps found.
```

**Root cause of all 162 gaps:** `t('key', { defaultValue: 'UZ string' })` masked missing catalog entries — pages rendered UZ defaultValues in RU/EN mode and appeared "translated" to code audits.

---

## STEP 2 — Gaps fixed (162 keys × 3 languages)

| Namespace | Count | Notes |
|---|---|---|
| `changePasswordForced` | 11 | Entire namespace absent |
| `common.saving` | 1 | Used by ManagerIRR spinner |
| `communications.search` | 1 | Parent search placeholder |
| `dashboard` | 22 | Attention zone, stat strip, rating card, reports cards all missing |
| `import.rowsProcessed` | 1 | Progress counter label |
| `parentsPage` | 6 | suspend/activate confirm/success/error × 2 |
| `receptionsPage` | 17 | Table column headers, filter label, action tooltips, doc badges, domain/localPart hints |
| `settings` | 47 | Entire namespace absent — Settings + subforms (ProfileForm, PasswordForm, NotificationPreferences, MessageModal, MessagesModal) |
| `therapy` | 43 | Entire namespace absent — TherapyManagement full CRUD |
| **Total** | **162** | |

---

## STEP 3 — Script as permanent gate

`scripts/check-locale-completeness.mjs` committed to repo root. Added to `admin/package.json`:
```json
"check:locales": "node ../scripts/check-locale-completeness.mjs"
```

Script behaviour:
- Globs `admin/src/**/*.{jsx,js}` (excludes `__tests__`)
- Extracts dotted t() keys via regex `\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\`
- Loads shared + portal locale, merges with same logic as runtime `mergeLocales`
- Resolves each key through nested path walk
- Reports missing keys per language + UZ==RU suspects
- Exit 1 if any missing keys — should run in CI before merging locale-touching PRs

**defaultValue policy:** The defaultValue pattern remains for graceful degradation. It can no longer mask gaps because the script is the enforcement layer — missing keys fail the check regardless of defaultValue presence.

---

## STEP 4 — Backend-generated warning titles

**System strings classified:**

| Content | Classification | Translation strategy |
|---|---|---|
| `warning.warningType` | System-generated | Translated via `t()` key map |
| `warning.title` | System-generated (contains school name) | Used as fallback |
| `warning.message` | System-generated | Not translated this session (contains school name + dynamic numbers) |
| `warning.aiAnalysis` | System-generated | Not translated this session |
| Parent review text | **User content** | Never translated |
| Message bodies | **User content** | Never translated |
| Child/parent/teacher names | **User content** | Never translated |

**Implementation:** No backend schema change required.

- `warningType` is already a stable machine identifier (`low_rating`, `declining_rating`, `negative_feedback`)
- Frontend now renders: `t(\`aiWarnings.warningType.${warning.warningType}\`, { defaultValue: warning.title })`
- If the `warningType` key exists → translated label shown
- If unknown `warningType` → falls back to stored UZ title (graceful degradation)
- School name no longer embedded in the translated version; it still appears in `warning.message` body

**Locale keys added (3 langs):**
```json
"aiWarnings": {
  "warningType": {
    "low_rating":        "Past reyting" / "Low rating" / "Низкий рейтинг",
    "declining_rating":  "Reyting pasaymoqda" / "Declining rating" / "Рейтинг снижается",
    "negative_feedback": "Ko'p salbiy fikrlar" / "Negative feedback" / "Много негативных отзывов"
  }
}
```

---

## STEP 5 — Script output (after fixes)

```
=== LOCALE COMPLETENESS CHECK (admin portal) ===

Source files scanned: 53
Unique t() keys found: 558

✅ UZ: all keys present
✅ EN: all keys present
✅ RU: all keys present

⚠️  UZ==RU SUSPECT (7 keys — likely UZ copied into RU):
   adminRegister.labelEmail: "Email"
   profile.email: "Email"
   receptionsPage.email: "Email"
   receptionsPage.colEmail: "Email"
   schoolProfile.email: "Email"
   settings.email: "Email"
   trash.col.email: "Email"

✅ PASS — all keys present in all three catalogs.
```

The 7 UZ==RU suspects are all `"Email"` — correctly identical in both languages. Not a drift issue.

---

## STEP 6 — Build + test

```
30/30 test files · 165/165 tests · 0 failures
build: ✓ 4.16s
```

---

## STEP 7 — Railway verification checklist (user — page by page in RU)

Switch language to RU. Walk every admin page. Every system string must be in Russian (except user content: names, review text, message bodies).

**Dashboard:**
- [ ] Title "Панель управления"
- [ ] Attention section header "Требует вашего внимания"
- [ ] Stat labels: Дети / Воспитатели / Родители / Загруженность
- [ ] Activity section header + items translated
- [ ] Rating card: "Рейтинг учреждения", "Родители · последние 30 дней"
- [ ] Reports strip: IRR/Guruhlar/Audit links + sub-labels

**Qabul boshqaruvi (Receptions):**
- [ ] Table headers: Имя и фамилия / Email / Телефон / Документы / Статус / Зарегистрирован
- [ ] Doc badges: "Нет документов" / "отклонено" / "подтверждено" / "на рассмотрении"
- [ ] Eyebrow "Сотрудники"
- [ ] Filter "Все" dropdown
- [ ] "Сбросить фильтры" button
- [ ] Pagination "Показано X–Y из Z"

**Ota-onalar:**
- [ ] Suspend/activate toasts and confirm dialogs in Russian

**Ogohlantirishlar:**
- [ ] Warning type labels translated (Низкий рейтинг / Рейтинг снижается / Много негативных отзывов)

**Terapiya boshqaruvi:**
- [ ] Header "Управление терапиями"
- [ ] Filter buttons: Все / Музыка / Видео / Контент
- [ ] Modal: all form labels in Russian
- [ ] Empty state translated

**Sozlamalar:**
- [ ] Header "Настройки"
- [ ] Profile form: all labels Russian
- [ ] Password form: all labels and hints Russian
- [ ] Notifications section Russian
- [ ] Quick links section: all descriptions Russian

**Parolni o'zgartirish (ChangePassword forced flow):**
- [ ] Title "Смена пароля"
- [ ] Field labels and validation messages Russian

**EN pass:** Switch to EN, confirm same pages show English.

**UZ return:** Switch back to UZ, no Russian leak visible.

Screenshots: Dashboard RU + stat strip, Terapiya RU, Ogohlantirishlar RU (warning type translated), Sozlamalar RU, one EN page.

Reply "verified" only when all pages pass.

---

## STEP 8 — Honest count

| Metric | Before | After |
|---|---|---|
| Missing keys (UZ) | 162 | **0** |
| Missing keys (EN) | 162 | **0** |
| Missing keys (RU) | 162 | **0** |
| Total catalog size | ~396 portal keys | **558 portal keys** |
| Script enforcement | None | `check:locales` npm script + CI-runnable |
| Warning titles translated | 0 types | 3 types (low_rating/declining_rating/negative_feedback) |
| Backend schema changes | — | None needed — warningType is the stable key |
| User content (never translated) | — | Names, review bodies, message bodies |
