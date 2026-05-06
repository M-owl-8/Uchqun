import { isUUID } from '../../utils/uuidValidator.js';

describe('isUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUUID('00000000-0000-4000-8000-000000000000')).toBe(true);
    expect(isUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true);
  });

  it('rejects UUID v1 (wrong version digit)', () => {
    expect(isUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('rejects malformed UUID', () => {
    expect(isUUID('not-a-uuid')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isUUID('550e8400-e29b-41d4-a716-44665544000Z')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isUUID(null)).toBe(false);
    expect(isUUID(undefined)).toBe(false);
    expect(isUUID(123)).toBe(false);
    expect(isUUID({})).toBe(false);
    expect(isUUID([])).toBe(false);
  });

  it('case insensitive', () => {
    expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isUUID('')).toBe(false);
  });

  it('rejects UUID with wrong variant byte', () => {
    expect(isUUID('550e8400-e29b-41d4-7716-446655440000')).toBe(false);
  });
});
