# Remediation Progress

> Auto-updated each commit. Format: `- [x] #ID description (commit)`

## Phase 1 — Launch Blockers (COMPLETE)

- [x] #05-001 showToast undefined in admin — replaced with `error()` from useToast (a296de7)
- [x] #05-002 Duplicate ToastProvider crash — removed nested provider from admin layout (a296de7)
- [x] #08-010 JWT_EXPIRE default 30d — corrected to 15m in env.js (a2afa75)
- [x] #04-002 N+1 chat polling — replaced with /chat/unread-count endpoint (3551311)
- [x] #08-001 Socket.io CORS incomplete — added all frontend origins to socket.js (3551311)
- [x] #02-010 Reception document uploads to ephemeral /tmp — persist via storage.js uploadFile() (a296de7)
- [x] #10-001 errorLogger never mounted — added to server.js middleware chain (a296de7)
- [x] #04-001 Help page hardcoded strings — localized with useTranslation + real contact info (a296de7)
- [x] #11-004 Node.js version pinned — verified nixpacks.toml uses nodejs_20 (a296de7)
- [x] #00-001 Config test for Node version — added backend/__tests__/config.test.js (a296de7)

## Phase 2 — Cross-Cutting Infrastructure (COMPLETE)

- [x] #02-007 console.* replaced with logger.* in all backend controllers and routes (b73da75)
- [x] #11-011 ESLint no-console rule for backend/ tightened to error (b73da75)
- [x] #11-010 Input validators added to 13 route groups (b73da75, 778ea37)
- [x] #11-002 Backend CI test coverage threshold (10% lines/statements, 5% branches) (932c387)
- [x] #11-003 Frontend lint step in CI matrix job added (932c387)
- [x] #11-007 jsdom moved from backend dependencies to devDependencies (9d602bb)
- [x] #00-013 Root-level vercel.json removed (0b9e03e)
- [x] #00-012 SAST/secret-scanning (gitleaks + Trivy) added to CI (bf2a1ef)

## Phase 3 — Security Hardening (COMPLETE)

- [x] H-01 through H-12 — pre-resolved in codebase before this session
- [x] H-13 FK indexes used snake_case columns — migration 20260508000001 re-creates as camelCase (6076932)
- [x] H-16 Dev proxy missing for admin/reception/government vite configs — added proxy blocks (70d1906)
- [x] H-20 Broken `node server.js` start script — changed to `vite preview` in all 4 frontends (9534f65, de1e296)
- [x] M-06 SchoolRating.stars allowNull: true — made NOT NULL with backfill migration (161504f)

## Phase 4 — Remaining High + Medium + Low Cleanup (COMPLETE)

- [x] H-18 isTeacher granted admin role — removed admin from predicate (4747b9b)
- [x] L-08 No engines field in frontend package.json — added to all 4 apps (de1e296)
- [x] L-01 Dead exports/imports — removed addChild, showChildPassword, filteredActivities (8fd92cc)
- [x] L-02 Debug artifacts in production — gated error details to dev-only, removed empty comments (c3e71d2)
- [x] M-13 window.confirm blocking dialogs — replaced with ConfirmDialog modal in 6 pages (f07bb8f)
- [x] H-14, H-15, H-17, H-19, C-04, C-08, C-09, C-10, C-11, C-12, C-13 — pre-resolved before this session

## Phase 5 — Medium + Low Remaining (COMPLETE)

- [x] M-14 useAsync eslint-disable stale closure — added execute + immediate to dep array (1c3cb2e)
- [x] L-12 AIWarnings page orphaned — wired route /teacher/ai-warnings in App.jsx (b1e23ec)
- [x] M-09 Swallowed catch blocks — UsersStats, parent Dashboard, Meals now show errors (5c1a3a0)
- [x] M-22 Hardcoded Uzbek strings in ChildProfile — extracted to emotionalCriteria i18n keys (d2f966e)
- [x] M-02 Raw SQL bypasses paranoid in adminStatsController — added deletedAt IS NULL guards (3d184db)
- [x] M-21 — pre-resolved (parentheses already correct before this session)

## Phase 6 — Chat WebSocket + Route Cleanup (COMPLETE)

- [x] M-09 (Chat) fetchParents swallowed catch — wired toastError (bb3e573)
- [x] M-10 Client-side parent filter in Chat — removed; backend already scopes (1639dec)
- [x] M-11 Chat polling → WebSocket — backend emits chat:message, frontend subscribes (6606e4a)
- [x] L-03 Business logic in route closures — updateChildAvatar + checkChildAccess moved to childController (a3e30b7)

## Remaining Open (Won't Fix / Out of Scope)

- M-01: In-memory login rate limiting — requires Redis adapter (out of scope without infra)
- M-03: Group-vs-legacy DRY refactor — high regression risk, deferred
- L-04: Files over 300 lines — refactor, low priority
- L-07: lint-staged missing mobile — mobile removed, N/A
- L-10: CI JWT hardcoded — acceptable for test-only env
- L-13: calculateStats not memoized — pre-resolved or N/A
