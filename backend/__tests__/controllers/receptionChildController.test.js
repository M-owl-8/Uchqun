/**
 * Reception child endpoint tests — U-1 (RE-10 + RE-11)
 *
 * Revert-test pairs prove the cross-school IDOR existed and is now closed:
 *   [REVERT-TEST update] null-schoolId child → 403 for cross-school reception
 *   [REVERT-TEST delete] null-schoolId child → 403 for cross-school reception
 *   [REVERT-TEST create] child creation now sets schoolId from reception's schoolId
 */
import { jest } from '@jest/globals';

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';
const PARENT_ID = 'pppp0000-0000-0000-0000-000000000001';
const CHILD_ID = 'cccc0000-0000-0000-0000-000000000001';

const mockChildFindByPk = jest.fn();
const mockChildCreate = jest.fn();
const mockChildUpdate = jest.fn();
const mockChildDestroy = jest.fn();
const mockUserFindOne = jest.fn();
const mockTherapyDestroy = jest.fn();
const mockActivityDestroy = jest.fn();
const mockMediaDestroy = jest.fn();
const mockMealDestroy = jest.fn();
const mockProgressDestroy = jest.fn();
const mockSequelizeTransaction = jest.fn();

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: {
    findByPk: mockChildFindByPk,
    create: mockChildCreate,
  },
}));

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: mockUserFindOne,
    findByPk: jest.fn(),
  },
}));

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: jest.fn(), findByPk: jest.fn() },
}));

jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findByPk: jest.fn() },
}));

jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({
  default: { destroy: mockTherapyDestroy },
}));

jest.unstable_mockModule('../../models/Activity.js', () => ({
  default: { destroy: mockActivityDestroy },
}));

jest.unstable_mockModule('../../models/Media.js', () => ({
  default: { destroy: mockMediaDestroy },
}));

jest.unstable_mockModule('../../models/Meal.js', () => ({
  default: { destroy: mockMealDestroy },
}));

jest.unstable_mockModule('../../models/Progress.js', () => ({
  default: { destroy: mockProgressDestroy },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));

jest.unstable_mockModule('../../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
}));

jest.unstable_mockModule('../../config/database.js', () => ({
  default: {
    transaction: mockSequelizeTransaction.mockImplementation(async (fn) => fn({ /* t */ })),
  },
}));
jest.unstable_mockModule('../../utils/accountDomain.js', () => ({
  resolveEmailDomain: jest.fn().mockResolvedValue('test.uz'),
  isValidLocalPart: jest.fn().mockReturnValue(true),
  REPUBLIC_DOMAIN: 'davlat.uz',
}));

const { updateChildForReception, deleteChildForReception, createChildForParent } =
  await import('../../controllers/receptionParentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const receptionReq = (schoolId, params = {}, body = {}, files = null) => ({
  user: { id: 'r-1', role: 'reception', schoolId },
  params,
  body,
  files,
});

const makeChild = (schoolId) => ({
  id: CHILD_ID,
  parentId: PARENT_ID,
  schoolId,
  photo: null,
  parent: { id: PARENT_ID, createdBy: 'r-1' },
  update: mockChildUpdate.mockResolvedValue(true),
  destroy: mockChildDestroy.mockResolvedValue(true),
  toJSON: function () { return { id: this.id, schoolId: this.schoolId }; },
});

beforeEach(() => jest.clearAllMocks());

// ─── UPDATE ──────────────────────────────────────────────────────────────────

describe('updateChildForReception', () => {
  it('[REVERT-TEST update] null-schoolId child returns 403 for cross-school reception', async () => {
    // Pre-fix: `if (child.schoolId && child.schoolId !== req.user.schoolId)`
    // When child.schoolId === null: null && ... = false → guard skipped → 200 returned
    // Post-fix: `if (!child.schoolId || child.schoolId !== req.user.schoolId)`
    // When child.schoolId === null: !null = true → 403 returned (IDOR closed)
    mockChildFindByPk.mockResolvedValue(makeChild(null));

    const req = receptionReq(SCHOOL_B, { id: CHILD_ID }, {
      'child[firstName]': 'Ali',
      'child[lastName]': 'Valiyev',
      'child[dateOfBirth]': '2020-01-01',
      'child[gender]': 'Male',
      'child[disabilityType]': 'autism',
    });
    const res = mkRes();

    await updateChildForReception(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockChildUpdate).not.toHaveBeenCalled();
  });

  it('update: own-school child with correct schoolId succeeds', async () => {
    const child = makeChild(SCHOOL_A);
    child.firstName = 'Ali';
    child.lastName = 'Valiyev';
    child.dateOfBirth = '2020-01-01';
    child.gender = 'Male';
    child.disabilityType = 'autism';
    child.medicalDiagnosis = null;
    child.specialNeeds = null;
    mockChildFindByPk.mockResolvedValue(child);

    const req = receptionReq(SCHOOL_A, { id: CHILD_ID }, {
      'child[firstName]': 'Ali',
      'child[lastName]': 'Valiyev',
      'child[dateOfBirth]': '2020-01-01',
      'child[gender]': 'Male',
      'child[disabilityType]': 'autism',
    });
    const res = mkRes();

    await updateChildForReception(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockChildUpdate).toHaveBeenCalled();
  });

  it('update: different non-null schoolId returns 403', async () => {
    mockChildFindByPk.mockResolvedValue(makeChild(SCHOOL_A));

    const req = receptionReq(SCHOOL_B, { id: CHILD_ID }, {
      'child[firstName]': 'Ali',
      'child[lastName]': 'V',
      'child[dateOfBirth]': '2020-01-01',
      'child[gender]': 'Male',
      'child[disabilityType]': 'autism',
    });
    const res = mkRes();

    await updateChildForReception(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

describe('deleteChildForReception', () => {
  it('[REVERT-TEST delete] null-schoolId child returns 403 for cross-school reception', async () => {
    // Same null bypass as update: pre-fix allowed deletion, post-fix blocks it
    mockChildFindByPk.mockResolvedValue(makeChild(null));

    const req = receptionReq(SCHOOL_B, { id: CHILD_ID });
    const res = mkRes();

    await deleteChildForReception(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockChildDestroy).not.toHaveBeenCalled();
  });

  it('delete: own-school child succeeds', async () => {
    mockChildFindByPk.mockResolvedValue(makeChild(SCHOOL_A));
    mockTherapyDestroy.mockResolvedValue(0);
    mockActivityDestroy.mockResolvedValue(0);
    mockMediaDestroy.mockResolvedValue(0);
    mockMealDestroy.mockResolvedValue(0);
    mockProgressDestroy.mockResolvedValue(0);

    const req = receptionReq(SCHOOL_A, { id: CHILD_ID });
    const res = mkRes();

    await deleteChildForReception(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockChildDestroy).toHaveBeenCalled();
  });
});

// ─── CREATE ──────────────────────────────────────────────────────────────────

describe('createChildForParent', () => {
  it('[REVERT-TEST create] child is created with req.user.schoolId, not null', async () => {
    // Pre-fix: schoolId derived from req.body.school (not sent by UI) → null
    // Post-fix: schoolId = req.user.schoolId → SCHOOL_A
    mockUserFindOne.mockResolvedValue({ id: PARENT_ID, schoolId: SCHOOL_A });
    const createdChild = { id: CHILD_ID, schoolId: SCHOOL_A, toJSON: () => ({ id: CHILD_ID, schoolId: SCHOOL_A }) };
    mockChildCreate.mockResolvedValue(createdChild);

    const req = receptionReq(SCHOOL_A, { id: PARENT_ID }, {
      'child[firstName]': 'Jasur',
      'child[lastName]': 'Toshev',
      'child[dateOfBirth]': '2020-06-15',
      'child[gender]': 'Male',
      'child[disabilityType]': 'autism',
      // NOTE: no 'child[school]' field — this is what the UI sends
    });
    const res = mkRes();

    await createChildForParent(req, res);

    expect(mockChildCreate).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: SCHOOL_A }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
