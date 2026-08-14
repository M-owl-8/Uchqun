/**
 * D-65 — six tables existed ONLY because Sequelize sync() once created them.
 *
 * CAMPAIGN III P2 CORRECTION: this migration originally created SEVEN, including
 * `government_messages`. That was wrong. government_messages is created by
 * 20260112000000 as `super_admin_messages` and renamed by 20260510000000 — my
 * P8 analysis counted tables by grepping createTable() and so missed the rename.
 * Creating it here under its FINAL name meant the rename could not run:
 *     Migration skipped (already exists)
 *     error: relation "government_messages" already exists
 * and a fresh database ended up with BOTH tables. The schema diff found it.
 *
 * CI's new migrate-fresh job applies every migration to an empty database. It
 * failed:
 *
 *     Migration failed 20260401000010-add-school-id-to-users-groups.js
 *     error: relation "public.groups" does not exist
 *
 * No migration creates `groups`. Nor `notifications`, `ai_warnings`,
 * `business_stats`, `government_stats` or `news` — six
 * of the 56 model tables. They exist in production because sync() made them at
 * some point, and every migration since has been layered on top of a schema that
 * the migration set alone cannot reproduce.
 *
 * The consequence is not cosmetic. **The database could not be rebuilt from
 * migrations at all.** A new environment, a second region, a staging clone or a
 * disaster-recovery rebuild would fail at 20260401000010. The S31 restore drill
 * does not cover this: restoring a dump replays bytes, it does not exercise the
 * migration path. CLAUDE.md's own rule — "Sequelize migrations only, never sync
 * schema in production" — was already being violated by the schema's history.
 *
 * Every column, type, default and nullability below was read from the LIVE
 * production schema via information_schema, not inferred from the models, so a
 * rebuilt database matches what production actually has.
 *
 * Foreign keys are deliberately NOT added here. `regions` is not created until
 * 20260521100000 and `schools` not until 20260117100000, both after the
 * migration this one must precede. They are added in
 * 20260814000002-sync-only-tables-foreign-keys.js, once every referenced table
 * exists.
 *
 * Idempotent: CREATE TABLE IF NOT EXISTS and a guarded DO block per enum, so on
 * production — where all seven already exist — this is a no-op.
 *
 * Six columns production HAS are deliberately not created here, because later
 * migrations add them and would fail with "column already exists":
 *     groups.schoolId                                  20260401000010
 *     notifications.schoolId                           20260514000004
 *     news.schoolId                                    20260514000003
 *     government_stats.regionId                        20260521300000
 * The point is to make the SEQUENCE reproduce production, not to shortcut it.
 */
export default {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;

    const mkEnum = (name, values) => `
      DO $$ BEGIN
        CREATE TYPE "${name}" AS ENUM (${values});
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`;

    // ── enum types ────────────────────────────────────────────────────────
    await sql.query(mkEnum('enum_notifications_type', "'activity', 'meal', 'media', 'progress', 'general', 'attendance', 'journal'"));
    await sql.query(mkEnum('enum_notifications_relatedType', "'activity', 'meal', 'media', 'progress', 'attendance', 'journal'"));
    await sql.query(mkEnum('enum_ai_warnings_warningType', "'low_rating', 'declining_rating', 'negative_feedback', 'complaint', 'safety_concern', 'quality_issue', 'other'"));
    await sql.query(mkEnum('enum_ai_warnings_severity', "'low', 'medium', 'high', 'critical'"));
    await sql.query(mkEnum('enum_ai_warnings_targetType', "'school', 'parent', 'teacher', 'child'"));
    await sql.query(mkEnum('enum_business_stats_statType', "'overview', 'users', 'schools', 'revenue', 'subscriptions', 'usage', 'engagement', 'custom'"));
    await sql.query(mkEnum('enum_business_stats_period', "'daily', 'weekly', 'monthly', 'quarterly', 'yearly'"));
    await sql.query(mkEnum('enum_government_stats_statType', "'overview', 'schools', 'students', 'teachers', 'ratings', 'payments', 'therapies', 'activities', 'complaints'"));
    await sql.query(mkEnum('enum_government_stats_period', "'daily', 'weekly', 'monthly', 'quarterly', 'yearly'"));
    await sql.query(mkEnum('enum_news_targetAudience', "'all', 'parents', 'teachers', 'admins'"));

    // ── groups — the one that broke the rebuild ───────────────────────────
    await sql.query(`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"        varchar(255) NOT NULL,
        "description" text,
        "teacherId"   uuid,
        "capacity"    integer NOT NULL DEFAULT 20,
        "ageRange"    varchar(50),
        "createdAt"   timestamp NOT NULL DEFAULT now(),
        "updatedAt"   timestamp NOT NULL DEFAULT now()
      );`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"      uuid NOT NULL,
        "childId"     uuid,
        "type"        "enum_notifications_type" NOT NULL,
        "title"       varchar(500) NOT NULL,
        "message"     text NOT NULL,
        "relatedId"   uuid,
        "relatedType" "enum_notifications_relatedType",
        "isRead"      boolean NOT NULL DEFAULT false,
        "readAt"      timestamp,
        "createdAt"   timestamp NOT NULL DEFAULT now(),
        "updatedAt"   timestamp NOT NULL DEFAULT now()
      );`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS "ai_warnings" (
        "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "warningType"     "enum_ai_warnings_warningType" NOT NULL,
        "severity"        "enum_ai_warnings_severity" NOT NULL DEFAULT 'medium',
        "targetType"      "enum_ai_warnings_targetType" NOT NULL,
        "targetId"        uuid NOT NULL,
        "schoolId"        uuid,
        "parentId"        uuid,
        "title"           varchar(500) NOT NULL,
        "message"         text NOT NULL,
        "aiAnalysis"      text,
        "ratingData"      jsonb,
        "isResolved"      boolean NOT NULL DEFAULT false,
        "resolvedAt"      timestamp,
        "resolvedBy"      uuid,
        "resolutionNotes" text,
        "notifiedUsers"   uuid[],
        "createdAt"       timestamp NOT NULL DEFAULT now(),
        "updatedAt"       timestamp NOT NULL DEFAULT now()
      );`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS "business_stats" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "businessId"  uuid NOT NULL,
        "statType"    "enum_business_stats_statType" NOT NULL,
        "period"      "enum_business_stats_period" NOT NULL,
        "periodStart" timestamp NOT NULL,
        "periodEnd"   timestamp NOT NULL,
        "data"        jsonb NOT NULL,
        "summary"     jsonb,
        "isPublic"    boolean NOT NULL DEFAULT false,
        "generatedAt" timestamp NOT NULL DEFAULT now(),
        "createdAt"   timestamp NOT NULL DEFAULT now(),
        "updatedAt"   timestamp NOT NULL DEFAULT now()
      );`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS "government_stats" (
        "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "region"      varchar(255),
        "district"    varchar(255),
        "schoolId"    uuid,
        "statType"    "enum_government_stats_statType" NOT NULL,
        "period"      "enum_government_stats_period" NOT NULL,
        "periodStart" timestamp NOT NULL,
        "periodEnd"   timestamp NOT NULL,
        "data"        jsonb NOT NULL,
        "summary"     jsonb,
        "generatedBy" uuid,
        "generatedAt" timestamp NOT NULL DEFAULT now(),
        "createdAt"   timestamp NOT NULL DEFAULT now(),
        "updatedAt"   timestamp NOT NULL DEFAULT now()
      );`);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS "news" (
        "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title"          varchar(500) NOT NULL,
        "content"        text NOT NULL,
        "published"      boolean NOT NULL DEFAULT false,
        "targetAudience" "enum_news_targetAudience" NOT NULL DEFAULT 'all',
        "createdById"    uuid,
        "createdAt"      timestamp NOT NULL DEFAULT now(),
        "updatedAt"      timestamp NOT NULL DEFAULT now()
      );`);

    console.log('✓ D-65: seven sync-only tables are now created by migration');
  },

  async down() {
    // Deliberately a no-op. These tables hold production data — groups holds
    // every class in every school, notifications every message sent to a parent.
    // A `down` that drops them would turn a routine rollback into data loss, and
    // L12 forbids exactly that. Rolling this back means the schema is once again
    // unreproducible, which is the defect, not the fix.
    console.log('↩ D-65 down is a deliberate no-op — these tables hold production data');
  },
};
