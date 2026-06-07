# SECURITY — Railway DB Credential Rotation

**Date:** 2026-06-07
**Trigger:** Railway Postgres superuser connection string was pasted into a Claude web-sandbox transcript on 2026-06-06. The connection attempt failed (network policy blocked TCP 44423), but the credential was present in the transcript regardless. DEFERRED.md flagged this as a required rotation before any new DB session.
**Owner:** Murodbek (Railway dashboard access required)
**Status:** ⚠️ ENGINEERING PROMPT — rotation is a human action; this doc tracks the requirement and must be completed before beta invite.

---

## Why this matters

The superuser credential can bypass all application-layer access controls including the `REVOKE UPDATE, DELETE ON audit_log` protection (see CLAUDE.md Audit Log Conventions). Any holder of the superuser string can mutate or drop tables directly. Even though the MCP server used for STEP 2 queries (`postgres-uchqun`) is a restricted read-only role and does NOT use the superuser credential, the superuser string in the transcript is still a liability.

---

## Action required (Railway dashboard — human only)

1. **Open Railway dashboard** → Uchqun project → Postgres plugin → **Connect** tab.
2. Click **Reset credentials** (Railway generates a new password and rotates the superuser immediately).
3. **Copy the new `DATABASE_URL`** from the Connect tab.
4. Go to the Uchqun **backend service** → Variables → update `DATABASE_URL` with the new string.
5. Trigger a redeploy (or wait for the next auto-deploy from a push).
6. Verify the old credential no longer works: attempt `psql <old-DATABASE_URL>` — expect `FATAL: password authentication failed`.
7. Confirm the new deploy is healthy: Railway logs should show `Database connected` with no auth errors.
8. **Update this doc** with the timestamp of rotation (do not paste the new credential here).

---

## Verification checklist

- [ ] Old credential rejected by Railway Postgres (`psql` returns auth error)
- [ ] New `DATABASE_URL` set in Railway backend service variables
- [ ] Backend redeploy successful — `Database connected` in logs
- [ ] MCP server `postgres-uchqun` (read-only role) reconnected and functional after rotation

---

## What was NOT compromised

- The `postgres-uchqun` MCP restricted role is a separate low-privilege read-only credential and is NOT the superuser. Queries run via the MCP during STEP 2 of TP-PARENT-ASSIGNMENT (2026-06-07) used this restricted role only.
- No application data was read or mutated via the superuser credential — the network connection timed out before any query could execute.

---

## Timeline

| Event | Date |
|---|---|
| Superuser credential pasted into web transcript | 2026-06-06 |
| Network connection attempt failed (TCP timeout) | 2026-06-06 |
| Rotation flagged in DEFERRED.md | 2026-06-06 |
| This audit doc created — rotation prompted | 2026-06-07 |
| Rotation completed (fill in) | — |
| Old credential verified rejected (fill in) | — |
