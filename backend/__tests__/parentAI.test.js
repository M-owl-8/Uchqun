import { jest } from '@jest/globals';

const mockChildFindAll = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getAIAdvice } = await import('../controllers/parent/parentAIController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentAIController.getAIAdvice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  it('400 when message missing', async () => {
    const req = { user: { id: 'p1', firstName: 'A', lastName: 'B' }, body: {}, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when message blank/whitespace', async () => {
    const req = { user: { id: 'p1', firstName: 'A', lastName: 'B' }, body: { message: '   ' }, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when message is not a string', async () => {
    const req = { user: { id: 'p1', firstName: 'A', lastName: 'B' }, body: { message: 42 }, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns fallback response when OpenAI key not set', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = {
      user: { id: 'p1', firstName: 'A', lastName: 'B' },
      body: { message: 'How do I care for my child at home?' },
      headers: {},
    };
    const res = mkRes();
    await getAIAdvice(req, res);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data.response).toBeDefined();
    expect(payload.data.message).toBe('How do I care for my child at home?');
  });

  it('uses parent children for context (limit 1)', async () => {
    mockChildFindAll.mockResolvedValue([
      { firstName: 'Kid', lastName: 'Smith', dateOfBirth: '2020-01-01', gender: 'M', disabilityType: 'autism', specialNeeds: '' },
    ]);
    const req = {
      user: { id: 'p1', firstName: 'A', lastName: 'B' },
      body: { message: 'Help with nutrition' },
      headers: {},
    };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { parentId: 'p1' },
      limit: 1,
    }));
  });
});
