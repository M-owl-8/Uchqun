import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Utility logic used in the government dashboard.
// The government app displays school ratings, overview statistics, and lists of
// schools/teachers/students/parents. Tests cover the helper patterns.
// ---------------------------------------------------------------------------

/**
 * Computes the average of an array of numeric values.
 */
function average(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Maps a level number (0–5) to a CSS color class, as used in the LEVEL_COLORS
 * map in government/src/pages/Dashboard.jsx.
 */
const LEVEL_COLORS = {
  5: 'bg-green-100 text-green-800',
  4: 'bg-blue-100 text-blue-800',
  3: 'bg-yellow-100 text-yellow-800',
  2: 'bg-orange-100 text-orange-800',
  1: 'bg-red-100 text-red-800',
  0: 'bg-gray-100 text-gray-500',
};

function getLevelColor(level) {
  return LEVEL_COLORS[level] ?? LEVEL_COLORS[0];
}

/**
 * Sorts schools by rating descending (used for leaderboard display).
 */
function rankSchools(schools) {
  return [...schools].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
}

/**
 * Finds a school by ID in the schools array.
 */
function findSchoolById(schools, id) {
  return schools.find((s) => s.id === id) ?? null;
}

/**
 * Formats a stat number for display – adds "K" suffix for thousands.
 */
function formatStatNumber(n) {
  if (n === null || n === undefined) return '0';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('average', () => {
  it('returns 0 for an empty array', () => {
    expect(average([])).toBe(0);
    expect(average(null)).toBe(0);
  });

  it('calculates the mean for a uniform array', () => {
    expect(average([5, 5, 5])).toBe(5);
  });

  it('calculates the mean for a mixed array', () => {
    expect(average([1, 2, 3, 4])).toBe(2.5);
  });

  it('handles a single-element array', () => {
    expect(average([7])).toBe(7);
  });
});

describe('getLevelColor', () => {
  it('returns green class for level 5', () => {
    expect(getLevelColor(5)).toContain('green');
  });

  it('returns red class for level 1', () => {
    expect(getLevelColor(1)).toContain('red');
  });

  it('returns gray class for level 0', () => {
    expect(getLevelColor(0)).toContain('gray');
  });

  it('falls back to gray for unknown levels', () => {
    expect(getLevelColor(99)).toContain('gray');
    expect(getLevelColor(undefined)).toContain('gray');
  });
});

describe('rankSchools', () => {
  const schools = [
    { id: 'a', name: 'School A', rating: 3.2 },
    { id: 'b', name: 'School B', rating: 4.8 },
    { id: 'c', name: 'School C', rating: 2.1 },
  ];

  it('places the highest-rated school first', () => {
    const ranked = rankSchools(schools);
    expect(ranked[0].id).toBe('b');
  });

  it('places the lowest-rated school last', () => {
    const ranked = rankSchools(schools);
    expect(ranked[ranked.length - 1].id).toBe('c');
  });

  it('does not mutate the original array', () => {
    const copy = [...schools];
    rankSchools(schools);
    expect(schools).toEqual(copy);
  });

  it('handles schools with null/undefined rating (treated as 0)', () => {
    const withNulls = [
      { id: 'x', rating: null },
      { id: 'y', rating: 5 },
    ];
    const ranked = rankSchools(withNulls);
    expect(ranked[0].id).toBe('y');
  });
});

describe('findSchoolById', () => {
  const schools = [
    { id: 's1', name: 'Alpha' },
    { id: 's2', name: 'Beta' },
  ];

  it('finds the correct school by ID', () => {
    expect(findSchoolById(schools, 's1')?.name).toBe('Alpha');
  });

  it('returns null for a non-existent ID', () => {
    expect(findSchoolById(schools, 's99')).toBeNull();
  });
});

describe('formatStatNumber', () => {
  it('returns "0" for null or undefined', () => {
    expect(formatStatNumber(null)).toBe('0');
    expect(formatStatNumber(undefined)).toBe('0');
  });

  it('returns the number as a string when under 1000', () => {
    expect(formatStatNumber(500)).toBe('500');
    expect(formatStatNumber(0)).toBe('0');
  });

  it('appends K for thousands', () => {
    expect(formatStatNumber(1000)).toBe('1K');
    expect(formatStatNumber(1500)).toBe('1.5K');
    expect(formatStatNumber(12000)).toBe('12K');
  });
});
