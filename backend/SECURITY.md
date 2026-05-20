# Security Policy

## Reporting Vulnerabilities

Report security issues to the project maintainer via email. Do not file public GitHub issues for security vulnerabilities.

## Known Dependency Exceptions

The following `npm audit` findings are acknowledged as **dev-dependency-only** with no production exposure:

| Finding | Severity | Path | Production impact | Decision |
|---|---|---|---|---|
| `tar` CVEs (multiple) | High | `sqlite3` → `node-gyp` → `tar` | None — `sqlite3` is a dev transitive dependency; the app uses Postgres in production | Accepted until `sqlite3@6.0.1` (breaking change) is validated |
| `@tootallnate/once` | Moderate | `sqlite3` → `node-gyp` → `http-proxy-agent` | None — dev dependency chain | Accepted alongside `tar` fix |
| `cacache` | Moderate | `sqlite3` → `node-gyp` → `make-fetch-happen` → `cacache` | None — dev dependency chain | Accepted alongside `tar` fix |
| `file-type` | Moderate | Direct dev dependency | None — not used in production request handling | Will fix when next minor update is available |
| `ws` | Moderate | `socket.io` → `engine.io` → `ws` | Low — WebSocket upgrade header parsing; application uses Socket.io internally; no untrusted upgrade headers accepted | Will fix when `socket.io` releases a compatible patch |

**Remediation plan:** Run `npm audit fix --force` after `sqlite3@6.0.1` is validated in a staging environment. Tracked as `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-003.

## Acknowledged Design Decisions

| Finding | Decision |
|---|---|
| C-02: Group-wide media visibility | Documented as intentional design; requires product/legal sign-off before launch. See `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-001. |
| C-07: CORS regex substring check | Temporary; must be replaced with explicit allowlist before production. See `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-002. |
