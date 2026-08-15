/**
 * Campaign III P3 — fixtures for the real-Postgres integration lane.
 *
 * Two schools in two regions, a full staff set in each, and child-scoped rows in
 * each. Every probe in the isolation matrix is one account from school A
 * reaching for an object belonging to school B, so a success is unambiguous: not
 * a shared record, not a coincidence of ids, a genuine crossing of the tenant
 * boundary.
 *
 * Everything is created through the real Sequelize models against a database
 * built from migrations. Nothing here calls sync(); if a column is missing from
 * the migration set, these inserts fail, which is the correct outcome.
 */
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import sequelize from '../../../config/database.js';
import User from '../../../models/User.js';
import School from '../../../models/School.js';
import Region from '../../../models/Region.js';
import Child from '../../../models/Child.js';
import Group from '../../../models/Group.js';
import Activity from '../../../models/Activity.js';
import Meal from '../../../models/Meal.js';
import MealPlan from '../../../models/MealPlan.js';
import EmotionalMonitoring from '../../../models/EmotionalMonitoring.js';
import Therapy from '../../../models/Therapy.js';
import TherapyUsage from '../../../models/TherapyUsage.js';
import ChildAttendance from '../../../models/ChildAttendance.js';
import Document from '../../../models/Document.js';

const uid = () => crypto.randomUUID();

/** A signed access token in exactly the shape authController issues. */
export const tokenFor = (userId) =>
  jwt.sign({ userId, jti: crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn: '15m' });

export const auth = (userId) => ({ Authorization: `Bearer ${tokenFor(userId)}` });

// regions.code carries a UNIQUE constraint (regions_code_key). The regression
// canary runs this lane FIVE times against one database, so a fixed code
// collides on the second run and every later run fails for a reason that has
// nothing to do with isolation. Every run gets its own suffix.
const RUN = crypto.randomUUID().slice(0, 8);

async function makeSchool(label, regionName) {
  const region = await Region.create({
    name: `${regionName} ${RUN}`, code: `${label.toUpperCase()}-${RUN}`,
    slug: `${label}-region-${RUN}`, isRepublic: false,
  });
  const school = await School.create({
    name: `${label} school ${RUN}`, slug: `${label}-school-${RUN}`, isActive: true,
    type: 'support', regionId: region.id,
  });
  return { region, school };
}

async function makeUser({ role, school, teacherId = null, groupId = null, createdBy = null }) {
  const password = await bcrypt.hash('Integration@2026', 4);
  return User.create({
    email: `${role}.${crypto.randomUUID().slice(0, 8)}@integration.test`,
    password,
    firstName: role, lastName: school.slug,
    role,
    isActive: true,
    isVerified: true,
    documentsApproved: true,
    status: 'active',
    schoolId: role === 'government' ? null : school.id,
    teacherId, groupId, createdBy,
  });
}

/**
 * One school with a full cast and a child carrying every scoped record type.
 */
async function buildTenant(label, regionName) {
  const { region, school } = await makeSchool(label, regionName);

  const admin = await makeUser({ role: 'admin', school });
  const teacher = await makeUser({ role: 'teacher', school });
  const reception = await makeUser({ role: 'reception', school, createdBy: admin.id });
  const group = await Group.create({ name: `${label} group`, schoolId: school.id, teacherId: teacher.id });
  const parent = await makeUser({ role: 'parent', school, teacherId: teacher.id, groupId: group.id });

  const child = await Child.create({
    firstName: `${label}-child`, lastName: 'Integration',
    dateOfBirth: '2019-04-01', gender: 'Female',
    disabilityType: 'speech', class: '1', teacher: teacher.firstName,
    parentId: parent.id, schoolId: school.id, groupId: group.id,
    specialNeeds: `${label} SECRET special needs`,
    medicalDiagnosis: `${label} SECRET diagnosis`,
  });

  const activity = await Activity.create({
    childId: child.id, title: `${label} SECRET activity`, description: `${label} SECRET description`,
    type: 'Learning', duration: 30, teacher: teacher.firstName, date: '2026-08-01',
    notes: `${label} SECRET activity notes`,
  });

  const meal = await Meal.create({
    childId: child.id, mealName: `${label} SECRET meal`, mealType: 'Breakfast',
    date: '2026-08-01', specialNotes: `${label} SECRET meal notes`,
  });

  // MealPlan maps camelCase attributes onto snake_case columns (underscored:
  // true, plus explicit field:). The MODEL names are what Sequelize validates,
  // so the column names fail with a notNull violation that names the attribute.
  const mealPlan = await MealPlan.create({
    childId: child.id, date: '2026-08-01', mealType: 'Breakfast',
    plannedMenu: `${label} SECRET planned menu`, notes: `${label} SECRET plan notes`,
    createdBy: teacher.id,
  });

  const monitoring = await EmotionalMonitoring.create({
    childId: child.id, teacherId: teacher.id, date: '2026-08-01',
    notes: `${label} SECRET emotional notes`,
  });

  const therapy = await Therapy.create({
    title: `${label} therapy`, therapyType: 'speech', createdBy: teacher.id,
  });

  const therapyUsage = await TherapyUsage.create({
    therapyId: therapy.id, childId: child.id, parentId: parent.id,
    teacherId: teacher.id, startTime: new Date(),
    notes: `${label} SECRET therapy notes`,
  });

  const attendance = await ChildAttendance.create({
    childId: child.id, schoolId: school.id, teacherId: teacher.id, markedBy: teacher.id,
    date: '2026-08-01', status: 'present',
    childSnapshot: { firstName: child.firstName, lastName: child.lastName, schoolId: school.id },
  });

  const document = await Document.create({
    userId: reception.id, documentType: 'identification',
    fileName: `${label}-doc.pdf`, filePath: `/uploads/${label}-doc.pdf`, status: 'pending',
  });

  return {
    label, region, school, admin, teacher, reception, parent, group, child,
    activity, meal, mealPlan, monitoring, therapy, therapyUsage, attendance, document,
  };
}

/**
 * Build both tenants. `A` is the prober; `B` owns everything A must not reach.
 */
export async function buildTwoTenants() {
  const A = await buildTenant('alfa', 'Alfa region');
  const B = await buildTenant('bravo', 'Bravo region');
  return { A, B };
}

/** Every SECRET marker belonging to a tenant — used to detect a leak in any body. */
export function secretsOf(t) {
  return [
    t.child.specialNeeds, t.child.medicalDiagnosis,
    t.activity.title, t.activity.notes,
    t.meal.mealName, t.meal.specialNotes,
    t.mealPlan.plannedMenu, t.mealPlan.notes,
    t.monitoring.notes, t.therapyUsage.notes,
  ].filter(Boolean);
}

export async function closeDb() {
  await sequelize.close();
}

export { sequelize, uid };
