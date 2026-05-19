import { jest } from '@jest/globals';

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getAIAdvice } = await import('../controllers/teacherAIController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teacherAIController.getAIAdvice', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when message is missing', async () => {
    const req = { body: {}, user: { firstName: 'T', lastName: 'X' }, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when message is empty string', async () => {
    const req = { body: { message: '   ' }, user: { firstName: 'T', lastName: 'X' }, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when message exceeds 2000 characters', async () => {
    const req = { body: { message: 'a'.repeat(2001) }, user: { firstName: 'T', lastName: 'X' }, headers: {} };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns fallback response when no OpenAI key set', async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const req = {
      body: { message: 'How to help a child with autism?' },
      user: { firstName: 'T', lastName: 'X' },
      headers: {},
    };
    const res = mkRes();
    await getAIAdvice(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.fallback).toBe(true);
    expect(payload.success).toBe(true);
    process.env.OPENAI_API_KEY = saved;
  });
});
