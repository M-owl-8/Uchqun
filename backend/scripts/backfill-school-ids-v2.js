/**
 * HIGH-02 fix: Assign schoolId to all production users that have schoolId=null.
 *
 * Assignment logic:
 *   - "Demo Guruh 1" group (2f6e4aa0) → Demo Maktabi (4ffc18f4)
 *   - "1-guruh" / "2-guruh" groups (tursunova/ibragimova) → Uchqun School (661d2411)
 *   - Parents inherit from their teacherId → group → school
 *   - Admin/reception assigned to Demo Maktabi (the first school, where the .uz default
 *     accounts live — no explicit FK to infer from)
 *   - Audit test accounts (audit-*@, tenant-check-*@) are DELETED, not assigned
 *
 * Run via: railway run node scripts/backfill-school-ids-v2.js
 * Safe to re-run: UPDATE is idempotent when schoolId is already set.
 */

import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Child from '../models/Child.js';

dotenv.config();

const DEMO_MAKTABI   = '4ffc18f4-12a5-4687-9d08-c27d938909f7';
const UCHQUN_SCHOOL  = '661d2411-b1ea-4d8e-8a93-d0374780476a';

// Groups whose null schoolId should be set to Uchqun School
const UCHQUN_SCHOOL_GROUPS = [
  '434b1d31-6c5c-4514-b9d2-c6eb29891f27', // 1-guruh (tursunova)
  '0b00f154-0d2e-4449-a7c6-d4420d62f866', // 2-guruh (ibragimova)
];

// Test accounts to delete (created during audit — no real data)
const AUDIT_EMAILS = [
  'audit-teacher@uchqun-test.local',
  'audit-parent@uchqun-test.local',
  'audit-new-teacher@uchqun-test.local',
  'tenant-check-audit@example.com',
];

// Teachers assigned to Uchqun School based on group membership
const UCHQUN_SCHOOL_TEACHER_IDS = [
  '3f10c37e-d153-438b-b437-5d719c982f66', // tursunova@uchqun.uz
  '08c77c86-88c6-4409-977f-57f4c3aea234', // ibragimova@uchqun.uz
];

async function run() {
  await sequelize.authenticate();
  console.log('Connected.\n');

  // ── 1. Delete audit test accounts ──────────────────────────────────────────
  console.log('=== Step 1: Delete audit test accounts ===');
  for (const email of AUDIT_EMAILS) {
    const u = await User.findOne({ where: { email }, paranoid: false });
    if (!u) { console.log(`  skip (not found): ${email}`); continue; }
    await Child.destroy({ where: { parentId: u.id }, force: true });
    await u.destroy({ force: true });
    console.log(`  deleted: ${email}`);
  }

  // ── 2. Fix group schoolIds ──────────────────────────────────────────────────
  console.log('\n=== Step 2: Assign schoolId to null-schoolId groups ===');
  for (const gid of UCHQUN_SCHOOL_GROUPS) {
    const g = await Group.findByPk(gid);
    if (!g) { console.log(`  group not found: ${gid}`); continue; }
    if (g.schoolId) { console.log(`  group ${g.name}: already has schoolId ${g.schoolId}`); continue; }
    await g.update({ schoolId: UCHQUN_SCHOOL });
    console.log(`  group ${g.name} → Uchqun School`);
  }

  // ── 3. Assign Uchqun School teachers ───────────────────────────────────────
  console.log('\n=== Step 3: Assign Uchqun School teachers ===');
  for (const tid of UCHQUN_SCHOOL_TEACHER_IDS) {
    const u = await User.findByPk(tid);
    if (!u) { console.log(`  teacher not found: ${tid}`); continue; }
    if (u.schoolId) { console.log(`  ${u.email}: already ${u.schoolId}`); continue; }
    await u.update({ schoolId: UCHQUN_SCHOOL });
    console.log(`  ${u.email} → Uchqun School`);
  }

  // ── 4. Assign parents by their teacher's school ────────────────────────────
  console.log('\n=== Step 4: Assign parents by teacher relationship ===');
  const parentsNeedingSchool = await User.findAll({
    where: { role: 'parent', schoolId: null },
  });

  for (const parent of parentsNeedingSchool) {
    if (!parent.teacherId) {
      // No teacher link — assign to Demo Maktabi (default)
      await parent.update({ schoolId: DEMO_MAKTABI });
      console.log(`  ${parent.email}: no teacherId → Demo Maktabi`);
      continue;
    }

    const teacher = await User.findByPk(parent.teacherId);
    if (!teacher) {
      await parent.update({ schoolId: DEMO_MAKTABI });
      console.log(`  ${parent.email}: teacher not found → Demo Maktabi`);
      continue;
    }

    const schoolId = teacher.schoolId || DEMO_MAKTABI;
    await parent.update({ schoolId });
    console.log(`  ${parent.email} → ${teacher.schoolId ? 'Uchqun School' : 'Demo Maktabi'} (via ${teacher.email})`);

    // Also fix children
    await Child.update({ schoolId }, { where: { parentId: parent.id, schoolId: null } });
  }

  // ── 5. Assign remaining teachers with no school ─────────────────────────────
  console.log('\n=== Step 5: Assign remaining null-schoolId teachers ===');
  const teachers = await User.findAll({ where: { role: 'teacher', schoolId: null } });
  for (const t of teachers) {
    // If they have a group with a schoolId, use that
    const group = await Group.findOne({ where: { teacherId: t.id } });
    const schoolId = group?.schoolId || DEMO_MAKTABI;
    await t.update({ schoolId });
    console.log(`  ${t.email} → ${schoolId === DEMO_MAKTABI ? 'Demo Maktabi' : 'Uchqun School'}`);
  }

  // ── 6. Assign admin and reception ─────────────────────────────────────────
  console.log('\n=== Step 6: Assign admin/reception to Demo Maktabi ===');
  const staffRoles = ['admin', 'reception'];
  const staff = await User.findAll({ where: { role: staffRoles, schoolId: null } });
  for (const s of staff) {
    await s.update({ schoolId: DEMO_MAKTABI });
    console.log(`  ${s.email} (${s.role}) → Demo Maktabi`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  const remaining = await User.count({
    where: { role: ['teacher','parent','admin','reception'], schoolId: null },
  });
  console.log(`Remaining null-schoolId operational users: ${remaining}`);
  console.log('Backfill complete.');
}

run()
  .catch(err => { console.error('Fatal:', err.message); process.exit(1); })
  .finally(() => sequelize.close());
