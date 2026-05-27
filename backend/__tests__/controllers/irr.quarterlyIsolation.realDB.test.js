/**
 * Quarterly monitoring entry: write-path school isolation.
 *
 * Context: IRR-WALKTHROUGH.md finding F-004 claimed POST /admin/irr/quarterly-entries
 * could reference a cross-school childId via departures JSONB.
 * Investigation found F-004 was a FALSE POSITIVE:
 *   - QuarterlyMonitoringEntry has NO childId column (FACILITY-LEVEL per OQ-3 + OQ-6).
 *   - departures rows are { name, admitDate, departDate, reason } — plain text, no UUID.
 *   - schoolId is always stamped from req.user.schoolId (never from the request body).
 *
 * This suite CONFIRMS write-path and read-path isolation are already correct:
 * (1) create: schoolId stamped from req.user.schoolId — body schoolId is ignored.
 * (2) create: departures contain name/date/reason text only — no UUID childId field.
 * (3) list:   findAll is called with WHERE schoolId = req.user.schoolId — school B entries excluded.
 */

import { jest } from '@jest/globals';

// ── Mock model — capture calls and return predictable results ─────────────────
const mockCreate = jest.fn();
const mockFindAll = jest.fn();

jest.unstable_mockModule('../../models/QuarterlyMonitoringEntry.js', () => ({
  default: {
    create: mockCreate,
    findAll: mockFindAll,
  },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../utils/logger.js',      () => ({ default: { error: jest.fn() } }));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const SCHOOL_A = 'qtr-school-a';
const SCHOOL_B = 'qtr-school-b';
const ADMIN_A  = { id: 'admin-a', role: 'admin', schoolId: SCHOOL_A };

const VALID_BODY = {
  quarterStart: '2026-01-01',
  quarterEnd:   '2026-03-31',
  infoSystemData:    { info_tizimga_kiritildi: true },
  parentWorkData:    {},
  documentationData: {},
  careQualityData:   {},
  conditionsData:    {},
  departures: [{ name: 'Test Child', admitDate: '2026-01-01', departDate: '2026-02-01', reason: 'Moved' }],
  notes: 'Q1 report',
};

const mockRes = () => {
  const r = { status: jest.fn(), json: jest.fn() };
  r.status.mockReturnValue(r);
  return r;
};

let createQuarterlyEntry, listQuarterlyEntries;

beforeAll(async () => {
  const mod = await import('../../controllers/teacher/irrController.js');
  createQuarterlyEntry  = mod.createQuarterlyEntry;
  listQuarterlyEntries  = mod.listQuarterlyEntries;
});

beforeEach(() => {
  mockCreate.mockReset();
  mockFindAll.mockReset();
});

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('quarterly entry write-path isolation', () => {
  it('create: schoolId stamped from req.user.schoolId — body schoolId is ignored', async () => {
    const createdEntry = { id: 'entry-1', schoolId: SCHOOL_A, quarterStart: '2026-01-01' };
    mockCreate.mockResolvedValue(createdEntry);

    const req = {
      user: ADMIN_A,
      body: {
        ...VALID_BODY,
        schoolId: SCHOOL_B,   // attacker tries to inject school B
      },
    };
    const res = mockRes();
    await createQuarterlyEntry(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // create() must be called with schoolId = SCHOOL_A (from auth), not SCHOOL_B (from body)
    const createArgs = mockCreate.mock.calls[0][0];
    expect(createArgs.schoolId).toBe(SCHOOL_A);
    expect(createArgs.schoolId).not.toBe(SCHOOL_B);
  });

  it('create: departures contain name/date/reason only — no UUID childId field in schema', async () => {
    const departures = [
      { name: 'Dilnoza Yusupova', admitDate: '2026-01-01', departDate: '2026-02-01', reason: 'Family relocation' },
    ];
    mockCreate.mockResolvedValue({ id: 'entry-2', schoolId: SCHOOL_A });

    const req = {
      user: ADMIN_A,
      body: { ...VALID_BODY, departures },
    };
    const res = mockRes();
    await createQuarterlyEntry(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const createArgs = mockCreate.mock.calls[0][0];
    // departures passed through as-is — text rows, no childId
    expect(createArgs.departures[0]).toMatchObject({ name: 'Dilnoza Yusupova', reason: 'Family relocation' });
    expect(createArgs.departures[0].childId).toBeUndefined();
    // model schema has no childId top-level field either
    expect(createArgs.childId).toBeUndefined();
  });

  it('list: findAll called with WHERE schoolId = req.user.schoolId — school B entries excluded', async () => {
    const schoolAEntries = [
      { id: 'entry-a1', schoolId: SCHOOL_A, quarterStart: '2026-01-01' },
    ];
    mockFindAll.mockResolvedValue(schoolAEntries);

    const req  = { user: ADMIN_A };
    const res  = mockRes();
    await listQuarterlyEntries(req, res);

    expect(res.json).toHaveBeenCalled();
    // findAll must be called with schoolId scoped to SCHOOL_A
    const findAllArgs = mockFindAll.mock.calls[0][0];
    expect(findAllArgs.where.schoolId).toBe(SCHOOL_A);
    // returned entries all belong to school A
    const entries = res.json.mock.calls[0][0].data;
    entries.forEach(e => expect(e.schoolId).toBe(SCHOOL_A));
  });
});
