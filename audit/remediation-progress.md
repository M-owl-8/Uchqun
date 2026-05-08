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

## Phase 2 — Cross-Cutting Infrastructure (IN PROGRESS)

- [ ] #02-007 console.* replaced with logger.* in all backend controllers and routes
- [ ] #11-011 ESLint no-console rule for backend/
- [ ] #11-010 Input validators added to 13 route groups (chat, parent, teacher, admin, progress, reception, servicePlan, childAssessment, therapy, mealPlan, notification, business, aiWarning)
- [ ] #11-002 Backend CI test coverage threshold
- [ ] #11-003 Frontend lint step in CI
- [ ] #11-007 jsdom moved to devDependencies
- [ ] #00-013 vercel.json consolidation
- [ ] #00-012 SAST/secret-scanning in CI

## Phase 3 — Security Hardening

- [ ] H-01 Therapy route ordering — /therapy/usage unreachable
- [ ] H-02 Unauthenticated test-upload endpoint
- [ ] H-03 Any role can delete children
- [ ] H-04 Business routes reject business role
- [ ] H-05 Super-admin creation bypasses secret in staging
- [ ] H-06 Super-admin identity by email string
- [ ] H-07 getById uses wrong model for group-assigned parents
- [ ] H-08 getParents returns cross-school data
- [ ] H-09 Delete operations without transactions

## Phases 4-13 (Queued)

To be detailed as Phase 3 completes.
