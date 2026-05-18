# Uchqun Platform

Government-owned web platform for special education school management in Uzbekistan.

## Apps

| App | Path | Port | Audience |
|-----|------|------|----------|
| Backend API | `backend/` | 5000 | Node.js 20 + Express 4 + PostgreSQL 15 |
| Government | `government/` | 5173 | Top-level platform owner |
| Teacher | `teacher/` | 5174 | Classroom staff (also serves Parent UI) |
| Admin | `admin/` | 5175 | School-level admin |
| Reception | `reception/` | 5177 | School front-desk staff |

**Role hierarchy:** Government > Business > Admin > Reception > Teacher > Parent.

The platform is web-only and state-funded (no in-platform payment processing).

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- PostgreSQL 15
- npm ≥ 9

### Local Setup

```bash
# 1. Install root deps
npm install

# 2. Configure backend
cp backend/.env.example backend/.env
# Required: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST
# Required: JWT_SECRET (min 32 chars, use: openssl rand -hex 32)
# Required: JWT_REFRESH_SECRET (same)
# Optional: OPENAI_API_KEY (AI chat feature), APPWRITE_* (file storage)

# 3. Install backend deps, run migrations, seed demo data
cd backend && npm install && npm run migrate && npm run seed

# 4. Start backend (http://localhost:5000)
npm run dev

# 5. Start a frontend (new terminal, pick one)
cd ../government && npm install && npm run dev   # http://localhost:5173
cd ../admin      && npm install && npm run dev   # http://localhost:5175
cd ../teacher    && npm install && npm run dev   # http://localhost:5174
cd ../reception  && npm install && npm run dev   # http://localhost:5177
```

### Docker

```bash
docker-compose up   # PostgreSQL 15 + backend on :5000
```

> Note: the Docker compose does not include Redis. Socket.IO will fall back to in-memory (single-instance) mode.

---

## Environment Variables

Key variables required in `backend/.env` (see `backend/.env.example` for full list):

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_*` | ✅ | PostgreSQL connection (host, port, name, user, password) |
| `JWT_SECRET` | ✅ | HS256 signing key — generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token key — generate separately |
| `FRONTEND_URL` | ✅ | Comma-separated allowed origins for CORS |
| `OPENAI_API_KEY` | Optional | Enables teacher AI chat (OpenAI or OpenRouter) |
| `APPWRITE_*` | Optional | Cloud file storage (falls back to local `uploads/`) |
| `REDIS_URL` | Optional | Enables Redis for rate limiting, JTI revocation, Socket.IO |
| `MIGRATION_SECRET` | Optional | Protects `POST /api/v1/migrations/run` |

---

## Commands

```bash
# Backend (cd backend)
npm run dev          # Start dev server with hot reload
npm test             # Run Jest test suite
npm run lint         # ESLint check
npm run migrate      # Run pending Sequelize migrations
npm run migrate:undo # Roll back last migration

# Frontend (cd admin | teacher | reception | government)
npm run dev          # Start Vite dev server
npm run build        # Production build
npm test             # Run Vitest suite
npm run lint         # ESLint check
```

---

## Testing

```bash
# Full backend suite
cd backend && npm test

# Single test file
cd backend && npm test -- __tests__/auth.test.js

# Frontend
cd admin && npm test
```

Backend requires a running PostgreSQL 15 instance. Set `DB_*` env vars before running tests.

---

## Deployment

- **Backend** → Railway (auto-deploy on `main` push via `.github/workflows/railway-deploy.yml`)
- **Frontends** → Netlify / Vercel (auto-deploy from same workflow)
- **Database** → Railway PostgreSQL (migrations run automatically on startup via `npm run start:migrate`)

For credential resets and lockout management, see `CLAUDE.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express 4, Sequelize 6, PostgreSQL 15 |
| Frontend | React 18, Vite 5, Tailwind CSS 3 |
| Auth | JWT (HTTP-only cookies), bcrypt-10 |
| Real-time | Socket.IO 4 (Redis adapter when `REDIS_URL` set) |
| i18n | i18next — English, Russian, Uzbek |
| File storage | Appwrite (cloud) or local disk |
| AI | OpenAI / OpenRouter (teacher chat assistant) |
| Logging | Winston + Sentry |
| CI | GitHub Actions — lint, audit, SAST, test, build, deploy |

---

## Documentation

- `CLAUDE.md` — architecture, auth flow, conventions, sensitive-area rules, deployment notes

---

## License

MIT
