# PP-CHROME-LAYOUT — Parent portal page chrome & layout discipline

**Status:** 🟡 S8 in progress (pending user Railway verification)
**Scope:** Foundational design pass for the parent portal — letterhead headers, container/grid discipline, top-bar title mechanism, token sweep. Equivalent to teacher's TP-PAGE-CHROME but themed for the parent design system.
**Constraint honored:** NO data / feature / endpoint changes — chrome + layout only.

---

## 1. The convention (one place, one component)

A single shared component locks the pattern going forward so per-page chrome can't drift back into ghost (white-on-light) or teacher-slate styles:

**`teacher/src/parent/components/ParentPageHeader.jsx`** (new)
```jsx
const ParentPageHeader = ({ eyebrow, title, subtitle, count, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
    <div className="min-w-0">
      {eyebrow && (
        <p className="text-[11px] uppercase tracking-[.12em] font-medium text-p-sepia-500 mb-1">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-[22px] sm:text-[24px] leading-tight font-semibold text-p-ink">
        {title}
        {typeof count === 'number' && (
          <span className="ml-2 text-[14px] font-normal text-p-sepia-500 align-middle">
            ({count})
          </span>
        )}
      </h1>
      {subtitle && <p className="text-[13px] text-p-sepia-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0 sm:mt-0">{actions}</div>}
  </div>
);
```

Design vocabulary — **parent tokens, not teacher slate:**
- Title: `font-serif text-[22-24px] font-semibold text-p-ink`
- Subtitle: `text-[13px] text-p-sepia-500`
- Eyebrow: `text-[11px] uppercase tracking-[.12em] font-medium text-p-sepia-500`
- Count: `text-[14px] font-normal text-p-sepia-500` in parens after the title

The tokens (`p-ink`, `p-sepia-500`, `p-brand-*`, `p-honey-*`, `p-paper`, `font-serif`) come from the PARENT-DESIGN re-skin (commit `1d2c635`). Dashboard, ChildProfile, Therapy, ChildIRR, and TeacherRating were already in this vocabulary; the dirty 6 ghost-header pages were not.

---

## 2. Per-page chrome status

| Page | Status before S8 | Status after S8 |
|---|---|---|
| `Dashboard.jsx` | CLEAN — `font-serif + p-ink + p-sepia-500` letterhead | unchanged |
| `ChildProfile.jsx` | CLEAN | unchanged (+ raw-gray fix: `bg-gray-50 text-gray-400 border-gray-200` → `bg-p-sepia-50 text-p-sepia-400 border-p-sepia-100`) |
| `Therapy.jsx` | CLEAN | unchanged |
| `ChildIRR.jsx` | CLEAN | unchanged |
| `TeacherRating.jsx` | CLEAN (page-level header). Section header at `:415` uses `text-white` on `bg-p-honey-500` — that's a legitimate dark-honey hero for the in-page School Rating section, established by PARENT-DESIGN | unchanged |
| **`Activities.jsx`** | **GHOST** — `<Card bg-p-brand-700>` hero with `h1 text-4xl text-white` | **FIXED** — `<ParentPageHeader title subtitle count={activities.length} />` |
| **`Meals.jsx`** | **GHOST** — same pattern; date picker was inside the dark Card | **FIXED** — `<ParentPageHeader … count={meals.length} />`; date picker moved to its own `<Card>` row below, label retokenized to `text-p-sepia-500` |
| **`Media.jsx`** | **GHOST** — same; filter chips inside the dark Card with `bg-surface/20 backdrop-blur` glass | **FIXED** — `<ParentPageHeader title subtitle />`; filter chips moved to a separate `<Card>` row with `bg-p-sepia-50 / border-p-sepia-100` tokens |
| **`Chat.jsx`** | **GHOST** — `<Card bg-p-brand-700>` + `h1 text-3xl text-white` | **FIXED** — `<ParentPageHeader title subtitle />` |
| **`Notifications.jsx`** | **GHOST** — same pattern; markAllRead button inside the dark Card | **FIXED** — `<ParentPageHeader title subtitle count={count} actions={…markAllRead button…} />` (action gets the right-side slot, button retokenized to `text-p-brand-700 bg-p-brand-50`) |
| **`Help.jsx`** | **GHOST** — same | **FIXED** — `<ParentPageHeader title subtitle />` |
| **`Settings.jsx`** | DIRTY (slate-style) — `h1 text-3xl font-black text-slate-900` + `p text-slate-500 font-medium` | **FIXED** — `<ParentPageHeader title subtitle />` |
| **`AIWarnings.jsx`** | DIRTY (slate-style from S2) — `text-[22px] font-semibold text-slate-900` | **FIXED** — `<ParentPageHeader title subtitle count={unresolvedCount} />` (count via the canonical prop, not appended manually) |
| **`Attendance.jsx`** | DIRTY (slate-style from S7) — same as AIWarnings | **FIXED** — `<ParentPageHeader title subtitle />` |
| `EmotionalMonitoringSection.jsx` | n/a (sub-component, no page header) | + raw-gray fix: `text-gray-400` → `text-p-sepia-400` |
| `ChangePassword.jsx` | uses `text-xl font-semibold text-slate-900` — minor; this is a small modal-style forced-flow page outside the main shell, so the letterhead doesn't apply | unchanged |

**No page left in DIRTY status.** Six ghost headers eliminated; three slate-style page-level headers normalized; two raw-gray sites retokenized.

---

## 3. Header component — shared, NOT duplicated

There is exactly one parent header component now: `teacher/src/parent/components/ParentPageHeader.jsx`. Per-page headers no longer exist as inline JSX — they all import this component.

```
$ grep -rln "ParentPageHeader" teacher/src/parent --include='*.jsx' | grep -v __tests__
teacher/src/parent/components/ParentPageHeader.jsx
teacher/src/parent/pages/Activities.jsx
teacher/src/parent/pages/Meals.jsx
teacher/src/parent/pages/Media.jsx
teacher/src/parent/pages/Chat.jsx
teacher/src/parent/pages/Notifications.jsx
teacher/src/parent/pages/Help.jsx
teacher/src/parent/pages/Settings.jsx
teacher/src/parent/pages/AIWarnings.jsx
teacher/src/parent/pages/Attendance.jsx
```

Nine pages import the new component. Dashboard, ChildProfile, Therapy, ChildIRR, TeacherRating use the same vocabulary directly (without going through the component) — they were already correct from PARENT-DESIGN and the brief explicitly says not to churn already-clean pages. Recommendation: migrate them through `ParentPageHeader` in a follow-up housekeeping session if/when those pages need touching for other reasons.

---

## 4. Top-bar title mechanism

**There is no separate top-bar showing the page name** — and that's the design. The parent `Layout` (`teacher/src/parent/components/Layout.jsx`) renders a `DesktopTopNav` (navigation links, no title) on `lg:`, a `MobileTabBar` (icons, no title) on small screens, and the page itself sits inside a `<main>` container. The **page's own `<h1>` from `ParentPageHeader` IS the title** — exactly what the user sees as the page name on both desktop and mobile.

This is intentionally different from the teacher portal's `Layout.jsx:36` `pageName = t(getPageNameKey(location.pathname))` mapping (which renders a teacher-style top-bar with a separate page-title slot, plus the page's own `<h1>` below). The parent doesn't have that secondary top-bar, so the title mechanism is single-source: the `<ParentPageHeader title={…}/>` per page.

**Coverage check:**

| Parent route | Title source (`ParentPageHeader title=…`) | t() key |
|---|---|---|
| `/` (Dashboard) | inline (Dashboard's own greeting block) | n/a (greeting uses `user.firstName`) |
| `/child` | inline (`ChildProfile`'s own letterhead) | `child.title` |
| `/activities` | `ParentPageHeader` | `activities.title` |
| `/meals` | `ParentPageHeader` | `meals.title` |
| `/media` | `ParentPageHeader` | `media.title` |
| `/chat` | `ParentPageHeader` | `parentChat.title` |
| `/notifications` | `ParentPageHeader` | `notifications.title` |
| `/help` | `ParentPageHeader` | `help.title` |
| `/rating` | inline (TeacherRating's two-section title) | `ratingPage.title` |
| `/settings` | `ParentPageHeader` | `settings.title` |
| `/therapy` | inline | `therapy.title` |
| `/irr` | inline | `irr.title` |
| `/attendance` | `ParentPageHeader` | `parentAttendance.title` |
| `/warnings` (mounted on /teacher route too) | `ParentPageHeader` | `warnings.title` |

**No hole.** Every parent route renders a page-level title from its own page. `check:locales` PASS confirms every referenced key exists in all three locales.

---

## 5. Container / grid discipline

The Layout wrapper (`teacher/src/parent/components/Layout.jsx:13-21`) provides the outer container — `max-w-2xl mx-auto px-4 sm:px-6 py-6` on the `<main>`. Each page wraps its content in its own `max-w-Nxl mx-auto`:

| Page | Container |
|---|---|
| Activities | `max-w-5xl mx-auto` |
| Meals | `max-w-4xl mx-auto` |
| Media | `max-w-7xl mx-auto` |
| Chat | `max-w-4xl mx-auto` |
| Notifications | `max-w-4xl mx-auto` |
| Help | `max-w-4xl mx-auto` |
| Settings | `max-w-4xl mx-auto` |
| AIWarnings | `space-y-6` only (inherits Layout's `max-w-2xl`) |
| Attendance | `max-w-2xl mx-auto` |

**Grid discipline** — card lists stack on mobile:
- `Activities`: `grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6` (1 → 2 → 3 columns).
- `Media`: same grid pattern with adaptive columns.
- `Meals`: single-column list (each meal a full row Card).
- `Notifications`: single-column list (each notification a full row).
- `Attendance` week view: `grid grid-cols-7 gap-1.5` (fixed 7 columns for the week).

All grids stack via Tailwind's responsive prefixes; no fixed-pixel widths leak across the breakpoint.

---

## 6. Token sweep — zero raw grays, every hex documented

**Raw `text-gray-*` / `text-zinc-*` / `text-stone-*` in parent JSX**:
```
$ grep -rnE "text-(gray|zinc|stone|neutral)-[0-9]+" teacher/src/parent --include='*.jsx' | grep -v __tests__
(empty)
```

**Two raw-hex sites kept** — both functional, not chrome:
- `TeacherRating.jsx:310-311, 379-380` — star-rating fill colors (`#f97316`, `#ea580c`). The lucide `Star` icon's `fill` / `stroke` SVG props don't accept Tailwind classes; these are semantic warm-orange star colors. Wiring them through tokens would require a CSS-var bridge — out of scope.
- `Media.jsx:329, 393` — video player progress slider gradient (`#3b82f6`, `#4b5563`). Same constraint (inline-style gradient on `<input type="range">`). Out of scope.

Documented here so a future tokenization session can find them.

---

## 7. i18n additions

| Key | UZ | EN | RU |
|---|---|---|---|
| `notifications.subtitle` | "Sizning farzandingiz bo'yicha so'nggi yangiliklar" | "Latest updates about your child" | "Последние обновления о вашем ребёнке" |

One key was missing from `teacher/src/parent/locales/{uz,en,ru}/common.json` — added in this session. No other strings introduced; everything else reuses keys that already existed.

`check:locales` PASS — no collisions, no missing keys.

---

## 8. Files modified in S8

| File | Change |
|---|---|
| `teacher/src/parent/components/ParentPageHeader.jsx` | **NEW** — single letterhead component, parent tokens |
| `teacher/src/parent/pages/Activities.jsx` | ghost header → `ParentPageHeader title + subtitle + count` |
| `teacher/src/parent/pages/Meals.jsx` | ghost header → `ParentPageHeader title + subtitle + count`; date picker extracted to own Card with retokenized label |
| `teacher/src/parent/pages/Media.jsx` | ghost header → `ParentPageHeader title + subtitle`; filter chips extracted to own Card, retokenized to `bg-p-sepia-50 / border-p-sepia-100` |
| `teacher/src/parent/pages/Chat.jsx` | ghost header → `ParentPageHeader title + subtitle` |
| `teacher/src/parent/pages/Notifications.jsx` | ghost header → `ParentPageHeader title + subtitle + count + actions` (markAllRead retokenized to `text-p-brand-700 bg-p-brand-50`) |
| `teacher/src/parent/pages/Help.jsx` | ghost header → `ParentPageHeader title + subtitle` |
| `teacher/src/parent/pages/Settings.jsx` | slate header → `ParentPageHeader title + subtitle` |
| `teacher/src/parent/pages/AIWarnings.jsx` | slate header → `ParentPageHeader title + subtitle + count` |
| `teacher/src/parent/pages/Attendance.jsx` | slate header (S7) → `ParentPageHeader title + subtitle` |
| `teacher/src/parent/pages/ChildProfile.jsx` | + raw-gray fix on a disabled state pill |
| `teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx` | + raw-gray fix on an icon color |
| `teacher/src/parent/locales/{uz,en,ru}/common.json` | + `notifications.subtitle` × 3 |

---

## 9. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS |
| Raw-gray sweep (`text-gray/zinc/stone/neutral-*` in parent JSX) | ✅ zero matches |
| Ghost-header sweep (`text-3xl md:text-4xl font-bold text-white` h1) | ✅ zero matches |
| Hardcoded date locales (S6 carryover) | ✅ zero |
| `defaultValue:` masks (S2b carryover) | ✅ zero in teacher/src non-test files |
| ESLint / Vitest | ⚠️ pending CI — sandbox cannot install full dep tree |

---

## 10. User Railway verification

Walk EVERY parent page — desktop and mobile. The brief named it "every page" — that's: `/`, `/child`, `/activities`, `/meals`, `/media`, `/chat`, `/notifications`, `/help`, `/rating`, `/settings`, `/therapy`, `/irr`, `/attendance`, `/warnings`.

1. **Header on each page** has a serif title in `p-ink`, a one-line `p-sepia-500` subtitle that explains the page from the parent's perspective, and a `(N)` count where the page lists entities (Activities, Meals, Notifications, AIWarnings). Pages where the listing concept doesn't apply (Settings, Help, Attendance, Chat, Media — Media's count was dropped for clarity) show no count.
2. **No ghost headers.** No invisible white-on-light text anywhere — every page name is readable on first load.
3. **Container discipline.** Content sits in a consistent `max-w` container with proper padding; no full-width edge bleed, no floating Cards in dead whitespace, card lists stack into a single column on mobile and grow to 2 / 3 columns at `lg` / `xl`.
4. **Primary action / primary content obvious.** Look at each page: the page's purpose is unambiguous from the title + subtitle. Where there's a primary action (Notifications' "Mark all read", Meals' date picker, Media's filter), it's positioned cleanly — not buried inside a dark hero.
5. **Top-bar title.** Every page shows its own name as the `<h1>` letterhead. There is no separate top-bar title slot to drift — the page IS the title.
6. **Switch UZ → RU → EN.** Every page header (title + subtitle + count label "(N)") localizes; no "iyun"/"Чиқиш"/etc. leaks from one language to another.
7. **Raw grays.** Open DevTools, inspect any pill / disabled state / muted text — nothing renders with `text-gray-*` / `bg-gray-*`; everything uses parent tokens (`p-sepia-*`, `p-brand-*`, `p-honey-*`, `p-ink`).

**Screenshots requested:** dashboard (`/`), one content list page (Activities or Notifications), and one detail page (Settings or Attendance).

Reply **"verified"** → `LOOP_TRACKER.md` `PP-CHROME-LAYOUT` to ✅. Next: S9 PP-CHAT-INTEGRITY.
