import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJobFindOne = jest.fn();
const mockJobUpdate = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../../models/ImportJob.js', () => ({
  default: { findOne: mockJobFindOne },
}));

const mockUserFindAll = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: mockUserFindAll },
}));

const mockChildCreate = jest.fn();
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { create: mockChildCreate },
}));

const mockLogAudit = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CSV = [
  'firstName,lastName,dateOfBirth,gender,disabilityType,class,teacher,parentEmail',
  'Ali,Karimov,2018-03-15,Male,Autism,2A,Teacher One,p1@example.com',
  'Zara,Smith,2019-07-22,Female,Down syndrome,1B,Teacher Two,p2@example.com',
].join('\n');

function makeJob(overrides = {}) {
  return {
    id: 'job-1',
    schoolId: 'school-1',
    status: 'ready',
    validRows: 2,
    invalidRows: 0,
    errors: [],
    rawCsv: VALID_CSV,
    update: mockJobUpdate,
    ...overrides,
  };
}

function makeReq({ params = { id: 'job-1' }, schoolId = 'school-1', userId = 'admin-1', role = 'admin' } = {}) {
  return { params, user: { id: userId, role, schoolId } };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── Import ───────────────────────────────────────────────────────────────────

const { start, getStatus, getErrors, processImport } = await import('../../controllers/admin/adminImportController.js');

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockJobUpdate.mockResolvedValue(true);
  mockUserFindAll.mockResolvedValue([
    { id: 'parent-1', email: 'p1@example.com' },
    { id: 'parent-2', email: 'p2@example.com' },
  ]);
  mockChildCreate.mockResolvedValue({ id: 'child-uuid' });
  mockLogAudit.mockResolvedValue(undefined);
});

// ─── start() ─────────────────────────────────────────────────────────────────

describe('start()', () => {
  test('404 IMPORT_JOB_NOT_FOUND when job does not exist', async () => {
    mockJobFindOne.mockResolvedValueOnce(null);
    const res = makeRes();
    await start(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_NOT_FOUND' } });
  });

  // ─── Revert-test 1: cross-school IDOR ─────────────────────────────────────
  // PRE-FIX (schoolId check removed from start()):
  //   job.schoolId='school-2', req.user.schoolId='school-1'
  //   → start() proceeds past IDOR check; importJob.update({status:'importing'}) called
  //   × expect(res.status).toHaveBeenCalledWith(403) → received 202
  // POST-FIX: schoolId mismatch → 403 IMPORT_JOB_FORBIDDEN
  test('403 IMPORT_JOB_FORBIDDEN when job belongs to different school', async () => {
    mockJobFindOne.mockResolvedValueOnce(makeJob({ schoolId: 'school-other' }));
    const res = makeRes();
    await start(makeReq({ schoolId: 'school-1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_FORBIDDEN' } });
    expect(mockJobUpdate).not.toHaveBeenCalled();
  });

  test('409 IMPORT_JOB_NOT_READY when status is importing', async () => {
    mockJobFindOne.mockResolvedValueOnce(makeJob({ status: 'importing' }));
    const res = makeRes();
    await start(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_NOT_READY' } });
  });

  test('409 IMPORT_JOB_NOT_READY when status is completed', async () => {
    mockJobFindOne.mockResolvedValueOnce(makeJob({ status: 'completed' }));
    const res = makeRes();
    await start(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_NOT_READY' } });
  });

  test('422 IMPORT_NO_VALID_ROWS when validRows=0', async () => {
    mockJobFindOne.mockResolvedValueOnce(makeJob({ validRows: 0 }));
    const res = makeRes();
    await start(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_NO_VALID_ROWS' } });
  });

  test('202 success — importJob.update called with status=importing', async () => {
    const job = makeJob();
    mockJobFindOne.mockResolvedValueOnce(job);
    const originalSetImmediate = global.setImmediate;
    global.setImmediate = jest.fn(); // prevent processImport from running
    const res = makeRes();
    await start(makeReq(), res);
    global.setImmediate = originalSetImmediate;
    expect(job.update).toHaveBeenCalledWith({ status: 'importing' });
  });

  test('202 success — response shape contains importJobId and status=importing', async () => {
    mockJobFindOne.mockResolvedValueOnce(makeJob());
    const originalSetImmediate = global.setImmediate;
    global.setImmediate = jest.fn();
    const res = makeRes();
    await start(makeReq(), res);
    global.setImmediate = originalSetImmediate;
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { importJobId: 'job-1', status: 'importing' },
    });
  });

  test('500 IMPORT_START_FAILED on ImportJob.findOne error', async () => {
    mockJobFindOne.mockRejectedValueOnce(new Error('DB down'));
    const res = makeRes();
    await start(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_START_FAILED' } });
  });
});

// ─── processImport() ─────────────────────────────────────────────────────────

describe('processImport()', () => {
  const actor = { id: 'admin-1', role: 'admin' };

  test('creates Child for each valid row in rawCsv', async () => {
    const job = makeJob();
    await processImport(job, actor);
    expect(mockChildCreate).toHaveBeenCalledTimes(2);
    const firstCall = mockChildCreate.mock.calls[0][0];
    expect(firstCall.firstName).toBe('Ali');
    expect(firstCall.schoolId).toBe('school-1');
    expect(firstCall.parentId).toBe('parent-1');
  });

  // ─── Revert-test 2: audit_log integration ─────────────────────────────────
  // PRE-FIX (logAudit call removed from processImport):
  //   After running processImport with 2 valid rows:
  //   × expect(mockLogAudit).toHaveBeenCalledTimes(2) → received 0 calls
  //   Both children created, but no audit trail
  // POST-FIX: logAudit called once per created child with action='bulk_import'
  test('calls logAudit once per successfully created child', async () => {
    const job = makeJob();
    await processImport(job, actor);
    expect(mockLogAudit).toHaveBeenCalledTimes(2);
    const firstAudit = mockLogAudit.mock.calls[0][0];
    expect(firstAudit.action).toBe('bulk_import');
    expect(firstAudit.entity).toBe('children');
    expect(firstAudit.actorId).toBe('admin-1');
    expect(firstAudit.actorRole).toBe('admin');
    expect(firstAudit.meta.importJobId).toBe('job-1');
  });

  test('per-row atomicity — row 2 failing does not prevent row 1 or row 3 from being created', async () => {
    const threRowCsv = [
      'firstName,lastName,dateOfBirth,gender,disabilityType,class,teacher,parentEmail',
      'Ali,Karimov,2018-03-15,Male,Autism,2A,Teacher One,p1@example.com',
      'Bad,Row,2019-07-22,Female,Down syndrome,1B,Teacher Two,p2@example.com',
      'Zara,Smith,2020-01-10,Female,Hearing loss,2B,Teacher Three,p1@example.com',
    ].join('\n');
    mockChildCreate
      .mockResolvedValueOnce({ id: 'child-1' })
      .mockRejectedValueOnce(new Error('constraint violation'))
      .mockResolvedValueOnce({ id: 'child-3' });

    const job = makeJob({ rawCsv: threRowCsv, validRows: 3, errors: [] });
    await processImport(job, actor);

    // Rows 1 and 3 created; row 2 failed
    expect(mockChildCreate).toHaveBeenCalledTimes(3);
    expect(mockLogAudit).toHaveBeenCalledTimes(2); // audit only for successful rows

    const updateCall = mockJobUpdate.mock.calls[0][0];
    expect(updateCall.status).toBe('completed');
    expect(updateCall.errors.some((e) => e.code === 'IMPORT_ROW_CREATE_FAILED')).toBe(true);
  });

  test('updates importJob status to completed after all rows processed', async () => {
    const job = makeJob();
    await processImport(job, actor);
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    );
  });

  test('updates importJob status to failed on fatal error (malformed rawCsv)', async () => {
    const job = makeJob({ rawCsv: '"unclosed quote field\n' });
    await processImport(job, actor);
    expect(mockJobUpdate).toHaveBeenCalledWith({ status: 'failed' });
    expect(mockChildCreate).not.toHaveBeenCalled();
  });

  test('skips rows listed in importJob.errors (known-invalid rows from T1-7a)', async () => {
    // Row 2 was marked invalid at T1-7a time (e.g., IMPORT_ROW_GENDER_INVALID)
    const job = makeJob({
      validRows: 1,
      invalidRows: 1,
      errors: [{ row: 2, field: 'gender', code: 'IMPORT_ROW_GENDER_INVALID' }],
    });
    await processImport(job, actor);
    // Only row 3 (second data row) should be created — row 2 is skipped
    expect(mockChildCreate).toHaveBeenCalledTimes(1);
    const createArg = mockChildCreate.mock.calls[0][0];
    expect(createArg.firstName).toBe('Zara'); // row 3 (second data row in VALID_CSV)
  });
});

// ─── getStatus() ─────────────────────────────────────────────────────────────

describe('getStatus()', () => {
  test('404 IMPORT_JOB_NOT_FOUND when job does not exist', async () => {
    mockJobFindOne.mockResolvedValueOnce(null);
    const res = makeRes();
    await getStatus(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_NOT_FOUND' } });
  });

  test('403 IMPORT_JOB_FORBIDDEN for cross-school access', async () => {
    mockJobFindOne.mockResolvedValueOnce({ id: 'job-1', schoolId: 'school-other' });
    const res = makeRes();
    await getStatus(makeReq({ schoolId: 'school-1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_JOB_FORBIDDEN' } });
  });

  test('200 returns job status, filename, totalRows, validRows, invalidRows', async () => {
    const jobData = {
      id: 'job-1', schoolId: 'school-1', filename: 'kids.csv',
      status: 'importing', totalRows: 10, validRows: 8, invalidRows: 2,
    };
    mockJobFindOne.mockResolvedValueOnce(jobData);
    const res = makeRes();
    await getStatus(makeReq(), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: jobData });
  });

  test('500 IMPORT_STATUS_FAILED on DB error', async () => {
    mockJobFindOne.mockRejectedValueOnce(new Error('DB down'));
    const res = makeRes();
    await getStatus(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_STATUS_FAILED' } });
  });
});

// ─── getErrors() ─────────────────────────────────────────────────────────────

describe('getErrors()', () => {
  test('200 returns errors array from importJob', async () => {
    const errs = [{ row: 2, field: 'firstName', code: 'IMPORT_ROW_FIRST_NAME_REQUIRED' }];
    mockJobFindOne.mockResolvedValueOnce({ id: 'job-1', schoolId: 'school-1', errors: errs });
    const res = makeRes();
    await getErrors(makeReq(), res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { importJobId: 'job-1', errors: errs },
    });
  });

  test('403 IMPORT_JOB_FORBIDDEN for cross-school access on errors endpoint', async () => {
    mockJobFindOne.mockResolvedValueOnce({ id: 'job-1', schoolId: 'school-other', errors: [] });
    const res = makeRes();
    await getErrors(makeReq({ schoolId: 'school-1' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
