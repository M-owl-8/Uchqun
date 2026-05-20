import { jest } from '@jest/globals';

const mockObsFindAll = jest.fn();
const mockObsCreate = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockLoggerWarn = jest.fn();

jest.unstable_mockModule('../../models/ChildObservation.js', () => ({
  default: {
    findAll: mockObsFindAll,
    create: mockObsCreate,
  },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: mockLoggerWarn, debug: jest.fn() },
}));
const { create, listRecent, listByChild } = await import('../../controllers/observationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = '2099-01-01';
const VALID_CHILD_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';

const baseReq = () => ({
  user: { id: 'teacher-1', schoolId: 'school-1', role: 'teacher' },
  body: {
    childId: VALID_CHILD_ID,
    observationDate: TODAY,
    domain: 'communication',
    note: 'This is a valid observation note with enough characters.',
    severity: 'routine',
  },
  params: {},
  query: {},
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('observationController — create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 valid payload with childSnapshot populated', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'Aisha', lastName: 'K', schoolId: 'school-1', dateOfBirth: '2020-01-01' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockObsCreate.mockResolvedValue({ id: 'obs-1', ...baseReq().body, childSnapshot: { firstName: 'Aisha', lastName: 'K', schoolId: 'school-1', dateOfBirth: '2020-01-01' } });
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(201);
    const createArg = mockObsCreate.mock.calls[0][0];
    expect(createArg.childSnapshot).toEqual({ firstName: 'Aisha', lastName: 'K', schoolId: 'school-1', dateOfBirth: '2020-01-01' });
  });

  it('404 when child belongs to different school (IDOR guard)', async () => {
    // Revert-test baseline: without validateChildAccess, any childId would be accepted.
    // Pre-fix (validateChildAccess call removed): mockObsCreate would be called → 201.
    // Post-fix (validateChildAccess present): returns null → 404.
    mockValidateChildAccess.mockResolvedValue(null);
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockObsCreate).not.toHaveBeenCalled();
  });

  it('400 OBSERVATION_DATE_IN_FUTURE when date is in the future', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, observationDate: FUTURE } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error.code).toBe('OBSERVATION_DATE_IN_FUTURE');
  });

  it('400 OBSERVATION_NOTE_TOO_SHORT when note < 10 chars', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, note: 'short' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_NOTE_TOO_SHORT');
  });

  it('400 OBSERVATION_NOTE_TOO_LONG when note > 2000 chars', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, note: 'x'.repeat(2001) } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_NOTE_TOO_LONG');
  });

  it('400 OBSERVATION_INVALID_DOMAIN when domain is not recognized', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, domain: 'unknown' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_INVALID_DOMAIN');
  });

  it('400 OBSERVATION_INVALID_SEVERITY when severity is not recognized', async () => {
    const req = { ...baseReq(), body: { ...baseReq().body, severity: 'critical' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_INVALID_SEVERITY');
  });

  it('logger.warn called when severity is urgent', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'A', lastName: 'B', schoolId: 'school-1', dateOfBirth: null };
    mockValidateChildAccess.mockResolvedValue(child);
    mockObsCreate.mockResolvedValue({ id: 'obs-2' });
    const req = { ...baseReq(), body: { ...baseReq().body, severity: 'urgent' } };
    const res = mkRes();
    await create(req, res);
    expect(mockLoggerWarn).toHaveBeenCalledWith('urgent observation recorded', expect.objectContaining({ childId: VALID_CHILD_ID }));
  });

  it('500 when DB throws', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'A', lastName: 'B', schoolId: 'school-1', dateOfBirth: null };
    mockValidateChildAccess.mockResolvedValue(child);
    mockObsCreate.mockRejectedValue(new Error('DB down'));
    const res = mkRes();
    await create(baseReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listRecent ───────────────────────────────────────────────────────────────

describe('observationController — listRecent', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns records within default 7-day window (schoolId scoped)', async () => {
    mockObsFindAll.mockResolvedValue([{ id: 'obs-1' }]);
    const req = { user: { schoolId: 'school-1' }, query: {} };
    const res = mkRes();
    await listRecent(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const call = mockObsFindAll.mock.calls[0][0];
    expect(call.where.schoolId).toBe('school-1');
    expect(call.where.observationDate).toBeDefined();
  });

  it('200 when ?days=30 uses expanded 30-day window', async () => {
    mockObsFindAll.mockResolvedValue([]);
    const req = { user: { schoolId: 'school-1' }, query: { days: '30' } };
    const res = mkRes();
    await listRecent(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(mockObsFindAll).toHaveBeenCalled();
  });

  it('400 OBSERVATION_DAYS_OUT_OF_RANGE when days=0', async () => {
    const req = { user: { schoolId: 'school-1' }, query: { days: '0' } };
    const res = mkRes();
    await listRecent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_DAYS_OUT_OF_RANGE');
    expect(mockObsFindAll).not.toHaveBeenCalled();
  });

  it('400 OBSERVATION_DAYS_OUT_OF_RANGE when days=31', async () => {
    const req = { user: { schoolId: 'school-1' }, query: { days: '31' } };
    const res = mkRes();
    await listRecent(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('OBSERVATION_DAYS_OUT_OF_RANGE');
  });

  it('200 school isolation — where.schoolId scoped to req.user.schoolId', async () => {
    // Revert-test baseline: without schoolId in where, a teacher from school-A would
    // see observations from school-B.
    // Pre-fix (schoolId removed from where): findAll returns all-school records → 200 with data leak.
    // Post-fix (schoolId in where): only own school returned.
    mockObsFindAll.mockResolvedValue([{ id: 'obs-school-1' }]);
    const req = { user: { schoolId: 'school-X' }, query: {} };
    const res = mkRes();
    await listRecent(req, res);
    const call = mockObsFindAll.mock.calls[0][0];
    expect(call.where.schoolId).toBe('school-X');
  });

  it('500 when DB throws', async () => {
    mockObsFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { schoolId: 'school-1' }, query: {} };
    const res = mkRes();
    await listRecent(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listByChild ──────────────────────────────────────────────────────────────

describe('observationController — listByChild', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns observations sorted DESC for valid child', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'child-1', schoolId: 'school-1' });
    mockObsFindAll.mockResolvedValue([{ id: 'obs-new' }, { id: 'obs-old' }]);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'child-1' } };
    const res = mkRes();
    await listByChild(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
    const call = mockObsFindAll.mock.calls[0][0];
    expect(call.order).toEqual([['observationDate', 'DESC']]);
  });

  it('404 when child belongs to different school (IDOR guard)', async () => {
    // Revert-test baseline: without validateChildAccess, any child UUID would return data.
    // Pre-fix (validateChildAccess removed): findAll proceeds → 200 with other-school data.
    // Post-fix: validateChildAccess returns null → 404.
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'other-school-child' } };
    const res = mkRes();
    await listByChild(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockObsFindAll).not.toHaveBeenCalled();
  });

  it('500 when DB throws', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'child-1', schoolId: 'school-1' });
    mockObsFindAll.mockRejectedValue(new Error('DB down'));
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { id: 'child-1' } };
    const res = mkRes();
    await listByChild(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
