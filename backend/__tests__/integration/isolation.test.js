/**
 * Campaign III P3 — the isolation matrix, against a REAL PostgreSQL built from
 * migrations.
 *
 * Why this lane exists. All 1,632 tests in the default suite mock the database.
 * Every dominant defect of all three campaigns — D-47, D-53, D-54, D-61, D-62,
 * D-63, D-64, D-65 — lives at the query or schema layer, and a mocked suite is
 * structurally blind to every one of them. Campaign II's P3 suite probed the
 * DEPLOYED build over HTTP, which found real leaks but could not run in CI and
 * could not fail a build.
 *
 * This runs the real Express app, with the real middleware chain, against a real
 * database, in CI, on every push.
 *
 * The route guard matters as much as the controller, which is why supertest is
 * used against the mounted app rather than calling controllers directly. P1
 * established that D-63's "Admin can access any child" branch was unreachable
 * because therapyRoutes.js:31 mounts it behind requireRole('parent','teacher').
 * A controller-level test would have called that branch and "proved" a leak that
 * production never had. Only the mounted app can tell the difference.
 *
 * Pass criterion, deliberately strict:
 *   - a 4xx is a pass, whatever it says
 *   - a 2xx is a pass ONLY if the body contains none of the other tenant's
 *     SECRET markers
 *   - a 5xx is a FAILURE. A crash is not isolation.
 */
import { jest } from '@jest/globals';
import request from 'supertest';

import app from '../../server.js';
import { buildTwoTenants, secretsOf, auth, closeDb } from './helpers/fixtures.js';
import ChildModel from '../../models/Child.js';
import UserModel from '../../models/User.js';
import TherapyUsage from '../../models/TherapyUsage.js';
import ChildAttendance from '../../models/ChildAttendance.js';
import Activity from '../../models/Activity.js';
import Meal from '../../models/Meal.js';
import MealPlan from '../../models/MealPlan.js';
import EmotionalMonitoring from '../../models/EmotionalMonitoring.js';

jest.setTimeout(120000);

let A; let B; let bSecrets;

beforeAll(async () => {
  ({ A, B } = await buildTwoTenants());
  bSecrets = secretsOf(B);
});

afterAll(async () => {
  await closeDb();
});

/**
 * Everything currently attached to tenant B's child.
 *
 * A cross-tenant WRITE does not show up in the response body — D-62 returned
 * 201 with a clean body and a new TherapyUsage row pointing at another school's
 * child. Counting before and after is what makes that visible.
 */
const countTenantBRows = async () => ({
  therapyUsages: await TherapyUsage.count({ where: { childId: B.child.id } }),
  attendance: await ChildAttendance.count({ where: { childId: B.child.id } }),
  activities: await Activity.count({ where: { childId: B.child.id } }),
  meals: await Meal.count({ where: { childId: B.child.id } }),
  mealPlans: await MealPlan.count({ where: { childId: B.child.id } }),
  monitoring: await EmotionalMonitoring.count({ where: { childId: B.child.id } }),
});

/** Assert a response did not carry tenant B's data to a tenant A caller. */
const expectNoLeak = (res, probe) => {
  const body = typeof res.text === 'string' ? res.text : JSON.stringify(res.body ?? '');
  const leaked = bSecrets.filter((s) => body.includes(s));

  if (res.status >= 500) {
    throw new Error(`${probe}: server error ${res.status} — a crash is not isolation.\n${body.slice(0, 400)}`);
  }
  if (res.status < 400 && leaked.length) {
    throw new Error(
      `${probe}: LEAK — ${res.status} carried ${leaked.length} of tenant B's secrets: `
      + `${JSON.stringify(leaked.slice(0, 3))}\n${body.slice(0, 400)}`
    );
  }
  return { status: res.status, leaked: leaked.length };
};

// Every id-bearing surface, enumerated from the routes rather than remembered.
// Each entry: [name, method, path builder, body builder]
const querySurfaces = () => [
  ['activities?childId', 'get', () => `/api/v1/activities?childId=${B.child.id}`],
  ['meals?childId', 'get', () => `/api/v1/meals?childId=${B.child.id}`],
  ['meal-plans?childId', 'get', () => `/api/v1/meal-plans?childId=${B.child.id}`],
  ['media?childId', 'get', () => `/api/v1/media?childId=${B.child.id}`],
  ['progress?childId', 'get', () => `/api/v1/progress?childId=${B.child.id}`],
  ['attendance?childId', 'get', () => `/api/v1/attendance?childId=${B.child.id}`],
  ['therapy/usage?childId', 'get', () => `/api/v1/therapy/usage?childId=${B.child.id}`],
  ['service-plans?childId', 'get', () => `/api/v1/service-plans?childId=${B.child.id}`],
  ['child-assessments?childId', 'get', () => `/api/v1/child-assessments?childId=${B.child.id}`],
  ['teacher/emotional-monitoring/:childId', 'get', () => `/api/v1/teacher/emotional-monitoring/child/${B.child.id}`],
  ['admin/children/:id', 'get', () => `/api/v1/admin/children/${B.child.id}`],
  ['teacher/children/:id', 'get', () => `/api/v1/teacher/children/${B.child.id}`],
  ['children/:id', 'get', () => `/api/v1/children/${B.child.id}`],
  ['groups/:id', 'get', () => `/api/v1/groups/${B.group.id}`],
  // USER-scoped surfaces. 3.3 requires coverage of every scope-bearing path
  // including users, and the first version of this matrix had none — every
  // probe reached for a CHILD. A staff record is tenant data too.
  ['admin/receptions/:id', 'get', () => `/api/v1/admin/receptions/${B.reception.id}`],
  ['admin/receptions/:id/documents', 'get', () => `/api/v1/admin/receptions/${B.reception.id}/documents`],
  ['admin/teachers/:id', 'get', () => `/api/v1/admin/teachers/${B.teacher.id}`],
];

// Writes across the boundary — the half Campaign II's original suite never had.
const writeSurfaces = () => [
  ['POST attendance (foreign child)', 'post', () => '/api/v1/attendance',
    () => ({ records: [{ childId: B.child.id, date: '2026-08-02', status: 'absent' }] })],
  ['POST therapy (foreign child)', 'post', () => '/api/v1/therapy',
    () => ({ title: 'probe', therapyType: 'speech', childId: B.child.id })],
  ['POST therapy/:id/start (foreign child)', 'post', () => `/api/v1/therapy/${A.therapy.id}/start`,
    () => ({ childId: B.child.id })],
  ['PUT children/:id (foreign)', 'put', () => `/api/v1/children/${B.child.id}`,
    () => ({ firstName: 'overwritten' })],
  ['DELETE children/:id (foreign)', 'delete', () => `/api/v1/children/${B.child.id}`, () => undefined],
  ['PUT activities/:id (foreign)', 'put', () => `/api/v1/activities/${B.activity.id}`,
    () => ({ title: 'overwritten' })],
  ['DELETE activities/:id (foreign)', 'delete', () => `/api/v1/activities/${B.activity.id}`, () => undefined],
  ['PUT meals/:id (foreign)', 'put', () => `/api/v1/meals/${B.meal.id}`,
    () => ({ mealName: 'overwritten' })],
  ['DELETE meals/:id (foreign)', 'delete', () => `/api/v1/meals/${B.meal.id}`, () => undefined],
  ['PUT admin/documents/:id/approve (foreign)', 'put',
    () => `/api/v1/admin/documents/${B.document.id}/approve`, () => ({})],
  ['PUT admin/receptions/:id (foreign)', 'put',
    () => `/api/v1/admin/receptions/${B.reception.id}`, () => ({ firstName: 'overwritten' })],
  ['DELETE admin/receptions/:id (foreign)', 'delete',
    () => `/api/v1/admin/receptions/${B.reception.id}`, () => undefined],
  ['PUT admin/receptions/:id/deactivate (foreign)', 'put',
    () => `/api/v1/admin/receptions/${B.reception.id}/deactivate`, () => ({})],
  // forged scope: a body claiming the other tenant's school/group
  ['POST children with forged schoolId', 'post', () => '/api/v1/children',
    () => ({ firstName: 'forged', lastName: 'probe', dateOfBirth: '2020-01-01',
      gender: 'Male', disabilityType: 'speech', class: '1', teacher: 'x',
      parentId: A.parent.id, schoolId: B.school.id })],
  ['POST children with forged groupId', 'post', () => '/api/v1/children',
    () => ({ firstName: 'forged2', lastName: 'probe', dateOfBirth: '2020-01-01',
      gender: 'Male', disabilityType: 'speech', class: '1', teacher: 'x',
      parentId: A.parent.id, groupId: B.group.id })],
];

const roles = () => [
  ['teacher', () => A.teacher.id],
  ['parent', () => A.parent.id],
  ['admin', () => A.admin.id],
  ['reception', () => A.reception.id],
];

describe('P3 — cross-tenant isolation, real database', () => {
  describe('reads', () => {
    for (const [roleName, idOf] of roles()) {
      for (const [surface, method, pathOf] of querySurfaces()) {
        it(`${roleName} :: ${surface} :: must not reach tenant B`, async () => {
          const res = await request(app)[method](pathOf()).set(auth(idOf()));
          const out = expectNoLeak(res, `${roleName} ${surface}`);
          expect(out.leaked).toBe(0);
        });
      }
    }
  });

  describe('writes', () => {
    for (const [roleName, idOf] of roles()) {
      for (const [surface, method, pathOf, bodyOf] of writeSurfaces()) {
        it(`${roleName} :: ${surface} :: must not cross the boundary`, async () => {
          const before = await countTenantBRows();
          const req = request(app)[method](pathOf()).set(auth(idOf()));
          const body = bodyOf();
          const res = body === undefined ? await req : await req.send(body);
          expectNoLeak(res, `${roleName} ${surface}`);

          // A 2xx is not enough. D-62 returned 201 with a body containing none
          // of tenant B's secrets while creating a TherapyUsage row against
          // tenant B's child — the leak was the WRITE, invisible in the
          // response. The regression canary caught the lane missing it.
          //
          // So every write probe re-reads tenant B afterwards: the child must be
          // untouched, and NOTHING may have been attached to it.
          const after = await countTenantBRows();
          expect(after).toEqual(before);

          const fresh = await ChildModel.findByPk(B.child.id, { paranoid: false });
          expect(fresh).not.toBeNull();
          expect(fresh.firstName).toBe(B.child.firstName);
          expect(fresh.schoolId).toBe(B.school.id);
          expect(fresh.deletedAt).toBeNull();

          // Staff are tenant data too: a foreign reception must not be renamed,
          // deactivated or soft-deleted by a caller from another school.
          const staff = await UserModel.findByPk(B.reception.id, { paranoid: false });
          expect(staff).not.toBeNull();
          expect(staff.firstName).toBe(B.reception.firstName);
          expect(staff.isActive).toBe(true);
          expect(staff.deletedAt).toBeNull();
        });
      }
    }
  });
});
