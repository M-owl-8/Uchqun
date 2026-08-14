/**
 * D-41 — GET /admin/children/:id
 *
 * The admin child page took the child ONLY from React Router navigation state
 * and never fetched it, so a refresh rendered "Child <uuid>". Adding an endpoint
 * to fix a UI defect adds a new read path to a child's record, so it is tested
 * for what it refuses as much as for what it returns: the child-scoped access
 * pattern is mandatory (CLAUDE.md), and a role check alone is not tenant
 * isolation.
 */
import { jest } from '@jest/globals';

const mockValidateChildAccess = jest.fn();
const mockGroupFindByPk = jest.fn();

jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
  isTeacherAssignedToChild: jest.fn(),
  findChildScopedResource: jest.fn(),
}));
jest.unstable_mockModule('../../models/Group.js', () => ({
  default: { findByPk: mockGroupFindByPk },
}));

const { getChildForAdmin } = await import('../../controllers/childController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const CHILD = {
  id: 'c-1', firstName: 'Zilola', lastName: 'Saidova',
  dateOfBirth: '2018-04-02', gender: 'Female', disabilityType: 'speech',
  specialNeeds: null, photo: null, groupId: 'g-1', parentId: 'p-1', schoolId: 's-1',
};

beforeEach(() => {
  mockValidateChildAccess.mockReset();
  mockGroupFindByPk.mockReset();
});

describe('D-41 — getChildForAdmin', () => {
  it('returns the child for an admin in the same school', async () => {
    mockValidateChildAccess.mockResolvedValue(CHILD);
    mockGroupFindByPk.mockResolvedValue({ id: 'g-1', name: 'Umid guruhi' });
    const req = { params: { id: 'c-1' }, user: { role: 'admin', schoolId: 's-1' } };
    const res = mkRes();

    await getChildForAdmin(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const { data } = res.json.mock.calls[0][0];
    expect(data.firstName).toBe('Zilola');
    expect(data.groupName).toBe('Umid guruhi');
  });

  it('never returns a child validateChildAccess refuses — 404, not the record', async () => {
    // this is the tenant-isolation case: a valid admin, a child in another school
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { params: { id: 'c-other' }, user: { role: 'admin', schoolId: 's-2' } };
    const res = mkRes();

    await getChildForAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false, error: { code: 'CHILD_NOT_ACCESSIBLE' },
    });
    // and nothing about the child leaked into the body
    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/Zilola|Saidova|s-1/);
  });

  it.each(['teacher', 'parent', 'government'])(
    'refuses role %s at the controller, before any lookup',
    async (role) => {
      const req = { params: { id: 'c-1' }, user: { role, schoolId: 's-1' } };
      const res = mkRes();

      await getChildForAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false, error: { code: 'CHILD_READ_FORBIDDEN' },
      });
      // defense in depth means the refusal does not depend on the lookup
      expect(mockValidateChildAccess).not.toHaveBeenCalled();
    }
  );

  it('allows reception, which shares the admin child surface', async () => {
    mockValidateChildAccess.mockResolvedValue(CHILD);
    mockGroupFindByPk.mockResolvedValue(null);
    const req = { params: { id: 'c-1' }, user: { role: 'reception', schoolId: 's-1' } };
    const res = mkRes();

    await getChildForAdmin(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].data.groupName).toBeNull();
  });

  it('returns 500 rather than a 200 with nothing in it when the lookup throws', async () => {
    // L13: a read path that swallows its error and answers 200 is the same class
    // of silent failure as a write path that answers 201 and writes nothing.
    mockValidateChildAccess.mockRejectedValue(new Error('connection terminated'));
    const req = { params: { id: 'c-1' }, user: { role: 'admin', schoolId: 's-1' } };
    const res = mkRes();

    await getChildForAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json.mock.calls[0][0].error.code).toBe('CHILD_READ_FAILED');
  });

  it('does not expose columns the page never asked for', async () => {
    mockValidateChildAccess.mockResolvedValue({
      ...CHILD, medicalDiagnosis: 'CONFIDENTIAL', internalNotes: 'CONFIDENTIAL',
    });
    mockGroupFindByPk.mockResolvedValue({ id: 'g-1', name: 'Umid guruhi' });
    const req = { params: { id: 'c-1' }, user: { role: 'admin', schoolId: 's-1' } };
    const res = mkRes();

    await getChildForAdmin(req, res);

    expect(JSON.stringify(res.json.mock.calls[0][0])).not.toMatch(/CONFIDENTIAL/);
  });
});
