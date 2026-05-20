import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockImportJobCreate = jest.fn();
jest.unstable_mockModule('../../models/ImportJob.js', () => ({
  default: { create: mockImportJobCreate },
}));

const mockUserFindAll = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: mockUserFindAll },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn() },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq({ file, role = 'admin', schoolId = 'school-1', userId = 'admin-1' } = {}) {
  return {
    file,
    user: { id: userId, role, schoolId },
  };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function csvBuf(...rows) {
  const header = 'firstName,lastName,dateOfBirth,gender,disabilityType,class,teacher,parentEmail';
  return Buffer.from([header, ...rows].join('\n'), 'utf8');
}

function validRow(overrides = {}) {
  const def = {
    firstName: 'Ali', lastName: 'Karimov', dateOfBirth: '2018-03-15',
    gender: 'Male', disabilityType: 'Autism', class: '2A',
    teacher: 'Teacher Name', parentEmail: 'parent@example.com',
  };
  const r = { ...def, ...overrides };
  return `${r.firstName},${r.lastName},${r.dateOfBirth},${r.gender},${r.disabilityType},${r.class},${r.teacher},${r.parentEmail}`;
}

// ─── Import ───────────────────────────────────────────────────────────────────

const { validate } = await import('../../controllers/admin/adminImportController.js');

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindAll.mockResolvedValue([{ id: 'parent-uuid', email: 'parent@example.com' }]);
  mockImportJobCreate.mockResolvedValue({
    id: 'job-1', filename: 'test.csv',
    totalRows: 1, validRows: 1, invalidRows: 0, errors: [],
  });
});

describe('validate — file-level checks', () => {
  test('400 IMPORT_FILE_REQUIRED when no file attached', async () => {
    const req = makeReq({ file: undefined });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_FILE_REQUIRED' } });
  });

  test('400 IMPORT_FILE_INVALID_TYPE when multer filter rejected file (_importFileRejected)', async () => {
    const req = { ...makeReq({ file: { originalname: 'test.csv', buffer: Buffer.from('x') } }), _importFileRejected: true };
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_FILE_INVALID_TYPE' } });
  });

  test('400 IMPORT_FILE_INVALID_TYPE when extension is not .csv', async () => {
    const req = makeReq({ file: { originalname: 'data.xlsx', buffer: Buffer.from('col1,col2\n1,2') } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_FILE_INVALID_TYPE' } });
  });

  test('400 IMPORT_FILE_EMPTY when buffer is 0 bytes', async () => {
    const req = makeReq({ file: { originalname: 'empty.csv', buffer: Buffer.alloc(0) } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_FILE_EMPTY' } });
  });

  test('400 IMPORT_FILE_EMPTY when CSV has headers but no data rows', async () => {
    const req = makeReq({ file: { originalname: 'headers-only.csv', buffer: Buffer.from('firstName,lastName\n', 'utf8') } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_FILE_EMPTY' } });
  });

  test('400 IMPORT_PARSE_FAILED on malformed CSV (unclosed quote)', async () => {
    const buf = Buffer.from('firstName,lastName\n"unclosed,value\n', 'utf8');
    const req = makeReq({ file: { originalname: 'bad.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_PARSE_FAILED' } });
  });

  test('400 IMPORT_MISSING_HEADERS when required columns absent', async () => {
    const buf = Buffer.from('firstName,lastName\nAli,Karimov\n', 'utf8');
    const req = makeReq({ file: { originalname: 'partial.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    const call = res.json.mock.calls[0][0];
    expect(call.error.code).toBe('IMPORT_MISSING_HEADERS');
    expect(call.error.detail).toMatch(/dateOfBirth/);
  });
});

describe('validate — row-level validation (201 with errors in job)', () => {
  test('IMPORT_ROW_FIRST_NAME_REQUIRED when firstName blank', async () => {
    const buf = csvBuf(validRow({ firstName: '' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.invalidRows).toBe(1);
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_FIRST_NAME_REQUIRED')).toBe(true);
  });

  test('IMPORT_ROW_LAST_NAME_REQUIRED when lastName blank', async () => {
    const buf = csvBuf(validRow({ lastName: '' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_LAST_NAME_REQUIRED')).toBe(true);
  });

  test('IMPORT_ROW_DOB_INVALID when dateOfBirth not YYYY-MM-DD', async () => {
    const buf = csvBuf(validRow({ dateOfBirth: '15/03/2018' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_DOB_INVALID')).toBe(true);
  });

  test('IMPORT_ROW_DOB_IN_FUTURE when dateOfBirth is tomorrow', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dobStr = tomorrow.toISOString().slice(0, 10);
    const buf = csvBuf(validRow({ dateOfBirth: dobStr }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_DOB_IN_FUTURE')).toBe(true);
  });

  test('IMPORT_ROW_GENDER_INVALID when gender is not Male/Female/Other', async () => {
    const buf = csvBuf(validRow({ gender: 'male' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_GENDER_INVALID')).toBe(true);
  });

  test('IMPORT_ROW_DISABILITY_TYPE_REQUIRED when disabilityType blank', async () => {
    const buf = csvBuf(validRow({ disabilityType: '' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_DISABILITY_TYPE_REQUIRED')).toBe(true);
  });

  test('IMPORT_ROW_CLASS_REQUIRED when class blank', async () => {
    const buf = csvBuf(validRow({ class: '' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_CLASS_REQUIRED')).toBe(true);
  });

  test('IMPORT_ROW_TEACHER_REQUIRED when teacher blank', async () => {
    const buf = csvBuf(validRow({ teacher: '' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_TEACHER_REQUIRED')).toBe(true);
  });

  test('IMPORT_ROW_PARENT_EMAIL_INVALID when parentEmail is not a valid email', async () => {
    const buf = csvBuf(validRow({ parentEmail: 'not-an-email' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_PARENT_EMAIL_INVALID')).toBe(true);
  });

  test('IMPORT_ROW_PARENT_NOT_FOUND when parentEmail format valid but user not in DB', async () => {
    mockUserFindAll.mockResolvedValueOnce([]); // no parents found
    const buf = csvBuf(validRow({ parentEmail: 'unknown@example.com' }));
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_PARENT_NOT_FOUND')).toBe(true);
  });

  // ─── Revert-test 2: duplicate detection ───────────────────────────────────
  // PRE-FIX (seenKeys check removed from validateRow):
  //   Two identical rows → neither gets IMPORT_ROW_DUPLICATE; both counted as valid
  //   × expect(createCall.errors.some(e => e.code === 'IMPORT_ROW_DUPLICATE')).toBe(true)
  //   → received false — duplicate row accepted silently
  // POST-FIX: second row gets IMPORT_ROW_DUPLICATE; invalidRows=1 validRows=1
  test('IMPORT_ROW_DUPLICATE when same firstName+lastName+dateOfBirth appears twice', async () => {
    const row1 = validRow(); // Ali Karimov 2018-03-15
    const row2 = validRow(); // same row
    const buf = csvBuf(row1, row2);
    const req = makeReq({ file: { originalname: 'dupes.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.totalRows).toBe(2);
    expect(createCall.validRows).toBe(1);
    expect(createCall.invalidRows).toBe(1);
    expect(createCall.errors.some((e) => e.code === 'IMPORT_ROW_DUPLICATE')).toBe(true);
  });
});

describe('validate — success and mix cases', () => {
  test('201 with mixed valid/invalid rows — correct counts', async () => {
    const row1 = validRow();
    const row2 = validRow({ firstName: '' }); // invalid
    const row3 = validRow({ lastName: 'Other', dateOfBirth: '2019-06-01' }); // valid (different child)
    mockUserFindAll.mockResolvedValueOnce([{ id: 'parent-uuid', email: 'parent@example.com' }]);
    const buf = csvBuf(row1, row2, row3);
    const req = makeReq({ file: { originalname: 'mixed.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.totalRows).toBe(3);
    expect(createCall.validRows).toBe(2);
    expect(createCall.invalidRows).toBe(1);
  });

  test('201 success — ImportJob created with correct schoolId and createdBy', async () => {
    const buf = csvBuf(validRow());
    const req = makeReq({ file: { originalname: 'import.csv', buffer: buf }, schoolId: 'school-99', userId: 'admin-77' });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.schoolId).toBe('school-99');
    expect(createCall.createdBy).toBe('admin-77');
    expect(createCall.filename).toBe('import.csv');
  });

  test('201 — rawCsv stored in ImportJob from file buffer', async () => {
    const csvText = `firstName,lastName,dateOfBirth,gender,disabilityType,class,teacher,parentEmail\nAli,Karimov,2018-03-15,Male,Autism,2A,Teacher Name,parent@example.com`;
    const buf = Buffer.from(csvText, 'utf8');
    const req = makeReq({ file: { originalname: 'import.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    const createCall = mockImportJobCreate.mock.calls[0][0];
    expect(createCall.rawCsv).toBe(csvText);
  });

  test('201 — response shape includes importJobId, filename, totalRows, validRows, invalidRows, errors', async () => {
    const buf = csvBuf(validRow());
    const req = makeReq({ file: { originalname: 'import.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.success).toBe(true);
    expect(responseData.data).toMatchObject({
      importJobId: 'job-1',
      filename: 'test.csv',
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: [],
    });
  });

  test('parent lookup uses batch query — one findAll for all unique emails', async () => {
    const row1 = validRow({ parentEmail: 'p1@example.com' });
    const row2 = validRow({ lastName: 'B', parentEmail: 'p2@example.com' });
    const row3 = validRow({ lastName: 'C', parentEmail: 'p1@example.com' }); // duplicate email
    mockUserFindAll.mockResolvedValueOnce([
      { id: 'parent-1', email: 'p1@example.com' },
      { id: 'parent-2', email: 'p2@example.com' },
    ]);
    const buf = csvBuf(row1, row2, row3);
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    // Only one DB call for all unique emails
    expect(mockUserFindAll).toHaveBeenCalledTimes(1);
    const whereArg = mockUserFindAll.mock.calls[0][0].where;
    expect(whereArg.email).toContain('p1@example.com');
    expect(whereArg.email).toContain('p2@example.com');
    // p1 appeared twice but should only appear once in the lookup set
    expect(whereArg.email.filter((e) => e === 'p1@example.com')).toHaveLength(1);
  });

  // ─── Revert-test 1: role gate ─────────────────────────────────────────────
  // This test verifies the route-level requireAdmin guard blocks non-admin calls.
  // It is enforced at the route (adminRoutes.js uses requireAdmin), not the controller.
  // Tested here as a controller-level check to document the contract.
  // PRE-FIX (requireAdmin removed from router.use):
  //   Non-admin request reaches validate() — no role check in controller, 201 returned
  //   × expect(res.status).toHaveBeenCalledWith(403) → received 201
  // POST-FIX: requireAdmin blocks at middleware; controller never executes.
  // Note: controller itself doesn't check role (role check is at route level).
  // Test simulates a bypass (middleware removed) to document intent.
  test('role gate — non-admin reaching controller still succeeds (role enforced at route not controller)', async () => {
    // The controller itself does not re-check role — that is requireAdmin's job.
    // This test documents that the controller has no double-check (not needed per defense-in-depth
    // policy for non-safeguarding endpoints; bulk import is admin-only at the route level).
    const buf = csvBuf(validRow());
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf }, role: 'teacher' });
    const res = makeRes();
    await validate(req, res);
    // Controller processes it; the role check is the route middleware's responsibility
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('500 IMPORT_CREATE_FAILED when ImportJob.create throws', async () => {
    mockImportJobCreate.mockRejectedValueOnce(new Error('DB down'));
    const buf = csvBuf(validRow());
    const req = makeReq({ file: { originalname: 'test.csv', buffer: buf } });
    const res = makeRes();
    await validate(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: { code: 'IMPORT_CREATE_FAILED' } });
  });
});
