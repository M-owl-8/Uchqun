// Regression-lock for the local-time date helpers in shared/utils/formatDate.
//
// Why these tests exist (2026-06-07):
// A parent in Uzbekistan (UTC+5) at 02:30 local time was seeing "yesterday"
// on the dashboard because the platform used `new Date().toISOString().slice(0,10)`
// to derive "today" — that returns UTC. The fix added `todayLocal()` to
// shared/utils/formatDate. These tests lock the contract so a future refactor
// can't reintroduce the UTC pattern silently.

import { describe, it, expect } from 'vitest';
import { todayLocal, isoLocal } from '@shared/utils/formatDate';

describe('todayLocal', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the browser LOCAL date, not UTC (this is the regression we ship for)', () => {
    const now = new Date();
    const expected =
      `${now.getFullYear()}-` +
      `${String(now.getMonth() + 1).padStart(2, '0')}-` +
      `${String(now.getDate()).padStart(2, '0')}`;
    expect(todayLocal()).toBe(expected);
  });
});

describe('isoLocal', () => {
  it('converts a Date object to local YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 8, 10, 30, 0); // June 8, 2026, 10:30 local
    expect(isoLocal(d)).toBe('2026-06-08');
  });

  it('accepts a numeric epoch milliseconds', () => {
    const d = new Date(2026, 5, 8, 10, 30, 0);
    expect(isoLocal(d.getTime())).toBe('2026-06-08');
  });

  it('accepts an ISO string', () => {
    // June 8 at 10:30 in the browser's local timezone, regardless of where the
    // test machine runs. We pass it through a Date object so the local-time
    // semantics are preserved.
    const d = new Date(2026, 5, 8, 10, 30, 0);
    expect(isoLocal(d.toString())).toBe('2026-06-08');
  });

  it('returns empty string for null', () => {
    expect(isoLocal(null)).toBe('');
  });

  it('returns empty string for invalid input', () => {
    expect(isoLocal('not a date')).toBe('');
  });
});
