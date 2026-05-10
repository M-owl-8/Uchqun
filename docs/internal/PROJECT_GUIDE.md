# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Uchqun is a government-owned web platform for special education school management in Uzbekistan. It's a monorepo with a Node.js/Express backend and four React web dashboards. The platform is web-only — there is no mobile app, and there is no in-platform payment processing (the service is funded by the state).

**Role hierarchy**: Government > Business > Admin > Reception > Teacher > Parent

- **Government** — top-level platform owner. Oversees all schools, manages admin and government accounts, approves admin registrations, handles user messages, views ratings and stats.
- **Business** — school owner.
- **Admin** — school manager (employed by Business).
- **Reception** — school front-desk staff.
- **Teacher** — classroom staff.
- **Parent** — service consumer (parent of a student).

## Repository Structure

```
uchqun/
├── backend/           # Node.js/Express API (PostgreSQL + Sequelize)
├── admin/             # Admin dashboard (React + Vite, port 5175)
├── teacher/           # Teacher dashboard (React + Vite, port 5174)
├── reception/         # Reception management (React + Vite, port 5177)
├── government/        # Government dashboard (React + Vite, port 5173) — top-level platform owner
├── shared/            # Shared components, services & i18n locales
├── .github/workflows/ # CI pipeline (GitHub Actions)
├── .husky/            # Git hooks (pre-commit → lint-staged)
├── plan.md            # Master development plan
└── docker-compose.yml # Local dev environment (PostgreSQL 15 + backend)
```

### Backend Structure

```
backend/
├── config/          # database.js, env.js, storage.js, swagger.js, migrate.js
├── controllers/     # 41 controllers (top-level + admin/* + parent/*)
├── middleware/      # auth, rateLimiter, sanitize, security, upload, uploadChildren, validation, errorHandler, requestLogger, schoolScope
├── migrations/      # 36 Sequelize migration files
├── models/          # 34 models + index.js
├── routes/          # 25 route files
├── scripts/         # 16 utility scripts
├── utils/           # email, logger, errorTracker, governmentLevel, uuidValidator
├── validators/      # 11 input validators (express-validator + Joi)
├── __tests__/       # Jest test files
├── Dockerfile       # Production Docker image (node:20-alpine)
└── railway.toml     # Railway deployment config
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20.0.0 |
| Backend Framework | Express | 4.18.2 |
| Database | PostgreSQL | 15 |
| ORM | Sequelize | 6.35.2 |
| Web Frontend | React | 18.2.0 |
| Build Tool | Vite | 5.0.8 |
| CSS | Tailwind CSS | 3.3.6 |
| Routing (Web) | React Router | 6.20.1 |
| HTTP Client | Axios | 1.13.x |
| i18n | i18next | 23.x |
| Testing (Backend) | Jest | 30.2.0 |
| Testing (Frontend) | Vitest | 4.0.18 |
| Icons (Web) | lucide-react | 0.562.0 |
| AI | OpenAI / OpenRouter | 4.20.0 |
| Real-time | Socket.io | - |
| File Storage | Appwrite | Cloud |
| Error Tracking | Sentry | 10.37.0 |
| Logging | Winston | 3.11.0 |

## Getting Started

### Prerequisites
- Node.js >=20, npm >=9
- PostgreSQL 15 (or use Docker)

### Setup
```bash
# 1. Clone and install
npm install                  # Installs root deps + Husky hooks
cd backend && npm install    # Backend deps

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit .env with your database credentials

# 3. Database
npm run migrate              # Run migrations
npm run seed                 # Seed initial data

# 4. Start backend
cd backend && npm run dev    # Port 5000

# 5. Start a frontend (in separate terminal)
cd admin && npm install && npm run dev
```

### Docker Alternative
```bash
docker-compose up            # PostgreSQL 15 + backend on port 5000
```

## Common Commands

### Backend
```bash
cd backend
npm run dev                  # Start dev server with nodemon (port 5000)
npm start                    # Production start
npm test                     # Run Jest tests
npm run seed                 # Seed database
npm run migrate              # Run Sequelize migrations
npm run migrate:undo         # Undo last migration
npm run test:db              # Test database connection
npm run create:teacher       # Create a teacher account
npm run create:admin         # Create an admin account
npm run create:government    # Create a government account
npm run reset:admin          # Reset admin credentials
```

### Web Frontends (admin, teacher, reception, government)
```bash
cd [app-name]
npm run dev                  # Start Vite dev server
npm run build                # Build for production
npm run lint                 # Run ESLint
npm test                     # Run Vitest tests
npm start                    # Serve built app via Express
```

### Root-Level
```bash
npm run migrate              # Run backend migrations
npm run seed                 # Seed database
```

## Architecture

### Authentication Flow
- JWT-based with short-lived access tokens (15m) and refresh tokens (7d)
- Token sources: HTTP-only cookies (primary), Bearer header (API client fallback)
- Role-based access control via `backend/middleware/auth.js`
- `authenticate` middleware validates token, `requireRole()` factory enforces role
- Reception access requires `documentsApproved` and `isActive` status
- Parents always access own data without `isActive` check
- Shared `api.js` service handles automatic token refresh on 401 responses

### API Route Map
All routes prefixed with `/api/`:

| Prefix | Auth | Description |
|--------|------|-------------|
| `/auth` | Public | Login, registration, token refresh |
| `/government` | Government | Top-level platform owner: dashboard, ratings, stats, admin/government CRUD, user messages, registrations |
| `/admin` | Admin | School admin operations |
| `/reception` | Reception | Student intake, documents |
| `/teacher` | Teacher | Activities, meals, progress |
| `/parent` | Parent | View child data, chat |
| `/business` | Business / Government | Business analytics |
| `/child` | Authenticated | Child CRUD |
| `/activities` | Authenticated | Activity management |
| `/meals` | Authenticated | Meal tracking |
| `/media` | Authenticated | Photo/video uploads |
| `/chat` | Authenticated | AI chat assistant |
| `/therapy` | Authenticated | Therapy sessions |
| `/notifications` | Authenticated | In-app notifications |
| `/ai-warnings` | Authenticated | AI-based alerts |
| `/news` | Authenticated | News/announcements |
| `/child-assessments` | Authenticated | Child diagnostic assessments |
| `/service-plans` | Authenticated | Individual service plans |
| `/meal-plans` | Authenticated | Meal planning |
| `/emotional-monitoring` | Authenticated | Emotional state tracking |
| `/migrations` | Public | Database migration endpoints |
| `/health` | Public | Health check |

### Database Models
All in `backend/models/`:

| Model | Purpose |
|-------|---------|
| User | All user accounts (polymorphic by role) |
| Child | Student profiles |
| Group | Class/group assignments |
| School | School entities |
| Activity | Daily activities |
| ParentActivity | Parent-submitted activities |
| Meal | Meal records |
| MealPlan | Structured meal planning |
| ParentMeal | Parent-submitted meals |
| Media | Photos/videos |
| ParentMedia | Parent-submitted media |
| Document | Uploaded documents |
| Progress | Student progress tracking |
| ChatMessage | AI chat conversations |
| Notification | In-app notifications |
| Therapy | Therapy session definitions |
| TherapyUsage | Therapy session usage |
| EmotionalMonitoring | Emotional state tracking |
| TeacherRating | Teacher performance ratings |
| TeacherTask | Teacher task assignments |
| TeacherResponsibility | Teacher duty assignments |
| TeacherWorkHistory | Teacher employment history |
| SchoolRating | School quality ratings |
| GovernmentStats | Government dashboard statistics |
| BusinessStats | Business analytics data |
| News | News/announcements |
| AIWarning | AI-generated alerts |
| ChildAssessment | Child diagnostic assessments |
| ServicePlan | Individual education service plans |
| AdminRegistrationRequest | Admin registration workflow |
| GovernmentMessage | System-wide messages |
| RefreshToken | JWT refresh token storage |
| TeacherResource | Teacher resource management |
| ParentEvaluation | Parent evaluation records |

### Middleware Chain (request order)
1. **Helmet** - Security headers (CSP, HSTS, X-Frame-Options)
2. **CORS** - Configured origins (localhost + Vercel/Netlify/Railway)
3. **Cookie Parser** - Parse auth cookies
4. **Body Parser** - JSON + URL-encoded (10mb limit for media)
5. **Body Sanitization** - XSS prevention (strips `<script>`, `on*=`, `javascript:`, `data:text/html`)
6. **Request Logger** - Correlation ID tracking (UUID v4)
7. **Rate Limiter** - Per-endpoint limits (see Security section)
8. **Static Files** - `/uploads` directory
9. **Route Handlers** - `authenticate` → `requireRole()` → `schoolScope` (where applicable) → controller

### Security

**Rate Limiting** (`backend/middleware/rateLimiter.js`):

| Limiter | Window | Production | Dev | Notes |
|---------|--------|------------|-----|-------|
| API (general) | 15min | 100 req | 1000 req | All endpoints |
| Auth | 15min | 50 req | 5000 req | Only counts failures |
| Password Reset | 1hr | 3 req | 3 req | Account protection |
| File Upload | 15min | 50 files | 200 files | Storage protection |

Configurable via env: `AUTH_LIMIT_MAX`, `AUTH_LIMIT_WINDOW_MS`, `UPLOAD_LIMIT_MAX`, `UPLOAD_LIMIT_WINDOW_MS`

**Input Sanitization** (`backend/middleware/sanitize.js`):
- Recursively sanitizes all string values in request body
- Removes: `<script>` tags, `on*=` event handlers, `javascript:` URIs, `data:text/html`

**HTTPS Enforcement**: Production-only, skips `/health`, respects `x-forwarded-proto` proxy header

**Helmet**: HSTS 1 year with preload, Content-Security-Policy same-origin, X-Frame-Options deny

## Frontend Architecture

### Shared Code (`shared/`)
- `components/` - BottomNav, Card, LoadingSpinner, TopBar, ErrorBoundary
- `services/api.js` - Axios instance using HTTP-only cookies with automatic 401 refresh
- `locales/` - i18n translation files
- `context/` - Shared React context providers (AuthContext, NotificationContext, ToastContext)

### Per-App Pattern
Each web app follows the same structure:
```
[app]/src/
├── components/    # UI components
├── context/       # AuthContext.js (React Context for auth state)
├── pages/         # Route page components
├── services/      # API service modules
├── locales/       # App-specific translations
└── App.jsx        # Router setup
```

### Port Assignments

| App | Port |
|-----|------|
| Backend API | 5000 |
| Government | 5173 |
| Teacher | 5174 |
| Admin | 5175 |
| Reception | 5177 |

### Proxy Configuration
Teacher app (`teacher/vite.config.js`) has a dev proxy:
- `/api` and `/uploads` → backend (configured via `VITE_API_URL` env var, defaults to `http://localhost:5000` in dev)
- Returns transparent PNG for failed media requests
- Returns JSON error for failed API requests
- Other apps connect directly via `VITE_API_URL`

## Deployment

### Backend (Railway)
- Builder: NIXPACKS
- Health check: `/health`
- Restart policy: ON_FAILURE (max 10 retries)
- Config: `backend/railway.toml`

### Web Frontends (Netlify + Vercel)
Each frontend has both `netlify.toml` and `vercel.json`:
- Build: `npm install && npm run build`
- Output: `dist/`
- SPA routing: all routes → `/index.html`
- Netlify security headers: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, Referrer-Policy
- Asset caching: 1 year immutable

### Docker
- `backend/Dockerfile`: Alpine build, non-root user (UID 1001), exposes port 5000
- `docker-compose.yml`: PostgreSQL 15 + backend with volume persistence

## CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`):
Triggers on push/PR to `main`.

| Job | Description |
|-----|-------------|
| `lint` | ESLint across backend + frontends |
| `security` | `npm audit` for backend and all frontends |
| `test-backend` | Jest tests with PostgreSQL 15 service container |
| `test-frontend` | Vitest for each of 4 web apps (matrix strategy) |
| `build` | Build all 4 web apps (depends on lint + tests) |

All jobs use Node 20 with npm caching.

## Coding Conventions

### Pre-Commit Hooks
- **Husky** (`.husky/pre-commit`) runs `npx lint-staged`
- **lint-staged** auto-fixes ESLint issues on staged files across all apps

### ESLint Configuration
- **Backend** (`backend/.eslintrc.cjs`): Node + ES2021 + Jest environment, eslint:recommended
- **Frontends** (`[app]/.eslintrc.cjs`): Browser + ES2021, eslint:recommended + react + react-hooks, prop-types disabled
- Unused vars warn (ignores `_` prefix)

### File Naming
- Components: PascalCase (`LoadingSpinner.jsx`)
- Services/utils: camelCase (`api.js`, `logger.js`)
- Models: PascalCase (`User.js`, `ChatMessage.js`)
- Routes/controllers: camelCase (`authRoutes.js`, `adminController.js`)
- Validators: camelCase (`authValidator.js`)

### Module System
- Backend: ES Modules (`"type": "module"` in package.json)
- Frontends: ES Modules (Vite default)

### Commit Messages
Follow conventional commit style:
```
fix(scope): description
feat(scope): description
chore(scope): description
```

## Environment Variables

### Backend (`backend/.env`, copy from `.env.example`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `DB_NAME` | Yes | - | PostgreSQL database name |
| `DB_USER` | Yes | - | PostgreSQL username |
| `DB_PASSWORD` | Yes | - | PostgreSQL password |
| `DB_HOST` | Yes | localhost | PostgreSQL host |
| `DB_PORT` | Yes | 5432 | PostgreSQL port |
| `JWT_SECRET` | Yes | - | Access token signing key (32+ chars) |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token signing key (32+ chars, different from JWT_SECRET) |
| `JWT_EXPIRE` | No | 15m | Access token TTL |
| `JWT_REFRESH_EXPIRE` | No | 7d | Refresh token TTL |
| `FRONTEND_URL` | Yes | - | Comma-separated allowed CORS origins |
| `FORCE_SYNC` | No | false | Drop and recreate tables (dangerous) |
| `OPENAI_API_KEY` | No | - | OpenAI or OpenRouter API key |
| `OPENAI_BASE_URL` | No | - | Custom AI API base URL (e.g. OpenRouter) |
| `OPENAI_MODEL` | No | - | AI model identifier |
| `APPWRITE_ENDPOINT` | No | - | Appwrite storage endpoint |
| `APPWRITE_PROJECT_ID` | No | - | Appwrite project ID |
| `APPWRITE_API_KEY` | No | - | Appwrite API key |
| `APPWRITE_BUCKET_ID` | No | - | Appwrite storage bucket ID |
| `API_URL` | No | - | Backend URL for file URL generation |
| `RUN_MIGRATIONS` | No | false | Auto-run migrations on start |
| `CORS_STRICT` | No | false | Strict CORS mode |
| `AUTH_LIMIT_MAX` | No | - | Override auth rate limit |
| `AUTH_LIMIT_WINDOW_MS` | No | - | Override auth rate limit window |
| `UPLOAD_LIMIT_MAX` | No | - | Override upload rate limit |
| `UPLOAD_LIMIT_WINDOW_MS` | No | - | Override upload rate limit window |

### Frontends
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api`) |

## Key File Paths

| What | Path |
|------|------|
| Auth middleware | `backend/middleware/auth.js` |
| School scope middleware | `backend/middleware/schoolScope.js` |
| Security middleware | `backend/middleware/security.js` |
| Rate limiter | `backend/middleware/rateLimiter.js` |
| Input sanitizer | `backend/middleware/sanitize.js` |
| Server entry | `backend/server.js` |
| DB config | `backend/config/database.js` |
| Env config | `backend/config/env.js` |
| Storage config | `backend/config/storage.js` |
| Model index | `backend/models/index.js` |
| Shared API service | `shared/services/api.js` |
| CI pipeline | `.github/workflows/ci.yml` |
| Docker compose | `docker-compose.yml` |
| Backend Dockerfile | `backend/Dockerfile` |
| Railway config | `backend/railway.toml` |
| Master plan | `plan.md` |

## Behavioral Instructions

You are a senior software engineer and system architect.

Rules:
- Always read relevant files before responding
- Make direct changes when asked
- Prefer production-ready solutions
- Do not over-explain unless requested
- Assume this project will scale
- Follow existing patterns in the codebase
- Use ES Module syntax (import/export) in backend code
- Use the shared API service for new frontend HTTP calls
- Always work on `main` branch
- Keep `plan.md` up to date — tick off completed items

Behavior:
- If unsure, ask one clear question
- Otherwise, act decisively
