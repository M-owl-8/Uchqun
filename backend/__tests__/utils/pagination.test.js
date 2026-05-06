import { parsePagination } from '../../utils/pagination.js';

describe('parsePagination', () => {
  it('default limit=20, offset=0 when query empty', () => {
    expect(parsePagination({})).toEqual({ limit: 20, offset: 0 });
  });

  it('respects custom defaults', () => {
    expect(parsePagination({}, { limit: 50 })).toEqual({ limit: 50, offset: 0 });
  });

  it('caps limit at 100', () => {
    expect(parsePagination({ limit: '500' }).limit).toBe(100);
  });

  it('rejects negative limit (clamps to 1)', () => {
    expect(parsePagination({ limit: '-5' }).limit).toBe(1);
  });

  it('uses page when offset not provided', () => {
    const { offset, limit } = parsePagination({ page: '3', limit: '10' });
    expect(limit).toBe(10);
    expect(offset).toBe(20);
  });

  it('explicit offset wins over page calculation', () => {
    const { offset } = parsePagination({ page: '5', offset: '7', limit: '10' });
    expect(offset).toBe(7);
  });

  it('treats negative offset as 0', () => {
    expect(parsePagination({ offset: '-99' }).offset).toBe(0);
  });

  it('treats non-numeric values as defaults', () => {
    const { limit, offset } = parsePagination({ limit: 'abc', offset: 'xyz' });
    expect(limit).toBe(20);
    expect(offset).toBe(0);
  });
});
