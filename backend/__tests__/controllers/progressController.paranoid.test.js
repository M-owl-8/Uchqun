import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockProgressFindOne = jest.fn();
const mockProgressCreate = jest.fn();
const mockProgressFindByPk = jest.fn();
const mockProgressUpdate = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../../models/Progress.js', () => ({
  default: {
    findOne: mockProgressFindOne,
    create: mockProgressCreate,
    findByPk: mockProgressFindByPk,
    belongsTo: jest.fn(),
  },
}));

const mockChildFindOne = jest.fn();
const mockChildFindAll = jest.fn();
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: {
    findOne: mockChildFindOne,
    findAll: mockChildFindAll,
    hasOne: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn() },
}));

// ─── Import ───────────────────────────────────────────────────────────────────

const { getProgress, updateProgress } = await import('../../controllers/progressController.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHILD = { id: 'child-1', parentId: 'parent-1' };

function makeReq({ userId = 'parent-1', role = 'parent', query = { childId: 'child-1' }, body = {} } = {}) {
  return { user: { id: userId, role }, query, body };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockChildFindOne.mockResolvedValue(CHILD);
  mockProgressUpdate.mockResolvedValue(true);
});

describe('getProgress() — paranoid behavior', () => {
  test('returns existing progress when Progress.findOne returns a record', async () => {
    const progress = { id: 'prog-1', childId: 'child-1', academic: {}, social: {}, behavioral: {} };
    mockProgressFindOne.mockResolvedValueOnce(progress);
    const res = makeRes();
    await getProgress(makeReq(), res);
    expect(res.json).toHaveBeenCalledWith(progress);
    expect(mockProgressCreate).not.toHaveBeenCalled();
  });

  // Paranoid: with paranoid:true, findOne excludes soft-deleted progress records.
  // The controller then creates a fresh progress — same as if it never existed.
  test('creates new progress when findOne returns null (soft-deleted or never created)', async () => {
    const newProgress = { id: 'prog-new', childId: 'child-1', academic: {}, social: {}, behavioral: {} };
    mockProgressFindOne.mockResolvedValueOnce(null);
    mockProgressCreate.mockResolvedValueOnce(newProgress);
    const res = makeRes();
    await getProgress(makeReq(), res);
    expect(mockProgressCreate).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 'child-1', academic: {}, social: {}, behavioral: {} })
    );
    expect(res.json).toHaveBeenCalledWith(newProgress);
  });
});

describe('updateProgress() — paranoid behavior', () => {
  test('creates progress when findOne returns null (soft-deleted case)', async () => {
    const created = { id: 'prog-new', childId: 'child-1', academic: { score: 5 } };
    mockProgressFindOne.mockResolvedValueOnce(null);
    mockProgressCreate.mockResolvedValueOnce(created);
    mockProgressFindByPk.mockResolvedValueOnce(created);
    const res = makeRes();
    await updateProgress(makeReq({ body: { academic: { score: 5 } } }), res);
    expect(mockProgressCreate).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 'child-1', academic: { score: 5 } })
    );
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test('updates existing progress when findOne returns a record', async () => {
    const existing = { id: 'prog-1', childId: 'child-1', update: mockProgressUpdate };
    const updated = { id: 'prog-1', childId: 'child-1', behavioral: { cooperation: 4 } };
    mockProgressFindOne.mockResolvedValueOnce(existing);
    mockProgressFindByPk.mockResolvedValueOnce(updated);
    const res = makeRes();
    await updateProgress(makeReq({ body: { behavioral: { cooperation: 4 } } }), res);
    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ behavioral: { cooperation: 4 } }));
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});
