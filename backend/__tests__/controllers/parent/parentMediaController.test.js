import { jest } from '@jest/globals';

const mockGetParentGroupId = jest.fn();
const mockMediaFindOne = jest.fn();
const mockMediaFindAndCountAll = jest.fn();
const mockChildModel = {};

jest.unstable_mockModule('../../../utils/parentDataSource.js', () => ({
  getParentGroupId: mockGetParentGroupId,
}));
jest.unstable_mockModule('../../../models/Media.js', () => ({
  default: {
    findOne: mockMediaFindOne,
    findAndCountAll: mockMediaFindAndCountAll,
  },
}));
jest.unstable_mockModule('../../../models/Child.js', () => ({
  default: mockChildModel,
}));
jest.unstable_mockModule('../../../models/ParentMedia.js', () => ({
  default: {
    findOne: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
  },
}));
jest.unstable_mockModule('../../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMediaById, getMyMedia } = await import('../../../controllers/parent/parentMediaController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const GROUP_G = 'group-g';
const PARENT_1 = 'parent-1';
const PARENT_2 = 'parent-2';
const MEDIA_1 = 'media-1';

describe('getMediaById — TP-04 revert-test', () => {
  beforeEach(() => jest.clearAllMocks());

  // TP-04 revert-test: Parent P1 requests media M1 whose child C2 belongs to P2.
  // Both parents share group G. Without parentId filter: groupId match → media returned (200).
  // With parentId filter:  parentId: P1 + groupId: G → no match for C2 → 404.
  // FAILS pre-fix (returns 200), PASSES post-fix (returns 404).
  it('404 (TP-04) media belongs to group-mate child, not this parent\'s child', async () => {
    mockGetParentGroupId.mockResolvedValue(GROUP_G);
    // No parentId filter → simulates the buggy code returning media via groupId alone.
    // With the fix, Media.findOne includes { parentId: PARENT_1 } → null → 404.
    mockMediaFindOne.mockResolvedValue(null);

    const req = {
      user: { id: PARENT_1, role: 'parent' },
      params: { id: MEDIA_1 },
    };
    const res = mkRes();
    await getMediaById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // Confirm the fix passes parentId to Child include (mock call inspection).
  it('passes parentId: req.user.id in Child include where clause', async () => {
    mockGetParentGroupId.mockResolvedValue(GROUP_G);
    mockMediaFindOne.mockResolvedValue(null);
    const req = { user: { id: PARENT_1, role: 'parent' }, params: { id: MEDIA_1 } };
    const res = mkRes();
    await getMediaById(req, res);
    expect(mockMediaFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            where: expect.objectContaining({ groupId: GROUP_G, parentId: PARENT_1 }),
          }),
        ]),
      })
    );
  });

  // Sanity: own child's media returns 200.
  it('200 returns media when child belongs to this parent', async () => {
    mockGetParentGroupId.mockResolvedValue(GROUP_G);
    const fakeMedia = { id: MEDIA_1, toJSON: () => ({ id: MEDIA_1 }) };
    mockMediaFindOne.mockResolvedValue(fakeMedia);
    const req = { user: { id: PARENT_1, role: 'parent' }, params: { id: MEDIA_1 } };
    const res = mkRes();
    await getMediaById(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('getMyMedia — TP-04 revert-test (list endpoint)', () => {
  beforeEach(() => jest.clearAllMocks());

  // TP-04 revert-test (list): group path must include parentId in Child where.
  // FAILS pre-fix (no parentId in include), PASSES post-fix.
  it('passes parentId: req.user.id in Child include where clause for list', async () => {
    mockGetParentGroupId.mockResolvedValue(GROUP_G);
    mockMediaFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const req = {
      user: { id: PARENT_2, role: 'parent' },
      query: {},
    };
    const res = mkRes();
    await getMyMedia(req, res);
    expect(mockMediaFindAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.arrayContaining([
          expect.objectContaining({
            where: expect.objectContaining({ groupId: GROUP_G, parentId: PARENT_2 }),
          }),
        ]),
      })
    );
  });
});
