/**
 * CP-022 isolation tests — real SQLite in-memory, two-school two-region seed.
 *
 * LOAD-BEARING TEST SUITE.
 *
 * Proves that:
 *   1. Owner school-axis: admin-A sees owner-level messages from school-A parents ONLY,
 *      not from school-B parents (even though both have recipientLevel='owner').
 *   2. Region scope on getAllMessages: region-A gov sees only messages from region-A
 *      senders when ?level=region is applied (existing School→User→senderId scoping
 *      still holds after migration adds recipientLevel column).
 *   3. getOwnerMessages is not affected by non-owner-level messages in the same table.
 *   4. Regression: getAllMessages with no level param returns all levels (backward-compatible).
 */

import { jest } from '@jest/globals';
import { Sequelize, DataTypes } from 'sequelize';

const sqlite = new Sequelize('sqlite::memory:', { logging: false });

// ── SQLite models (minimal, isolation-critical) ────────────────────────────────

const UserModel = sqlite.define('User', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  schoolId: { type: DataTypes.STRING, allowNull: true },
  role:     { type: DataTypes.STRING, defaultValue: 'parent' },
  firstName: { type: DataTypes.STRING, defaultValue: 'Test' },
  lastName:  { type: DataTypes.STRING, defaultValue: 'User' },
  email:     { type: DataTypes.STRING, defaultValue: 'test@example.com' },
}, { tableName: 'users', timestamps: false });

const SchoolModel = sqlite.define('School', {
  id:       { type: DataTypes.STRING, primaryKey: true },
  regionId: { type: DataTypes.STRING, allowNull: true },
  name:     { type: DataTypes.STRING, defaultValue: 'Test School' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'schools', timestamps: false });

const MsgModel = sqlite.define('GovernmentMessage', {
  id:              { type: DataTypes.STRING, primaryKey: true },
  senderId:        { type: DataTypes.STRING, allowNull: true },
  subject:         { type: DataTypes.STRING, defaultValue: 'Test' },
  message:         { type: DataTypes.STRING, defaultValue: 'Body' },
  recipientLevel:  { type: DataTypes.STRING, defaultValue: 'republic' },
  escalatedFromId: { type: DataTypes.STRING, allowNull: true },
  parentMessageId: { type: DataTypes.STRING, allowNull: true },
  isRead:          { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'government_messages', timestamps: true });

// Self-ref associations for the eager-load in controllers.
MsgModel.hasMany(MsgModel, { as: 'replies', foreignKey: 'parentMessageId' });
MsgModel.belongsTo(MsgModel, { as: 'parent', foreignKey: 'parentMessageId' });
MsgModel.belongsTo(MsgModel, { as: 'escalatedFrom', foreignKey: 'escalatedFromId' });

// Wire User as 'sender' association.
MsgModel.belongsTo(UserModel, { as: 'sender', foreignKey: 'senderId' });
UserModel.hasMany(MsgModel, { as: 'sentMessages', foreignKey: 'senderId' });

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({ default: MsgModel }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: UserModel }));
jest.unstable_mockModule('../../models/School.js', () => ({ default: SchoolModel }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));

const { getOwnerMessages } = await import('../../controllers/admin/adminMessageController.js');
const { getAllMessages } = await import('../../controllers/governmentMessageController.js');

// ── Seed constants ─────────────────────────────────────────────────────────────

const SCHOOL_A = 'school-aaa';
const SCHOOL_B = 'school-bbb';
const REGION_A = 'region-aaa';
const REGION_B = 'region-bbb';

const PARENT_A1 = 'parent-a1';
const PARENT_B1 = 'parent-b1';
const ADMIN_A   = 'admin-a';
const ADMIN_B   = 'admin-b';
const GOV_A     = 'gov-a';
const GOV_B     = 'gov-b';

const MSG_OWNER_A  = 'msg-owner-a';
const MSG_OWNER_B  = 'msg-owner-b';
const MSG_REGION_A = 'msg-region-a';
const MSG_REGION_B = 'msg-region-b';
const MSG_REPUBLIC = 'msg-republic';

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── DB setup ──────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await sqlite.sync({ force: true });

  // Schools in two regions
  await SchoolModel.bulkCreate([
    { id: SCHOOL_A, regionId: REGION_A, name: 'School A' },
    { id: SCHOOL_B, regionId: REGION_B, name: 'School B' },
  ]);

  // Users: parents, admins, gov accounts
  await UserModel.bulkCreate([
    { id: PARENT_A1, schoolId: SCHOOL_A, role: 'parent' },
    { id: PARENT_B1, schoolId: SCHOOL_B, role: 'parent' },
    { id: ADMIN_A,   schoolId: SCHOOL_A, role: 'admin' },
    { id: ADMIN_B,   schoolId: SCHOOL_B, role: 'admin' },
    { id: GOV_A,     schoolId: null,     role: 'government' },
    { id: GOV_B,     schoolId: null,     role: 'government' },
  ]);

  // Messages — one of each type per school + one republic
  await MsgModel.bulkCreate([
    { id: MSG_OWNER_A,  senderId: PARENT_A1, recipientLevel: 'owner',    parentMessageId: null },
    { id: MSG_OWNER_B,  senderId: PARENT_B1, recipientLevel: 'owner',    parentMessageId: null },
    { id: MSG_REGION_A, senderId: PARENT_A1, recipientLevel: 'region',   parentMessageId: null },
    { id: MSG_REGION_B, senderId: PARENT_B1, recipientLevel: 'region',   parentMessageId: null },
    { id: MSG_REPUBLIC, senderId: PARENT_A1, recipientLevel: 'republic', parentMessageId: null },
  ]);
});

afterAll(async () => {
  await sqlite.close();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getOwnerMessages — school-axis isolation', () => {
  it('admin-A sees only owner-level messages from school-A (not school-B)', async () => {
    const req = { user: { id: ADMIN_A, role: 'admin', schoolId: SCHOOL_A } };
    const res = mkRes();
    await getOwnerMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(500);
    const { data } = res.json.mock.calls[0][0];
    const ids = data.map(m => m.id);
    expect(ids).toContain(MSG_OWNER_A);
    expect(ids).not.toContain(MSG_OWNER_B);   // school-B message — must not appear
    expect(ids).not.toContain(MSG_REGION_A);   // wrong recipientLevel
    expect(ids).not.toContain(MSG_REPUBLIC);   // wrong recipientLevel
  });

  it('admin-B sees only owner-level messages from school-B (not school-A)', async () => {
    const req = { user: { id: ADMIN_B, role: 'admin', schoolId: SCHOOL_B } };
    const res = mkRes();
    await getOwnerMessages(req, res);
    const { data } = res.json.mock.calls[0][0];
    const ids = data.map(m => m.id);
    expect(ids).toContain(MSG_OWNER_B);
    expect(ids).not.toContain(MSG_OWNER_A);
  });

  it('400 when admin has no schoolId', async () => {
    const req = { user: { id: 'admin-orphan', role: 'admin', schoolId: null } };
    const res = mkRes();
    await getOwnerMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_NO_SCHOOL');
  });
});

describe('getAllMessages — region scope + level filter (real rows)', () => {
  // Region-A gov: isGlobalAccess=false, regionScope=REGION_A
  const govAReq = (level) => ({
    query: level !== undefined ? { level } : {},
    isGlobalAccess: false,
    regionScope: REGION_A,
    user: { id: GOV_A, role: 'government' },
  });

  // Republic gov: isGlobalAccess=true
  const republicGovReq = (level) => ({
    query: level !== undefined ? { level } : {},
    isGlobalAccess: true,
    regionScope: null,
    user: { id: GOV_B, role: 'government' },
  });

  it('region-A gov with level=region sees only region-A senders (not region-B)', async () => {
    const req = govAReq('region');
    const res = mkRes();
    await getAllMessages(req, res);
    const { data } = res.json.mock.calls[0][0];
    const ids = data.map(m => m.id);
    expect(ids).toContain(MSG_REGION_A);
    expect(ids).not.toContain(MSG_REGION_B); // region-B sender — must not appear
    expect(ids).not.toContain(MSG_OWNER_A);  // wrong recipientLevel
    expect(ids).not.toContain(MSG_REPUBLIC); // wrong recipientLevel
  });

  it('republic gov with level=region sees ALL region-level messages (global access)', async () => {
    const req = republicGovReq('region');
    const res = mkRes();
    await getAllMessages(req, res);
    const { data } = res.json.mock.calls[0][0];
    const ids = data.map(m => m.id);
    expect(ids).toContain(MSG_REGION_A);
    expect(ids).toContain(MSG_REGION_B); // republic-level gov sees all regions
  });

  it('no level param: backward-compatible — returns all levels within region scope', async () => {
    const req = govAReq(undefined);
    const res = mkRes();
    await getAllMessages(req, res);
    const { data } = res.json.mock.calls[0][0];
    const ids = data.map(m => m.id);
    // Region-A gov sees all messages from region-A senders regardless of recipientLevel
    expect(ids).toContain(MSG_OWNER_A);
    expect(ids).toContain(MSG_REGION_A);
    expect(ids).toContain(MSG_REPUBLIC);
    // Region-B sender not visible to region-A gov
    expect(ids).not.toContain(MSG_OWNER_B);
    expect(ids).not.toContain(MSG_REGION_B);
  });
});
