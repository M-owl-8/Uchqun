/**
 * One-time demo seed: parent ratings (G-026 load-more) + audit log entries (G-061 pagination).
 * Idempotent — safe to run multiple times.
 */

const SEED_MARKER = 'gov-demo-seed-v1';

export async function up(queryInterface) {
  const q = (sql) => queryInterface.sequelize.query(sql);

  // ── 1. Seed parent ratings (G-026: need > 10 for load-more, page size = 10) ──
  await q(`
    INSERT INTO school_ratings (id, "schoolId", "parentId", stars, comment, "createdAt", "updatedAt")
    SELECT
      gen_random_uuid(),
      s.id,
      p.id,
      CASE (p.rn % 5) WHEN 0 THEN 5 WHEN 1 THEN 4 WHEN 2 THEN 4 WHEN 3 THEN 3 ELSE 5 END,
      CASE (p.rn % 12)
        WHEN 0  THEN 'Maktab juda yaxshi, pedagoglar professional'
        WHEN 1  THEN 'Bolam bu yerda yaxshi rivojlanmoqda'
        WHEN 2  THEN 'Xizmatlar sifati yaxshi, lekin joy kichik'
        WHEN 3  THEN 'Ajoyib muassasa, o''qituvchilar mehribon'
        WHEN 4  THEN 'Bolalarimiz uchun eng qulay joy'
        WHEN 5  THEN 'O''qituvchilar doim yordam berishga tayyor'
        WHEN 6  THEN 'Maktab muhiti qulay va xavfsiz'
        WHEN 7  THEN 'Umumiy holat qoniqarli, yaxshilanish kerak'
        WHEN 8  THEN 'Umuman olganda qoniqarli natijalar'
        WHEN 9  THEN 'Yaxshi maktab, hammaga tavsiya etaman'
        WHEN 10 THEN 'Pedagogik jarayon yuqori darajada tashkil etilgan'
        ELSE        'Bolam progress qilmoqda, ko''p rahmat'
      END,
      NOW() - ((p.rn + 1) || ' days')::interval,
      NOW() - ((p.rn + 1) || ' days')::interval
    FROM (
      SELECT id FROM schools WHERE "isActive" = true ORDER BY "createdAt" LIMIT 1
    ) s
    CROSS JOIN (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY "createdAt")) - 1 AS rn
      FROM users
      WHERE role = 'parent' AND "isActive" = true
      ORDER BY "createdAt"
      LIMIT 12
    ) p
    WHERE NOT EXISTS (
      SELECT 1 FROM school_ratings r
      WHERE r."schoolId" = s.id AND r."parentId" = p.id AND r."deletedAt" IS NULL
    )
  `);

  // ── 2. Seed audit log entries (G-061: need > 20 for pagination, page size = 20) ─
  const [[existing]] = await q(
    `SELECT id FROM audit_log WHERE meta->>'seed' = '${SEED_MARKER}' LIMIT 1`
  );
  if (existing) return;

  await q(`
    INSERT INTO audit_log ("actorId", "actorRole", action, entity, "entityId", "schoolId", meta, "occurredAt")
    SELECT
      g.id,
      'government',
      t.action_name,
      t.entity_name,
      CASE WHEN t.use_school THEN s.id ELSE NULL END,
      CASE WHEN t.use_school THEN s.id ELSE NULL END,
      jsonb_build_object('seed', '${SEED_MARKER}', 'seq', t.seq),
      NOW() - (t.seq::text || ' hours')::interval
    FROM (VALUES
      (1,  'view_schools_list',        'school',                    false),
      (2,  'view_school_detail',       'school',                    true),
      (3,  'view_ratings_parent',      'school_rating',             true),
      (4,  'rate_school_gov',          'government_school_rating',  true),
      (5,  'view_platform_users',      'user',                      false),
      (6,  'provision_gov_user',       'user',                      false),
      (7,  'view_audit_log',           'audit_log',                 false),
      (8,  'view_ai_warnings',         'ai_warning',                false),
      (9,  'resolve_ai_warning',       'ai_warning',                false),
      (10, 'view_children',            'child',                     true),
      (11, 'view_teachers_list',       'user',                      true),
      (12, 'view_parents_list',        'user',                      true),
      (13, 'view_school_stats',        'government_stat',           true),
      (14, 'view_schools_list',        'school',                    false),
      (15, 'view_school_detail',       'school',                    true),
      (16, 'view_ratings_parent',      'school_rating',             false),
      (17, 'rate_school_gov',          'government_school_rating',  true),
      (18, 'view_platform_users',      'user',                      false),
      (19, 'view_audit_log',           'audit_log',                 false),
      (20, 'view_ai_warnings',         'ai_warning',                false),
      (21, 'view_children',            'child',                     true),
      (22, 'view_school_detail',       'school',                    true),
      (23, 'view_teachers_list',       'user',                      true),
      (24, 'view_ratings_parent',      'school_rating',             true),
      (25, 'rate_school_gov',          'government_school_rating',  true)
    ) AS t(seq, action_name, entity_name, use_school)
    CROSS JOIN (
      SELECT id FROM users WHERE role = 'government' ORDER BY "createdAt" LIMIT 1
    ) g
    CROSS JOIN (
      SELECT id FROM schools WHERE "isActive" = true ORDER BY "createdAt" LIMIT 1
    ) s
  `);
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query(
    `DELETE FROM audit_log WHERE meta->>'seed' = '${SEED_MARKER}'`
  );
}
