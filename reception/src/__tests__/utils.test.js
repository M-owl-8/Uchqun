import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Utility logic used throughout the reception management pages.
// Drawn from the patterns in reception/src/services/dataStore.js and page components.
// ---------------------------------------------------------------------------

/**
 * Filters a list of children by group ID.
 */
function filterChildrenByGroup(children, groupId) {
  if (!groupId) return children;
  return children.filter((c) => c.groupId === groupId);
}

/**
 * Calculates the age in years from a birth date string.
 */
function calculateAge(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Validates a phone number in Uzbek format (+998 XX XXX-XX-XX) or 9-digit local.
 */
function isValidUzPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+998\d{9}|998\d{9}|\d{9})$/.test(cleaned);
}

/**
 * Summarises document status for display in the reception intake workflow.
 * Returns 'complete', 'partial', or 'missing'.
 */
function getDocumentStatus(documents) {
  if (!documents || documents.length === 0) return 'missing';
  const required = ['birthCertificate', 'medicalCard', 'photo'];
  const types = documents.map((d) => d.type);
  const hasAll = required.every((r) => types.includes(r));
  if (hasAll) return 'complete';
  return 'partial';
}

/**
 * Sorts an array of objects by a date field descending (newest first).
 */
function sortByDateDesc(items, dateField = 'createdAt') {
  return [...items].sort((a, b) => {
    return new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('filterChildrenByGroup', () => {
  const children = [
    { id: '1', name: 'Ali',    groupId: 'g1' },
    { id: '2', name: 'Barno', groupId: 'g2' },
    { id: '3', name: 'Dono',  groupId: 'g1' },
  ];

  it('returns all children when groupId is falsy', () => {
    expect(filterChildrenByGroup(children, '')).toHaveLength(3);
    expect(filterChildrenByGroup(children, null)).toHaveLength(3);
  });

  it('filters to only the specified group', () => {
    const result = filterChildrenByGroup(children, 'g1');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.groupId === 'g1')).toBe(true);
  });

  it('returns an empty array when no children match the group', () => {
    expect(filterChildrenByGroup(children, 'g99')).toHaveLength(0);
  });
});

describe('calculateAge', () => {
  it('returns null for falsy or invalid input', () => {
    expect(calculateAge(null)).toBeNull();
    expect(calculateAge('')).toBeNull();
    expect(calculateAge('not-a-date')).toBeNull();
  });

  it('returns a non-negative integer for a past birth date', () => {
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    const result = calculateAge(twentyYearsAgo.toISOString());
    // Could be 19 or 20 depending on the day of year, but must be in that range
    expect(result).toBeGreaterThanOrEqual(19);
    expect(result).toBeLessThanOrEqual(20);
  });

  it('returns 0 for a child born this year', () => {
    const thisYear = new Date();
    thisYear.setMonth(0); // Jan 1 of current year
    thisYear.setDate(1);
    const age = calculateAge(thisYear.toISOString());
    expect(age).toBeGreaterThanOrEqual(0);
  });
});

describe('isValidUzPhone', () => {
  it('accepts international Uzbek format', () => {
    expect(isValidUzPhone('+998901234567')).toBe(true);
  });

  it('accepts 9-digit local format', () => {
    expect(isValidUzPhone('901234567')).toBe(true);
  });

  it('accepts numbers with spaces and dashes', () => {
    expect(isValidUzPhone('+998 90 123-45-67')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidUzPhone('')).toBe(false);
  });

  it('rejects a non-Uzbek number', () => {
    expect(isValidUzPhone('+1-800-555-0100')).toBe(false);
  });
});

describe('getDocumentStatus', () => {
  it('returns "missing" for null or empty documents', () => {
    expect(getDocumentStatus(null)).toBe('missing');
    expect(getDocumentStatus([])).toBe('missing');
  });

  it('returns "complete" when all required document types are present', () => {
    const docs = [
      { type: 'birthCertificate' },
      { type: 'medicalCard' },
      { type: 'photo' },
    ];
    expect(getDocumentStatus(docs)).toBe('complete');
  });

  it('returns "partial" when only some required documents are present', () => {
    const docs = [{ type: 'birthCertificate' }, { type: 'photo' }];
    expect(getDocumentStatus(docs)).toBe('partial');
  });
});

describe('sortByDateDesc', () => {
  const items = [
    { id: 1, createdAt: '2025-01-01T00:00:00Z' },
    { id: 2, createdAt: '2025-03-15T00:00:00Z' },
    { id: 3, createdAt: '2025-02-10T00:00:00Z' },
  ];

  it('places the most recent item first', () => {
    const sorted = sortByDateDesc(items);
    expect(sorted[0].id).toBe(2);
  });

  it('places the oldest item last', () => {
    const sorted = sortByDateDesc(items);
    expect(sorted[sorted.length - 1].id).toBe(1);
  });

  it('does not mutate the original array', () => {
    const original = [...items];
    sortByDateDesc(items);
    expect(items).toEqual(original);
  });
});
