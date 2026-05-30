/**
 * groupController — reception cross-school IDOR revert-test (real SQLite)
 *
 * BRK-002 verification: PUT /groups/:id is accessible to reception role via
 * requireRole('reception') in groupRoutes.js. This suite proves the controller's
 * school-scope guard (updateGroup line 181: !group.schoolId || group.schoolId !==
 * req.user.schoolId → 403) executes against real DB data — not a stub.
 *
 * Without this test, the mock-based group.test.js verifies the guard exists but
 * not that it fires correctly on actual query results.
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

const GroupModel = sqlite.define('Group', {
  id:          { type: DataTypes.STRING, primaryKey: true },
  name:        { type: DataTypes.STRING, defaultValue: 'Group' },
  schoolId:    { type: DataTypes.STRING, allowNull: true },
  teacherId:   { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.STRING, allowNull: true },
  capacity:    { type: DataTypes.INTEGER, defaultValue: 20 },
  ageRange:    { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'groups', timestamps: false });

// User model is only queried when teacherId changes — not needed in these tests
jest.unstable_mockModule('../../models/Group.js', () => ({ default: GroupModel }));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/School.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { updateGroup } = await import('../../controllers/groupController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Seed two schools' groups before tests
beforeAll(async () => {
  await sqlite.sync({ force: true });
  await GroupModel.bulkCreate([
    { id: 'grp-a1', name: 'Alpha Group', schoolId: 'school-A', teacherId: 'teacher-1' },
    { id: 'grp-b1', name: 'Beta Group',  schoolId: 'school-B', teacherId: 'teacher-2' },
  ]);
});

afterAll(() => sqlite.close());

describe('updateGroup — reception cross-school isolation (BRK-002 real-DB)', () => {
  it('reception from school-A blocked from updating school-B group → 403', async () => {
    const req = {
      user: { id: 'rec-a', role: 'reception', schoolId: 'school-A' },
      params: { id: 'grp-b1' },
      body: { name: 'Renamed' },
    };
    const res = mkRes();
    await updateGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'grp-b1', name: 'Renamed' }));
    // DB record must be unchanged
    const unchanged = await GroupModel.findByPk('grp-b1');
    expect(unchanged.name).toBe('Beta Group');
  });

  it('reception from school-A allowed to update own school group → 200', async () => {
    const req = {
      user: { id: 'rec-a', role: 'reception', schoolId: 'school-A' },
      params: { id: 'grp-a1' },
      body: { name: 'Alpha Renamed', capacity: 25 },
    };
    const res = mkRes();
    await updateGroup(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.status).not.toHaveBeenCalledWith(404);
    // DB record must reflect the update
    const updated = await GroupModel.findByPk('grp-a1');
    expect(updated.name).toBe('Alpha Renamed');
    expect(updated.capacity).toBe(25);
  });

  it('group with null schoolId blocked even if user has a schoolId → 403', async () => {
    await GroupModel.create({ id: 'grp-null', name: 'Null School Group', schoolId: null });
    const req = {
      user: { id: 'rec-a', role: 'reception', schoolId: 'school-A' },
      params: { id: 'grp-null' },
      body: { name: 'Hijacked' },
    };
    const res = mkRes();
    await updateGroup(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    const unchanged = await GroupModel.findByPk('grp-null');
    expect(unchanged.name).toBe('Null School Group');
  });
});
