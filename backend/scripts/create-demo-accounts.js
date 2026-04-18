/**
 * Create demo teacher + parent + child accounts for production/testing
 *
 * Usage:
 *   node scripts/create-demo-accounts.js
 *   npm run create:demo
 *
 * Override defaults via env:
 *   TEACHER_EMAIL=...  TEACHER_PASSWORD=...
 *   PARENT_EMAIL=...   PARENT_PASSWORD=...
 */

import dotenv from 'dotenv';
import sequelize from '../config/database.js';
import User from '../models/User.js';
import School from '../models/School.js';
import Group from '../models/Group.js';
import Child from '../models/Child.js';

dotenv.config();

const TEACHER_EMAIL    = process.env.TEACHER_EMAIL    || 'teacher@uchqun.uz';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || 'Teacher@2025';
const PARENT_EMAIL     = process.env.PARENT_EMAIL     || 'parent@uchqun.uz';
const PARENT_PASSWORD  = process.env.PARENT_PASSWORD  || 'Parent@2025';

const run = async () => {
  try {
    console.log('🔌 Connecting to database…');
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    // ── 1. School ──────────────────────────────────────────────────────────
    let school = await School.findOne({ where: { isActive: true }, order: [['createdAt', 'ASC']] });
    if (!school) {
      school = await School.create({
        name: 'Uchqun Demo Maktabi',
        type: 'both',
        address: 'Toshkent, Uzbekistan',
        isActive: true,
      });
      console.log(`🏫 School created: ${school.name} (${school.id})`);
    } else {
      console.log(`🏫 Using existing school: ${school.name} (${school.id})`);
    }

    // ── 2. Teacher ─────────────────────────────────────────────────────────
    let teacher = await User.findOne({ where: { email: TEACHER_EMAIL } });
    if (teacher) {
      console.log(`👨‍🏫 Teacher already exists: ${TEACHER_EMAIL}`);
    } else {
      teacher = await User.create({
        email: TEACHER_EMAIL,
        password: TEACHER_PASSWORD,
        firstName: 'Demo',
        lastName: 'Teacher',
        role: 'teacher',
        isActive: true,
        schoolId: school.id,
      });
      console.log(`👨‍🏫 Teacher created: ${TEACHER_EMAIL}`);
    }

    // ── 3. Group ───────────────────────────────────────────────────────────
    let group = await Group.findOne({ where: { teacherId: teacher.id } });
    if (group) {
      console.log(`📚 Group already exists: ${group.name} (${group.id})`);
    } else {
      group = await Group.create({
        name: 'Demo Guruh 1',
        description: 'Demo sinov guruhi',
        teacherId: teacher.id,
        capacity: 20,
        ageRange: '5-10',
        schoolId: school.id,
      });
      console.log(`📚 Group created: ${group.name} (${group.id})`);
    }

    // ── 4. Parent ──────────────────────────────────────────────────────────
    let parent = await User.findOne({ where: { email: PARENT_EMAIL } });
    if (parent) {
      console.log(`👩‍👧 Parent already exists: ${PARENT_EMAIL}`);
    } else {
      parent = await User.create({
        email: PARENT_EMAIL,
        password: PARENT_PASSWORD,
        firstName: 'Demo',
        lastName: 'Parent',
        role: 'parent',
        isActive: true,
        schoolId: school.id,
        groupId: group.id,
      });
      console.log(`👩‍👧 Parent created: ${PARENT_EMAIL}`);
    }

    // ── 5. Child ───────────────────────────────────────────────────────────
    const existingChild = await Child.findOne({ where: { parentId: parent.id } });
    if (existingChild) {
      console.log(`🧒 Child already exists: ${existingChild.firstName} ${existingChild.lastName} (${existingChild.id})`);
    } else {
      const child = await Child.create({
        parentId: parent.id,
        firstName: 'Ali',
        lastName: 'Valiyev',
        dateOfBirth: '2018-06-15',
        gender: 'Male',
        disabilityType: 'Nutq buzilishi',
        specialNeeds: 'Maxsus logopedik yordam talab qiladi',
        school: school.name,
        schoolId: school.id,
        class: '2-sinf',
        teacher: `${teacher.firstName} ${teacher.lastName}`,
        groupId: group.id,
        medicalDiagnosis: 'F80.1',
        institutionStartDate: '2024-09-01',
        fatherFullName: 'Sardor Valiyev',
        motherFullName: 'Malika Valiyeva',
        contactPhone: '+998901234567',
        emergencyContact: { name: 'Sardor Valiyev', phone: '+998901234567' },
      });
      console.log(`🧒 Child created: ${child.firstName} ${child.lastName} (${child.id})`);
    }

    // ── Summary ────────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  DEMO ACCOUNTS READY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Teacher  → ${TEACHER_EMAIL}  /  ${TEACHER_PASSWORD}`);
    console.log(`  Parent   → ${PARENT_EMAIL}   /  ${PARENT_PASSWORD}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('  ⚠️  Passwordlarni birinchi logindan keyin o\'zgartiring!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) err.errors.forEach(e => console.error('  -', e.message));
    process.exit(1);
  }
};

run();
