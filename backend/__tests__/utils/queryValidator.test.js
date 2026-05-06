import { parsePositiveInt, parsePage, parseLimit, parseOffset } from '../../utils/queryValidator.js';

describe('parsePositiveInt', () => {
  it('returns parsed positive integer', () => {
    expect(parsePositiveInt('42')).toBe(42);
  });

  it('returns default when value is missing', () => {
    expect(parsePositiveInt(undefined, 7)).toBe(7);
  });

  it('returns default when value is zero or negative', () => {
    expect(parsePositiveInt('0', 7)).toBe(7);
    expect(parsePositiveInt('-3', 7)).toBe(7);
  });

  it('caps at max', () => {
    expect(parsePositiveInt('5000', 20, 100)).toBe(100);
  });

  it('rejects NaN, Infinity, non-numeric strings', () => {
    expect(parsePositiveInt('abc', 9)).toBe(9);
    expect(parsePositiveInt('Infinity', 9)).toBe(9);
    expect(parsePositiveInt(NaN, 9)).toBe(9);
  });
});

describe('parsePage', () => {
  it('defaults to 1 when invalid', () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('abc')).toBe(1);
  });

  it('accepts valid page', () => {
    expect(parsePage('5')).toBe(5);
  });

  it('caps at 10000', () => {
    expect(parsePage('99999')).toBe(10000);
  });
});

describe('parseLimit', () => {
  it('uses 20 as default', () => {
    expect(parseLimit(undefined)).toBe(20);
  });

  it('respects custom default', () => {
    expect(parseLimit(undefined, 50)).toBe(50);
  });

  it('caps at 100', () => {
    expect(parseLimit('500')).toBe(100);
  });
});

describe('parseOffset', () => {
  it('default 0', () => {
    expect(parseOffset(undefined)).toBe(0);
  });

  it('rejects negative', () => {
    expect(parseOffset('-5')).toBe(0);
  });

  it('returns valid offset', () => {
    expect(parseOffset('100')).toBe(100);
  });

  it('rejects NaN', () => {
    expect(parseOffset('abc')).toBe(0);
  });
});
