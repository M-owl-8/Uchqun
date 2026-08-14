// D-02 regression guard.
//
// a0723db1 (2026-06-02) migrated every account-creation frontend from sending
// `email` to sending `localPart`, and moved domain composition into the
// controllers — but left `body('email').isEmail()` on the route validators,
// which run BEFORE the controller. Every create call has returned 400 since.
// The 33 tests added by that commit exercised accountDomain.js in isolation and
// never ran a validator chain, so nothing caught it.
//
// These tests run the real validator chains against the real payload shapes the
// four production forms send.
import { validationResult } from 'express-validator';
import { createAdminValidator } from '../validators/governmentUserValidator.js';
import { createReceptionValidator } from '../validators/adminValidator.js';
import { createStaffValidator, createParentValidator } from '../validators/receptionValidator.js';

const run = async (validators, body) => {
  const req = { body };
  for (const v of validators) await v.run(req);
  return validationResult(req);
};

const PW = 'SimRun@2026';

describe('D-02 — account-creation validators accept the localPart payload the UI sends', () => {
  // government/src/components/tabs/AdminsTab.jsx:64
  it('createAdminValidator accepts { localPart, firstName, lastName, password, schoolId }', async () => {
    const r = await run(createAdminValidator, {
      localPart: 'direktor', firstName: 'Aziz', lastName: 'Karimov',
      password: PW, schoolId: '5334e23c-a749-4808-8b9a-1f8c67aa1938',
    });
    expect(r.array()).toEqual([]);
  });

  // admin/src/pages/ReceptionManagement.jsx:14 EMPTY_CREATE_FORM
  it('createReceptionValidator accepts { localPart, password, firstName, lastName, phone }', async () => {
    const r = await run(createReceptionValidator, {
      localPart: 'qabul', password: PW, firstName: 'Iroda', lastName: 'Abdullayeva',
      phone: '+998901112233',
    });
    expect(r.array()).toEqual([]);
  });

  // reception/src/pages/TeacherManagement.jsx:235-241
  it('createStaffValidator accepts { localPart, password, firstName, lastName, phone }', async () => {
    const r = await run(createStaffValidator, {
      localPart: 'tarbiyachi', password: PW, firstName: 'Zulfiya', lastName: 'Nazarova',
      phone: '+998901112244',
    });
    expect(r.array()).toEqual([]);
  });

  // reception/src/pages/ParentWizard/ParentWizardPage.jsx:16,20
  // NOTE: body('child[gender]') resolves the NESTED path child.gender — verified by
  // probe, and consistent with the production 400 that named this field. The tests
  // below therefore use the nested shape, which is what the validator actually reads.
  it('createParentValidator accepts the wizard payload including child.gender="Male"', async () => {
    const r = await run(createParentValidator, {
      localPart: 'otaona', password: PW, firstName: 'Hulkar', lastName: 'Sobirova',
      phone: '+998901112255',
      child: { firstName: 'Sanjar', lastName: 'Yusupov', gender: 'Male' },
    });
    expect(r.array()).toEqual([]);
  });
});

describe('D-02 — the legacy email shape still works', () => {
  it('createAdminValidator accepts a full email with no localPart', async () => {
    const r = await run(createAdminValidator, {
      email: 'direktor@smm2.uz', firstName: 'Aziz', lastName: 'Karimov', password: PW,
    });
    expect(r.array()).toEqual([]);
  });
});

describe('D-02 — invalid identities are still rejected', () => {
  it('rejects when neither localPart nor email is present', async () => {
    const r = await run(createAdminValidator, { firstName: 'A', lastName: 'B', password: PW });
    expect(r.isEmpty()).toBe(false);
  });

  it('rejects a malformed localPart', async () => {
    const r = await run(createAdminValidator, {
      localPart: 'not a valid local part!', firstName: 'A', lastName: 'B', password: PW,
    });
    expect(r.isEmpty()).toBe(false);
  });

  it('rejects a malformed email when no localPart is given', async () => {
    const r = await run(createReceptionValidator, {
      email: 'nope', password: PW, firstName: 'A', lastName: 'B',
    });
    expect(r.isEmpty()).toBe(false);
  });
});

describe('D-02 — child[gender] mirrors the Child model enum (models/Child.js:32)', () => {
  it.each(['Male', 'Female', 'Other'])('accepts %s', async (g) => {
    const r = await run(createParentValidator, {
      localPart: 'otaona', password: PW, firstName: 'A', lastName: 'B', child: { gender: g },
    });
    expect(r.array()).toEqual([]);
  });

  it('rejects lowercase "male" — the DB enum would reject it too', async () => {
    const r = await run(createParentValidator, {
      localPart: 'otaona', password: PW, firstName: 'A', lastName: 'B', child: { gender: 'male' },
    });
    expect(r.isEmpty()).toBe(false);
  });
});
