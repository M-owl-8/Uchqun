import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOrCreate = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/ServicePlan.js', () => ({
  default: { findAll: mockFindAll, findOrCreate: mockFindOrCreate },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getServicePlans, upsertServicePlan } = await import('../controllers/servicePlanController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('servicePlanController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getServicePlans', () => {
    it('400 when childId missing', async () => {
      const req = { query: {} };
      const res = mkRes();
      await getServicePlans(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns all 8 service types (fills defaults for missing)', async () => {
      mockFindAll.mockResolvedValue([
        { serviceType: 'logoped', months: { jan: true } },
      ]);
      const req = { query: { childId: 'c1', year: '2026' } };
      const res = mkRes();
      await getServicePlans(req, res);
      const data = res.json.mock.calls[0][0].data;
      expect(data.length).toBe(8);
      const types = data.map(p => p.serviceType);
      expect(types).toEqual(expect.arrayContaining([
        'logoped', 'defektolog', 'self_care', 'ipotherapy', 'music', 'labor', 'tmc', 'physiotherapy',
      ]));
    });
  });

  describe('upsertServicePlan', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 't1' }, body: {} };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when serviceType invalid', async () => {
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'invalid', months: {} },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when months invalid (non-boolean)', async () => {
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'logoped', months: { jan: 'yes' } },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when months has unknown key', async () => {
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'logoped', months: { quark: true } },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when child access denied', async () => {
      mockValidateChildAccess.mockResolvedValue(null);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'logoped', months: { jan: true } },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('creates new plan with merged DEFAULT_MONTHS', async () => {
      mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
      mockFindOrCreate.mockResolvedValue([{ id: 'sp1' }, true]);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'logoped', months: { jan: true } },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      const passed = mockFindOrCreate.mock.calls[0][0];
      expect(passed.where).toEqual({ childId: 'c1', year: 2026, serviceType: 'logoped' });
      expect(passed.defaults.months.jan).toBe(true);
      expect(passed.defaults.months.feb).toBe(false);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updates existing plan when found (200)', async () => {
      mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
      const save = jest.fn().mockResolvedValue();
      mockFindOrCreate.mockResolvedValue([{ id: 'sp1', save }, false]);
      const req = {
        user: { id: 't1' },
        body: { childId: 'c1', year: 2026, serviceType: 'logoped', months: { feb: true } },
      };
      const res = mkRes();
      await upsertServicePlan(req, res);
      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
