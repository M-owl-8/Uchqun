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
| `file-type` | Moderate | Direct dependency | Low — used in `mediaController.js` (`fileTypeFromFile`) and `receptionController.js` (`fileTypeFromBuffer`) for MIME validation. Vulnerability is an infinite loop in ASF parser on malformed input; only triggers on .asf files, which are not in the allowed MIME list. **Resolved in Pre-Launch Sprint: upgraded to file-type@22.0.1.** | Resolved (PL-003) |
| `ws` | Moderate | `socket.io` → `engine.io` → `ws` | Low — WebSocket upgrade header parsing; application uses Socket.io internally; no untrusted upgrade headers accepted | **Resolved in Pre-Launch Sprint: `npm audit fix` upgraded ws to a patched version.** |

**Remediation status (Pre-Launch Sprint):** All vulnerabilities resolved. `npm audit` now reports 0 findings.
- `tar` chain (sqlite3→node-gyp): resolved by `sqlite3@6.0.1` upgrade; all tests pass.
- `ws`: resolved by `npm audit fix` (non-breaking upgrade).
- `file-type`: resolved by `file-type@22.0.1` upgrade; all tests pass. **Correction:** file-type was a production dependency (not dev-only as previously documented).
- `@tootallnate/once`, `cacache`: resolved as part of sqlite3 chain upgrade.

## Acknowledged Design Decisions

| Finding | Decision |
|---|---|
| C-02: Group-wide media visibility | Documented as intentional design; requires product/legal sign-off before launch. See `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-001. |
| C-07: CORS regex substring check | Temporary; must be replaced with explicit allowlist before production. See `LOOP_PRE_LAUNCH_CHECKLIST.md` PL-002. |
