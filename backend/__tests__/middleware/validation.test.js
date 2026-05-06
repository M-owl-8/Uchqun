import { jest } from '@jest/globals';

const mockValidationResult = jest.fn();
jest.unstable_mockModule('express-validator', () => ({
  validationResult: mockValidationResult,
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { handleValidationErrors } = await import('../../middleware/validation.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('handleValidationErrors', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes through when no errors', () => {
    mockValidationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    const next = jest.fn();
    const req = { path: '/x', method: 'POST' };
    handleValidationErrors(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('400 with field/message details when validation fails', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'email', msg: 'invalid' }, { param: 'name', msg: 'required' }],
    });
    const next = jest.fn();
    const res = mkRes();
    handleValidationErrors({ path: '/x', method: 'POST' }, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).toBe('Validation failed');
    expect(payload.details).toEqual([
      { field: 'email', message: 'invalid' },
      { field: 'name', message: 'required' },
    ]);
  });

  it('does NOT include the user-submitted value in error response', () => {
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ path: 'password', msg: 'too short', value: 'secret123' }],
    });
    const res = mkRes();
    handleValidationErrors({ path: '/x', method: 'POST' }, res, jest.fn());
    const payload = res.json.mock.calls[0][0];
    expect(JSON.stringify(payload)).not.toContain('secret123');
  });
});
