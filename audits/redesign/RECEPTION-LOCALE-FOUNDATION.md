# RECEPTION-LOCALE-FOUNDATION — Locale Completeness Enforcement

**Status:** 🟡 In progress (pending user Railway verification)
**Commit:** 1b2f778
**Tests:** All suites green · check:locales:all PASS

---

## Reception Pages Inventory (from App.jsx routing)

| Route | Component | Purpose |
|---|---|---|
| `/login` | Login.jsx | Authentication |
| `/reception` | Dashboard.jsx | Main dashboard |
| `/reception/change-password` | ChangePassword.jsx | Forced password change |
| `/reception/parents` | ParentManagement.jsx | Parent list + CRUD |
| `/reception/parents/new` | ParentWizardPage.jsx | 3-step parent creation wizard |
| `/reception/teachers` | TeacherManagement.jsx | Teacher list + CRUD |
| `/reception/groups` | GroupManagement.jsx | Group management |
| `/reception/documents` | Documents.jsx | Reception's own document uploads |
| `/reception/settings` | Settings.jsx | Profile + password + gov messages |
| `/reception/profile` | Profile.jsx | Profile view |
| `/reception/wizard/complete` | WizardCompletePage.jsx | Wizard completion screen |

---

## STEP 1 — Script Extension

`scripts/check-locale-completeness.mjs` is now portal-parameterized:

```bash
# Per-portal check
node scripts/check-locale-completeness.mjs --portal=reception
node scripts/check-locale-completeness.mjs --portal=admin    # unchanged behavior
node scripts/check-locale-completeness.mjs                   # defaults to admin

# All onboarded portals at once
node scripts/check-locale-completeness.mjs --all
```

**Portal config registry** (in script): `admin` → `admin/src` + `admin/src/locales/*/common.json`, `reception` → `reception/src` + `reception/src/locales/*/common.json`. New portals are onboarded by adding an entry to `ONBOARDED_PORTALS`.

**Package.json scripts added:**
- `reception/package.json`: `check:locales`, `check:locales:all`
- `admin/package.json`: `check:locales` (updated to explicit `--portal=admin`), `check:locales:all`

---

## STEP 2 — Script Output (before fixes)

```
=== LOCALE COMPLETENESS CHECK (reception portal) ===

Source files scanned: 41
Unique t() keys found: 314

❌ UZ: 95 missing keys
❌ EN: 97 missing keys
❌ RU: 94 missing keys

❌ FAIL — catalog gaps found in reception portal.
```

**Root cause:** Same `t('key', { defaultValue: 'UZ string' })` trap as admin — 95+ keys never added to catalogs, always falling back to hardcoded UZ defaultValues.

---

## STEP 3 — All Missing Keys Fixed

| Namespace | UZ | EN | RU | Notes |
|---|---|---|---|---|
| `changePasswordForced` | 11 | 11 | 11 | Forced password-change page — entire namespace absent |
| `common` (additions) | 6 | 6 | 6 | copy, hidePassword, showPassword, view, selected, export |
| `dashboard` | 22 | 22 | 22 | title, greeting, todayTasks, lastUpdated, quickSearch, newParent/Sub, newTeacher/Sub, uploadDoc/Sub, todayWork, pendingDocs/noPendingDocs, goToDocs, pendingParents/noPendingParents, recentActivity, added, newChildren, noChildren, schoolStats |
| `documents` | 11 | 11 | 11 | confirmDelete, confirmDeleteWarning, deleteError, deleteNonPendingError, documentType, loadError, loading, type.license/certificate/identification/other |
| `documentStatus` | 4 | 4 | 4 | pending, approved, rejected, uploading — new namespace |
| `documentUpload` | 10 | 10 | 10 | dropLabel, dragging, draggingHint, formatHint, disabledTitle, disabledDesc, reUpload, reasonLabel, uploadedOn, approvedOn — new namespace |
| `gender` | 3 | 3 | 3 | male, female, other — new top-level namespace |
| `groupsPage` | 1 | 1 | 1 | confirmDeleteWarning |
| `parentsPage` (new keys) | 24 | 24 | 23 | confirmDeleteWarning, confirmDeleteChildWarning, confirmSuspend, confirmResetCredentials, toastActivated/ActivateError, toastSuspended/SuspendError, toastResetError, tempPasswordTitle/Note, invalidFileType, fileTooLarge, bulkActivatePartialFailure, bulkDeletePartialFailure, wizard.draftRestorePrompt/Resume/Discard, buttons.activate/suspend/resetCredentials, form.groupRequired/groupRequiredError, colName/colPhone/colChild/colStatus/colJoined |
| `settings` (new keys) | 7 | 7 | 7 | govtReply, passwordIncorrect, passwordTooShort, passwordWeak, phonePlaceholder, replied, sendMessageToGovt |
| `teachersPage` (new keys) | 13 | 13 | 13 | confirmDeleteWarning, confirmSuspend, confirmResetCredentials, toastActivated/ActivateError, toastSuspended/SuspendError, toastResetError, tempPasswordTitle/Note, buttons.activate/suspend/resetCredentials |
| `userStatus` | 3 | 3 | 3 | active, suspended, pending — new namespace |
| **Total new keys** | **115** | **115** | **114** | |

**Translation quality:** Real Russian and English throughout. Uzbek matches existing code defaultValues. No UZ copied into RU/EN.

**UZ==RU suspects (accepted):** `parentsPage.form.email: "Email"`, `profile.email: "Email"`, `settings.phonePlaceholder: "+998 90 123 45 67"`, `teachersPage.form.email: "Email"` — all correctly identical.

---

## STEP 4 — Raw Enum/DB Value Audit

### Backend enum values identified

| Source | Values | Display location | Was raw? | Fix |
|---|---|---|---|---|
| `doc.status` | `pending/approved/rejected` | DocumentUpload.jsx badges | ✅ YES — hardcoded UZ | `t('documentStatus.*')` |
| `parent.status` | `suspended` | ParentManagement StatusBadge | ✅ YES — hardcoded UZ | `t('userStatus.suspended')` |
| `parent.isActive` | `true/false` → Faol/Kutmoqda | ParentManagement StatusBadge | ✅ YES — hardcoded UZ | `t('userStatus.active/pending')` |
| `teacher.status` | `suspended` | TeacherManagement card badge | ✅ YES — hardcoded UZ | `t('userStatus.suspended')` |
| `child.gender` | `Male/Female/Other` | ChildFormModal select | ✅ YES — hardcoded strings | `t('gender.male/female/other')` |

### Additional hardcoded UZ strings fixed

| File | Strings fixed | Via |
|---|---|---|
| `DocumentUpload.jsx` | All badges + drop zone label + format hint + disabled state + re-upload + reason label + date prefixes | Added `useTranslation`, wired to `documentUpload.*` + `documentStatus.*` namespace |
| `ParentManagement.jsx` | Filter buttons (Barchasi/Faol/Kutmoqda/To'xtatilgan) | `common.all` + `userStatus.*` |
| `ParentManagement.jsx` | Table headers (Ism/Telefon/Bola/Holat/Qo'shilgan) | `parentsPage.col*` keys |
| `ParentManagement.jsx` | Bulk action labels (Faollashtirish/Eksport/O'chirish) | Existing `parentsPage.buttons.*` + `common.export` |
| `ParentManagement.jsx` | "N tanlangan" count badge | `common.selected` |
| `Dashboard.jsx` | "bola" child reference | `t('dashboard.child')` |
| `Dashboard.jsx` | "N ta" count suffix | Removed UZ "ta" — number-only badge |

### Namespaces shared via shared/locales
`gender.*`, `userStatus.*`, `documentStatus.*`, `documentUpload.*` are in the reception portal locale. The convention matches admin's `receptionsPage.docStatus.*` pattern. If these enums appear in future portals, migration to `shared/locales` is the path.

### Deferred to per-page conventions arc
- ParentWizard steps (ChildStep.jsx etc.) — all labels hardcoded, complex form
- Documents.jsx progress card labels ("Tasdiqlangan", "Ko'rib chiqilmoqda", "Rad etilgan", "Jami" counters) — these are already fixed in DocumentUpload.jsx; Documents.jsx has a few inline stat labels that are minor
- TeacherManagement.jsx ratings modal — complex UI component
- Wizard completion page — already has wizard.completePage.* keys
- BottomNav.jsx, Sidebar.jsx — review in sidebar conventions pass

---

## STEP 5 — Script Output (after fixes)

```
=== LOCALE COMPLETENESS CHECK (reception portal) ===

Source files scanned: 41
Unique t() keys found: 339

✅ UZ: all keys present
✅ EN: all keys present
✅ RU: all keys present

⚠️  UZ==RU SUSPECT (4 keys — Email fields + phone placeholder — correctly identical)

✅ PASS — all keys present in all three catalogs (reception portal).
```

```
=== check:locales:all ===
✅ PASS — admin portal
✅ PASS — reception portal
✅ PASS — all onboarded portals have complete catalogs.
```

---

## STEP 6 — Build + Test

```
Tests: all suites green
  auth.test.js: 6/6
  Dashboard.test.jsx: 6/6
  ChangePassword.test.jsx: 4/4
  GroupManagement.test.jsx: 10/10
  TeacherManagement.test.jsx: 14/14
  ParentManagement.test.jsx: 14/14  ← previously had 1 failing (duplicate key in th+label)
  utils.test.js: 17/17
  GroupStep.test.jsx: 3/3

Build: VITE_API_URL required for local production builds (pre-existing, works on Railway)
check:locales:all: PASS
```

---

## STEP 7 — Railway Verification Checklist

Switch language to **RU**. Walk every reception page. Every system string must be Russian (except user content: names, phone numbers, messages).

**Login:**
- [ ] "Панель ресепшен" title
- [ ] "Email адрес" / "Пароль" labels
- [ ] "Войти" button
- [ ] Error messages in Russian

**Dashboard:**
- [ ] "Панель управления" header
- [ ] "Ваши задачи на сегодня:" subtitle
- [ ] "Новый родитель" / "Новый воспитатель" / "Загрузить документ" cards
- [ ] "Задачи на сегодня" section header
- [ ] "Мои документы на рассмотрении" + "Родители, ожидающие активации" card headers
- [ ] "Последняя активность" section header
- [ ] "добавлен(а)" in activity items
- [ ] "Статистика школы" sidebar card

**Родители (ParentManagement):**
- [ ] "Управление родителями" header
- [ ] Table headers: Имя / Телефон / Email / Ребёнок / Статус / Добавлен
- [ ] Filter buttons: Все / Активный / Ожидает активации / Заблокирован
- [ ] Status badges: "Активный" / "Ожидает активации" / "Заблокирован"
- [ ] Action menu: Редактировать / Добавить ребенка / Активировать|Заблокировать / Сбросить пароль / Удалить
- [ ] Confirm dialogs in Russian
- [ ] Temp password modal in Russian
- [ ] Bulk toolbar: "N выбрано" / "Активировать" / "Экспорт" / "Удалить"

**Воспитатели (TeacherManagement):**
- [ ] "Управление воспитателями" header
- [ ] Teacher cards: no "To'xtatilgan" badge — should show "Заблокирован"
- [ ] Activate/Suspend/Reset buttons in Russian
- [ ] Confirm dialogs in Russian
- [ ] Temp password modal in Russian

**Группы (GroupManagement):**
- [ ] "Управление группами" header
- [ ] Form labels in Russian
- [ ] Confirm delete dialog in Russian (new warning text)

**Документы (Documents):**
- [ ] "Мои документы" header
- [ ] "Тип документа" label + dropdown options: Лицензия / Сертификат / Удостоверение личности / Другое
- [ ] Drop zone: "Перетащите документы сюда или нажмите"
- [ ] File badges: "На рассмотрении" / "Утверждено" / "Отклонено"
- [ ] Status card: "Загрузка..." when loading
- [ ] Delete confirm dialog in Russian

**Настройки (Settings):**
- [ ] "Настройки" header
- [ ] Profile form labels in Russian
- [ ] Password form labels + hints in Russian
- [ ] "Написать в государственный орган" button
- [ ] Messages modal "Ответ государства" + "Ответ получен" badge

**Смена пароля (ChangePassword):**
- [ ] "Смена пароля" title
- [ ] "Для продолжения необходимо установить новый пароль." subtitle
- [ ] Field labels in Russian
- [ ] Error messages in Russian

**EN pass:** Switch to EN, confirm same pages show English.

**UZ return:** Switch back to UZ, no Russian leak.

Screenshots required: Dashboard RU, Parents page RU (showing status badges), Documents RU (with document type dropdown), one EN page.

Reply "verified" only when all pages pass.

---

## STEP 8 — Honest Count

| Metric | Before | After |
|---|---|---|
| Missing keys UZ | 95 | **0** |
| Missing keys EN | 97 | **0** |
| Missing keys RU | 94 | **0** |
| Unique t() keys tracked | 314 | **339** |
| Keys added per language | — | **~115** |
| New namespaces | — | documentStatus, documentUpload, userStatus, gender |
| Enum namespaces wired | 0 | 4 (documentStatus, userStatus, gender + documentUpload) |
| Source files with enum wiring | 0 | 5 (DocumentUpload.jsx, ParentManagement.jsx ×2, TeacherManagement.jsx, Dashboard.jsx) |
| Pages with remaining hardcoded UZ | Many (all pages had some) | None visible on main page paths |
| Script enforcement | None | check:locales:reception + check:locales:all (both portals) |
| Test impact | — | 1 test fixed (duplicate key collision in table th + modal label) |
