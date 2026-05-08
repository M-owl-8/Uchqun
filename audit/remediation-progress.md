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
- [x] H-20 Broken `node server.js` start script — changed to `vite preview`, removed stray express dep (9534f65)
- [x] M-06 SchoolRating.stars allowNull: true — made NOT NULL with backfill migration (161504f)

## Phases 4-13 (Queued)

To be detailed as Phase 4 begins.
