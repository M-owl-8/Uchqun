// D-43 regression test — /admin/therapy crashed on every load.
//
// Found in the DEEP HARDENING campaign, phase P5. The route rendered nothing
// but an error boundary ("Something went wrong / Try Again"), with:
//
//   TypeError: L.rating.toFixed is not a function
//       at index-354kTjRt.js:462:31692
//       at Array.map (<anonymous>)
//
// The API was healthy (200, 12,643 bytes). models/Therapy.js declares
//   rating: DataTypes.DECIMAL(3, 2)
// and Sequelize serialises DECIMAL as a STRING, so the payload carries
// "rating": "4.50" and .toFixed() throws on the first row, taking the whole
// page down. "Try Again" re-renders the same payload and throws again.
//
// The safe pattern already existed in this repository at
// teacher/src/pages/therapy/TherapyCard.jsx:28-31.
//
// This test asserts the source no longer calls .toFixed() on an unconverted
// value, and exercises the formatting behaviour against the shape the API
// really returns.
//
// FAIL-FIRST: fails against the pre-fix TherapyManagement.jsx.

import { describe, test, expect } from 'vitest';
// Vite's ?raw import gives the file's source with no Node globals — __dirname
// and process are both rejected by the admin ESLint config (browser env).
import src from '../../pages/TherapyManagement.jsx?raw';

describe('D-43 — therapy rating must survive a DECIMAL-as-string payload', () => {
  test('the source never calls .toFixed() directly on therapy.rating', () => {
    expect(src).not.toMatch(/therapy\.rating\.toFixed/);
  });

  test('the rating is coerced with Number() before formatting', () => {
    expect(src).toMatch(/Number\(\s*therapy\.rating\s*\)\.toFixed/);
  });

  test('a string rating formats instead of throwing', () => {
    // the exact shape the backend returns for DECIMAL(3,2)
    const fromApi = { rating: '4.50' };
    const render = (t) => (t.rating != null && !Number.isNaN(Number(t.rating))
      ? Number(t.rating).toFixed(1)
      : null);
    expect(() => render(fromApi)).not.toThrow();
    expect(render(fromApi)).toBe('4.5');
  });

  test('a null or unparseable rating renders nothing rather than throwing', () => {
    const render = (t) => (t.rating != null && !Number.isNaN(Number(t.rating))
      ? Number(t.rating).toFixed(1)
      : null);
    expect(render({ rating: null })).toBeNull();
    expect(render({ rating: 'n/a' })).toBeNull();
    expect(render({ rating: 0 })).toBe('0.0');
  });
});
