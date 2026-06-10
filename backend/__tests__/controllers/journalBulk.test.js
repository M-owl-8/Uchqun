// PP-JOURNAL-BULK — controller test for the bulk-send endpoint.
//
// Covers: validation (no recipients, too many, bad date, missing subject is
// allowed, body length, future date), per-row failure surfacing, and the
// "every recipient failed -> 400" branch.

import { jest } from '@jest/globals';

const mockChildJournalCreate = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockIsTeacherAssignedToChild = jest.fn();
const mockEmitToUser = jest.fn();

jest.unstable_mockModule('../../models/Child.js',         () => ({ default: {} }));
jest.unstable_mockModule('../../models/ChildJournalEntry.js', () => ({ default: { create: mockChildJournalCreate } }));
jest.unstable_mockModule('../../models/User.js',          () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js',         () => ({ default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: mockIsTeacherAssignedToChild,
}));
jest.unstable_mockModule('../../config/socket.js', () => ({ emitToUser: mockEmitToUser }));

const { createBulk } = await import('../../controllers/journalController.js');

const VALID_UUID_A = '00000000-0000-4000-8000-000000000001';
const VALID_UUID_B = '00000000-0000-4000-8000-000000000002';

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const teacherReq = (body) => ({
  user: { id: 't1', role: 'teacher', schoolId: 'school-A' },
  body,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsTeacherAssignedToChild.mockResolvedValue(true);
});

const TODAY = new Date().toISOString().slice(0, 10);
const VALID_BODY = 'Bugun bola juda yaxshi ishladi va birinchi marta mustaqil kiyindi.';

describe('createBulk validation', () => {
  it('400 JOURNAL_BULK_NO_RECIPIENTS when recipientIds is empty', async () => {
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [], date: TODAY, body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_BULK_NO_RECIPIENTS' }),
    }));
    expect(mockChildJournalCreate).not.toHaveBeenCalled();
  });

  it('400 JOURNAL_BULK_NO_RECIPIENTS when recipientIds is not an array', async () => {
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: 'not-array', date: TODAY, body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 JOURNAL_BULK_TOO_MANY_RECIPIENTS for >50 ids', async () => {
    const ids = Array.from({ length: 51 }, () => VALID_UUID_A);
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: ids, date: TODAY, body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_BULK_TOO_MANY_RECIPIENTS' }),
    }));
  });

  it('400 JOURNAL_INVALID_DATE when date format is wrong', async () => {
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [VALID_UUID_A], date: '2026/06/09', body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_INVALID_DATE' }),
    }));
  });

  it('400 JOURNAL_DATE_IN_FUTURE for tomorrow', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000 * 2).toISOString().slice(0, 10);
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [VALID_UUID_A], date: tomorrow, body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_DATE_IN_FUTURE' }),
    }));
  });

  it('400 JOURNAL_SUBJECT_TOO_LONG when subject > 200 chars', async () => {
    const res = mkRes();
    await createBulk(teacherReq({
      recipientIds: [VALID_UUID_A], date: TODAY, body: VALID_BODY,
      subject: 'a'.repeat(201),
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 JOURNAL_CONTENT_TOO_SHORT when body < 10 chars', async () => {
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [VALID_UUID_A], date: TODAY, body: 'short' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_CONTENT_TOO_SHORT' }),
    }));
  });

  it('subject is optional — accepts payload without subject', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: VALID_UUID_A, parentId: 'p1', firstName: 'A', lastName: 'B', schoolId: 'school-A' });
    mockChildJournalCreate.mockResolvedValue({ id: 'entry-1' });
    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [VALID_UUID_A], date: TODAY, body: VALID_BODY }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockChildJournalCreate).toHaveBeenCalledWith(expect.objectContaining({ subject: null }));
  });
});

describe('createBulk happy path', () => {
  it('201 creates one entry per recipient and emits socket events for visible+parent', async () => {
    mockValidateChildAccess
      .mockResolvedValueOnce({ id: VALID_UUID_A, parentId: 'parent-A', firstName: 'A', lastName: 'X', schoolId: 'school-A' })
      .mockResolvedValueOnce({ id: VALID_UUID_B, parentId: 'parent-B', firstName: 'B', lastName: 'Y', schoolId: 'school-A' });
    mockChildJournalCreate
      .mockResolvedValueOnce({ id: 'entry-A' })
      .mockResolvedValueOnce({ id: 'entry-B' });

    const res = mkRes();
    await createBulk(teacherReq({
      recipientIds: [VALID_UUID_A, VALID_UUID_B],
      date: TODAY,
      subject: 'Bugungi kun',
      body: VALID_BODY,
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockChildJournalCreate).toHaveBeenCalledTimes(2);
    expect(mockEmitToUser).toHaveBeenCalledWith('parent-A', 'journal:created', expect.any(Object));
    expect(mockEmitToUser).toHaveBeenCalledWith('parent-B', 'journal:created', expect.any(Object));
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.created).toHaveLength(2);
    expect(payload.data.failed).toHaveLength(0);
  });

  it('isVisibleToParent=false skips the socket emit', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: VALID_UUID_A, parentId: 'parent-A', firstName: 'A', lastName: 'X', schoolId: 'school-A' });
    mockChildJournalCreate.mockResolvedValue({ id: 'entry-A' });

    const res = mkRes();
    await createBulk(teacherReq({
      recipientIds: [VALID_UUID_A], date: TODAY, body: VALID_BODY, isVisibleToParent: false,
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockChildJournalCreate).toHaveBeenCalledWith(expect.objectContaining({ isVisibleToParent: false }));
    expect(mockEmitToUser).not.toHaveBeenCalled();
  });
});

describe('createBulk partial / total failure', () => {
  it('reports per-row failures alongside successes (mixed batch)', async () => {
    // First recipient: not accessible. Second: succeeds.
    mockValidateChildAccess
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: VALID_UUID_B, parentId: 'parent-B', firstName: 'B', lastName: 'Y', schoolId: 'school-A' });
    mockChildJournalCreate.mockResolvedValueOnce({ id: 'entry-B' });

    const res = mkRes();
    await createBulk(teacherReq({
      recipientIds: [VALID_UUID_A, VALID_UUID_B],
      date: TODAY,
      body: VALID_BODY,
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.created).toHaveLength(1);
    expect(payload.data.failed).toEqual([{ childId: VALID_UUID_A, code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' }]);
  });

  it('teacher-assignment denial surfaces as per-row failure', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: VALID_UUID_A, schoolId: 'school-A' });
    mockIsTeacherAssignedToChild.mockResolvedValue(false);

    const res = mkRes();
    await createBulk(teacherReq({ recipientIds: [VALID_UUID_A], date: TODAY, body: VALID_BODY }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error.code).toBe('JOURNAL_BULK_ALL_FAILED');
    expect(payload.data.failed).toEqual([{ childId: VALID_UUID_A, code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' }]);
  });

  it('400 JOURNAL_BULK_ALL_FAILED when every recipient is invalid (no UUID)', async () => {
    const res = mkRes();
    await createBulk(teacherReq({
      recipientIds: ['not-a-uuid'],
      date: TODAY,
      body: VALID_BODY,
    }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'JOURNAL_BULK_ALL_FAILED' }),
    }));
    expect(mockChildJournalCreate).not.toHaveBeenCalled();
  });
});
