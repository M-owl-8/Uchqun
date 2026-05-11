# Contributing to Uchqun

## Setup

### Prerequisites

- Node.js 18+
- Docker (for local Postgres)
- Git

### First run

```bash
# 1. Start the database
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env       # fill in values
npm install
npm run migrate
npm run dev                # port 5000

# 3. Each frontend (separate terminals)
cd admin && npm install && npm run dev   # port 5175
cd government && npm install && npm run dev  # port 5173
cd teacher && npm install && npm run dev     # port 5174
cd reception && npm install && npm run dev   # port 5177
```

### Environment variables

Copy `backend/.env.example` to `backend/.env`. Required keys are documented inline. Never commit `.env` files or seed data with real PII.

Critical flag: `FORCE_SYNC=true` drops all tables — never set it.

## Branch Policy

Always work on `main`. Never create feature branches unless explicitly agreed upon.

## Commit Conventions

Conventional commits:

```
feat(scope): add X
fix(scope): correct Y
cleanup(scope): Z
chore(scope): update deps
docs(scope): add runbook
```

Pre-commit: Husky → lint-staged → ESLint auto-fix. Never use `--no-verify`.

## Testing

### Backend

```bash
cd backend && npm test
```

63 test suites, 510 tests. All must stay green. New controllers **must** ship with tests in `backend/__tests__/controllers/`. PostgreSQL 15 is required for tests.

```bash
# Single file
cd backend && npm test -- path/to/file.test.js
```

### Frontend

```bash
cd admin && npm test -- --run
cd teacher && npm test -- --run
cd reception && npm test -- --run
cd government && npm test -- --run
```

CI fails if no test files exist in an app.

### Lint

```bash
cd backend && npm run lint
cd admin && npm run lint       # etc.
```

All frontends run ESLint at `--max-warnings 0`. Fix every warning before committing.

## Architecture Constraints

- **ES Modules only in backend** — `import`/`export`, no `require()`
- **Sequelize migrations only** — never use `sequelize.sync()` in production; never set `FORCE_SYNC=true`
- **All routes prefixed `/api/`** — all frontend HTTP via `shared/services/api.js`
- **`withCredentials: true`** on all API calls — cookies carry the JWT
- **School scope** — every write that touches a child must pass through `validateChildAccess`

## i18n

All user-facing strings must use `t('namespace.key')` via `react-i18next`. Add keys to all three locale files simultaneously (`en`, `uz`, `ru`). Never hardcode UI strings in JSX.

## When to Use Plan Mode

Before touching:
- `middleware/auth.js`, `middleware/security.js`
- Anything in `controllers/admin/` or `controllers/parent/`
- Migrations
- Route index files or CORS config
- Payment, media upload, or scope-checking logic

## Code Style

- PascalCase components, camelCase services/utils/routes/controllers
- No Prettier configured — match surrounding style
- Default to no comments; only add when the WHY is non-obvious

## Shared Library

Components and contexts in `shared/` are the single source of truth. App-specific copies are thin re-exports. Never duplicate a component from `shared/` — extend it instead.
