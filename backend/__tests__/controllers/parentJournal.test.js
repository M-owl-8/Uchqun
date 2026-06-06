// PP-JOURNAL-FEATURE — privacy regression for the parent journal read.
//
// Backend: GET /parent/children/:id/journal
// Controller: journalController.getChildJournal
//
// The privacy boundary: parent A passing ?id=<parent B's child id> must be
// rejected at the Child.findOne({where:{id, parentId:req.user.id}}) step,
// and the journal table must NEVER be queried for someone else's records.
// Same fail-closed pattern as PP-ATTENDANCE-SURFACE (S7) and the dashboard
// cards (S10). Catches future refactors that drop the parentId scoping.

import { jest } from '@jest/globals';

const mockChildFindOne = jest.fn();
const mockJournalFindAll = jest.fn();

jest.unstable_mockModule('../../models/Child.js',              () => ({ default: { findOne: mockChildFindOne } }));
jest.unstable_mockModule('../../models/ChildJournalEntry.js',  () => ({ default: { findAll: mockJournalFindAll } }));
jest.unstable_mockModule('../../models/User.js',               () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js',              () => ({ default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.unstable_mockModule('../../utils/schoolValidation.js',    () => ({
  validateChildAccess: jest.fn(),
  isTeacherAssignedToChild: jest.fn(),
}));

const { getChildJournal } = await import('../../controllers/journalController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

describe('getChildJournal — parent privacy boundary', () => {
  beforeEach(() => {
    mockChildFindOne.mockReset();
    mockJournalFindAll.mockReset();
  });

  it('CRITICAL — parent A asking for parent B\'s child gets 404 JOURNAL_NOT_FOUND_FOR_PARENT', async () => {
    mockChildFindOne.mockResolvedValue(null); // parent A doesn't own child-B1
    const req = { user: { id: 'parent-A', role: 'parent' }, params: { id: 'child-B1' } };
    const res = makeRes();
    await getChildJournal(req, res);

    expect(mockChildFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'child-B1', parentId: 'parent-A' },
    }));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'JOURNAL_NOT_FOUND_FOR_PARENT' }),
    }));
    // The journal table must NEVER be queried for someone else's records.
    expect(mockJournalFindAll).not.toHaveBeenCalled();
  });

  it('returns the visible-to-parent entries for the parent\'s own child', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'child-A1', parentId: 'parent-A' });
    mockJournalFindAll.mockResolvedValue([
      {
        id: 'e1', date: '2026-06-05',
        content: 'Bobur today helped his peers tidy up.',
        author: { firstName: 'Zulfiya', lastName: 'Nazarova' },
      },
    ]);
    const req = { user: { id: 'parent-A', role: 'parent' }, params: { id: 'child-A1' } };
    const res = makeRes();
    await getChildJournal(req, res);

    // The query MUST also filter by isVisibleToParent: true (teacher's choice
    // to share). Locking that here prevents a refactor from leaking notes
    // the teacher kept private.
    const where = mockJournalFindAll.mock.calls[0][0].where;
    expect(where.childId).toBe('child-A1');
    expect(where.isVisibleToParent).toBe(true);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: [expect.objectContaining({
        id: 'e1', date: '2026-06-05',
        content: 'Bobur today helped his peers tidy up.',
        teacherFirstName: 'Zulfiya',
        teacherLastName:  'Nazarova',
      })],
    });
  });

  it('returns empty data when the parent\'s child has no entries', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'child-A1', parentId: 'parent-A' });
    mockJournalFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-A', role: 'parent' }, params: { id: 'child-A1' } };
    const res = makeRes();
    await getChildJournal(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('on DB error returns 500 JOURNAL_LIST_FAILED', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'child-A1', parentId: 'parent-A' });
    mockJournalFindAll.mockRejectedValue(new Error('connection lost'));
    const req = { user: { id: 'parent-A', role: 'parent' }, params: { id: 'child-A1' } };
    const res = makeRes();
    await getChildJournal(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'JOURNAL_LIST_FAILED' }),
    }));
  });
});
