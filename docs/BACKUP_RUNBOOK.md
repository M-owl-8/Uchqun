# Database Backup & Restore Runbook

> **Status:** restore drill PROVEN on 2026-06-12 (see [Drill record](#drill-record-2026-06-12)).
> **Scope:** Railway production Postgres for the Uchqun platform.
> **Golden rule:** a backup that has never been restored is a hope, not a backup. Re-run the
> drill quarterly or after any major schema change.

## Secrets referenced (never write values in this file)

| Env var / secret | What it is | Where it lives |
|---|---|---|
| `PROD_DATABASE_URL` | Production Postgres connection string (Railway public proxy URL) | Railway dashboard → Postgres → Connect; GitHub secret for the scheduled workflow |
| `BACKUP_S3_ENDPOINT` / `BACKUP_S3_BUCKET` / `BACKUP_S3_ACCESS_KEY_ID` / `BACKUP_S3_SECRET_ACCESS_KEY` | Object-storage target for scheduled dumps | GitHub repo secrets (only needed if the scheduled workflow is enabled) |

**The dumps contain children's personal data.** Treat every dump file as PII:
encrypted volume or encrypted bucket only, never committed to git, never left in a
shared/temp directory, delete local copies after verification.

## Prerequisites

- PostgreSQL client tools (`pg_dump`, `pg_restore`, `psql`) version ≥ server version.
  Production server is **PostgreSQL 18.3** (verified 2026-06-12), so the client must be ≥ 18.
  Drill used client 18.0 — no compatibility issues.
- A local/test Postgres instance for restore verification (drill used local PostgreSQL 18,
  `localhost:5432`).

## 1. Taking a backup (production — READ-ONLY operation)

```powershell
# $env:PROD_DATABASE_URL must be set in the shell (copy from Railway, do not persist)
pg_dump "$env:PROD_DATABASE_URL" -Fc --no-owner -f "uchqun_prod_$(Get-Date -Format yyyy-MM-dd).dump"
```

- `-Fc` — custom format: compressed, supports parallel/partial restore via `pg_restore`.
- `--no-owner` — dump is restorable by any role, not just the Railway `postgres` user.
- **Expected size:** ~470 KB at current data volume (June 2026). Alert if a new dump is
  drastically smaller than the previous one — a tiny dump usually means a connection or
  permission failure, not less data.
- **Expected duration:** ~35 s from a residential connection (most of it network latency to
  the Railway proxy).

## 2. Restoring to a verification database (NEVER production)

```powershell
# Target is the LOCAL test server. Read the -h/-p/-d flags out loud before running.
psql -U postgres -h localhost -p 5432 -c "DROP DATABASE IF EXISTS uchqun_restore_test;"
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE uchqun_restore_test;"
pg_restore -U postgres -h localhost -p 5432 -d uchqun_restore_test --no-owner --no-privileges "uchqun_prod_YYYY-MM-DD.dump"
```

- **Expected duration:** ~3 s at current volume.
- **Expected warnings:** none with `--no-owner --no-privileges`. Any output at all is a
  finding — investigate before declaring the backup good.

## 3. Verifying the restored copy is USABLE

A restore that "completed" proves nothing. All four checks below must pass.

### 3.1 Table count matches production

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE';
```

Run on both sides (production access is SELECT-only). Counts must be equal (57 as of 2026-06-12).

### 3.2 Row counts on critical tables match

```sql
SELECT 'users' AS tbl, count(*) FROM users
UNION ALL SELECT 'children', count(*) FROM children
UNION ALL SELECT 'child_attendance', count(*) FROM child_attendance
UNION ALL SELECT 'chat_messages', count(*) FROM chat_messages
UNION ALL SELECT 'teacher_ratings', count(*) FROM teacher_ratings
UNION ALL SELECT 'audit_log', count(*) FROM audit_log
UNION ALL SELECT 'SequelizeMeta', count(*) FROM "SequelizeMeta"
ORDER BY 1;
```

Minor drift is acceptable only if production took writes between dump and count; investigate
anything else.

### 3.3 Application queries return sane data

Run against the restored copy — these mirror real portal access patterns:

```sql
-- Teacher's children list (child.groupId -> group.teacherId wiring)
SELECT c."firstName", c."lastName", g.name AS group_name
FROM children c
JOIN groups g ON g.id = c."groupId"
JOIN users t ON t.id = g."teacherId"
WHERE t.email = '<a-teacher-email>' AND c."deletedAt" IS NULL;

-- Parent's attendance read
SELECT c."firstName", a.date, a.status
FROM child_attendance a
JOIN children c ON c.id = a."childId"
JOIN users p ON p.id = c."parentId"
WHERE p.email = '<a-parent-email>' AND a."deletedAt" IS NULL
ORDER BY a.date DESC LIMIT 5;

-- Government dashboard aggregate
SELECT s.name, count(DISTINCT c.id) AS children, count(a.id) AS attendance_rows
FROM schools s
LEFT JOIN children c ON c."schoolId" = s.id AND c."deletedAt" IS NULL
LEFT JOIN child_attendance a ON a."schoolId" = s.id AND a."deletedAt" IS NULL
GROUP BY s.name ORDER BY s.name;
```

All three must return plausible, non-empty data.

### 3.4 Schema version matches

```sql
SELECT name FROM "SequelizeMeta" ORDER BY name DESC LIMIT 3;
```

The migration names must be identical on both sides. If production is ahead, the dump
predates a deploy — take a fresh one.

## 4. Where dumps live

- **Railway automated backups** — primary (see `docs/OPERATIONS.md`, PL-006). Verify the
  Backups tab shows recent snapshots.
- **Scheduled external dumps** — `scripts/backup-db.sh` via
  `.github/workflows/db-backup.yml` (disabled by default; see comments in the workflow for
  the exact secrets Max must set to enable it). Target: an S3-compatible bucket with
  server-side encryption and lifecycle deletion at 30 days.
- **Manual drill dumps** — local encrypted disk only; delete after verification.

---

## RESTORE-TO-PROD — BREAK-GLASS ONLY

> ⛔ **Requires Max's explicit go-ahead. Never executed as part of a drill.**
> This section exists so the procedure is written down *before* the bad day, not improvised
> during it.

1. **Stop writes:** pause the Railway backend service (Dashboard → service → Settings →
   pause) so no new rows land during the restore.
2. **Snapshot current state first**, even if it's believed corrupt:
   `pg_dump "$env:PROD_DATABASE_URL" -Fc --no-owner -f pre_restore_snapshot.dump`
   You cannot undo a restore; this snapshot is the only way back.
3. **Restore into a NEW database, not in-place.** Create a fresh Postgres service in
   Railway, restore the chosen dump into it:
   `pg_restore "$env:NEW_DATABASE_URL" --no-owner --no-privileges <dump-file>`
4. **Verify the new database** with the full section-3 checklist before any traffic.
5. **Repoint** `DATABASE_URL` on the backend service to the new database; unpause.
6. **Keep the old database** untouched for at least 7 days for forensic comparison.
7. Record the incident: what was lost (gap between dump timestamp and incident), who
   approved, timestamps of each step.

Alternative path: Railway's own backup restore (support ticket; see `docs/OPERATIONS.md`).
Prefer Railway's restore when the needed point-in-time exists there — it avoids client-side
version pitfalls.

---

## Drill record (2026-06-12)

| Step | Result |
|---|---|
| Dump (`pg_dump -Fc --no-owner`, client 18.0) | 467 KB in 33.4 s, exit 0 |
| Restore target | `uchqun_restore_test` on local PostgreSQL 18, `localhost:5432` |
| Restore (`pg_restore --no-owner --no-privileges`) | 2.2 s, exit 0, **zero** warnings |
| Table count | 57 = 57 ✅ |
| Row counts (users 36, children 12, child_attendance 18, chat_messages 33, teacher_ratings 1, audit_log 48, SequelizeMeta 101) | identical on both sides ✅ |
| App queries (teacher children list, parent attendance, gov aggregate) | all returned correct, non-empty data ✅ |
| Schema version (last 3 SequelizeMeta entries) | identical, head `20260611000001-def011-excused-remap-correction.js` ✅ |
