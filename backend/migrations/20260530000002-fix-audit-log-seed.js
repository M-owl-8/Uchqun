/**
 * Fix G-061 seed: replace wrong-action audit_log rows with correct ones
 * that match the AUDIT_LOG_ALLOWLIST in governmentController.js:1121.
 */

const SEED_MARKER = 'gov-demo-seed-v2';
const OLD_MARKER = 'gov-demo-seed-v1';

export async function up(queryInterface) {
  const q = (sql) => queryInterface.sequelize.query(sql);

  // Remove old seed (wrong action names) — postgres superuser is not bound by REVOKE FROM PUBLIC
  await q(`DELETE FROM audit_log WHERE meta->>'seed' = '${OLD_MARKER}'`);

  // Check if already seeded with v2
  const [[existing]] = await q(
    `SELECT id FROM audit_log WHERE meta->>'seed' = '${SEED_MARKER}' LIMIT 1`
  );
  if (existing) return;

  // Insert 25 entries using only actions from AUDIT_LOG_ALLOWLIST:
  //   archive:schools, reactivate:schools, change_category:schools,
  //   approve_registration:admin_registrations, reject_registration:admin_registrations,
  //   create:admins, update:admins, delete:admins,
  //   create:government_users, update:government_users, delete:government_users, reset_password:government_users
  await q(`
    INSERT INTO audit_log ("actorId", "actorRole", action, entity, "entityId", "schoolId", meta, "occurredAt")
    SELECT
      g.id,
      'government',
      t.action_name,
      t.entity_name,
      CASE WHEN t.use_school THEN s.id ELSE NULL::uuid END,
      CASE WHEN t.use_school THEN s.id ELSE NULL::uuid END,
      jsonb_build_object('seed', '${SEED_MARKER}', 'seq', t.seq),
      NOW() - (t.seq::text || ' hours')::interval
    FROM (VALUES
      (1,  'archive',               'schools',                true),
      (2,  'reactivate',            'schools',                true),
      (3,  'change_category',       'schools',                true),
      (4,  'archive',               'schools',                true),
      (5,  'reactivate',            'schools',                true),
      (6,  'approve_registration',  'admin_registrations',    false),
      (7,  'reject_registration',   'admin_registrations',    false),
      (8,  'approve_registration',  'admin_registrations',    false),
      (9,  'reject_registration',   'admin_registrations',    false),
      (10, 'approve_registration',  'admin_registrations',    false),
      (11, 'create',                'admins',                 false),
      (12, 'update',                'admins',                 false),
      (13, 'delete',                'admins',                 false),
      (14, 'create',                'admins',                 false),
      (15, 'update',                'admins',                 false),
      (16, 'create',                'government_users',       false),
      (17, 'update',                'government_users',       false),
      (18, 'delete',                'government_users',       false),
      (19, 'reset_password',        'government_users',       false),
      (20, 'create',                'government_users',       false),
      (21, 'archive',               'schools',                true),
      (22, 'reactivate',            'schools',                true),
      (23, 'change_category',       'schools',                true),
      (24, 'update',                'admins',                 false),
      (25, 'reset_password',        'government_users',       false)
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
    `DELETE FROM audit_log WHERE meta->>'seed' IN ('${SEED_MARKER}', '${OLD_MARKER}')`
  );
}
