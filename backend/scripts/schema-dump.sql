-- Canonical schema dump — one sortable line per schema object.
--
-- Campaign III P2. D-65 established that seven tables and eleven columns existed
-- only because sync() once created them. Migrations now RUN against an empty
-- database; nothing established that what they PRODUCE matches production.
--
-- This file is the single source of both snapshots. The identical text is
-- executed against production and against the migrate-fresh database, so format
-- parity is structural rather than something two scripts have to agree on.
--
-- Excluded deliberately, with reasons:
--   SequelizeMeta  — the migration ledger. Production lists every migration ever
--                    applied; a fresh build lists the same set, but the table's
--                    CONTENTS are data, not schema, and differ by construction.
--                    Its own definition IS compared.
--   pg_catalog / information_schema — not ours.
--
-- Ordering is explicit everywhere. An unordered dump produces a diff that moves
-- when postgres feels like it, which is a diff nobody reads twice.

SELECT line FROM (

  -- tables
  SELECT 1 AS grp, format('TAB %s', table_name) AS line, table_name AS k1, '' AS k2
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

  UNION ALL

  -- columns: name, type, nullability, default
  SELECT 2, format('COL %s|%s|%s|%s|%s',
           c.table_name, c.column_name, c.udt_name,
           c.is_nullable,
           coalesce(c.column_default, '-')),
         c.table_name, c.column_name
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'

  UNION ALL

  -- indexes
  SELECT 3, format('IDX %s|%s|%s', tablename, indexname,
           regexp_replace(indexdef, '^CREATE (UNIQUE )?INDEX [^ ]+ ON ', 'ON ')),
         tablename, indexname
  FROM pg_indexes
  WHERE schemaname = 'public'

  UNION ALL

  -- constraints: primary key, unique, foreign key, check
  SELECT 4, format('CON %s|%s|%s|%s',
           t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid)),
         t.relname, c.conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'

  UNION ALL

  -- enum types and every value, by RANK within the type.
  --
  -- Deliberately not enumsortorder itself. Postgres assigns fractional sort
  -- values when a label is inserted with ADD VALUE BEFORE/AFTER: production has
  -- enum_users_role.government at 4.5 and business at 5, while a fresh build
  -- that appends in order gets 5 and 6. Same labels, same relative order, and
  -- nothing about the database behaves differently. Comparing the float would
  -- report a permanent difference that no migration can close without dropping
  -- and recreating the type on a live column.
  SELECT 5, format('ENU %s|%s|%s', t.typname, e.enumlabel,
           row_number() OVER (PARTITION BY t.typname ORDER BY e.enumsortorder)),
         t.typname,
         lpad((row_number() OVER (PARTITION BY t.typname ORDER BY e.enumsortorder))::text, 6, '0')
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'

  UNION ALL

  -- sequences
  SELECT 6, format('SEQ %s|%s|%s|%s',
           sequence_name, data_type, start_value, increment),
         sequence_name, ''
  FROM information_schema.sequences
  WHERE sequence_schema = 'public'

) s
ORDER BY grp, k1, k2, line;
