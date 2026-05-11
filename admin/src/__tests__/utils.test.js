import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Utility helpers extracted from admin's dataStore patterns and common UI logic
// ---------------------------------------------------------------------------

/**
 * Pagination helper — used across all management pages.
 * Given a flat list, a page number (1-based) and a page size, returns the slice.
 */
function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/**
 * Returns the total number of pages for a list.
 */
function totalPages(itemCount, pageSize) {
  if (pageSize <= 0) return 0;
  return Math.ceil(itemCount / pageSize);
}

/**
 * Role label map used in UI display.
 */
function getRoleLabel(role) {
  const map = {
    admin: 'Admin',
    teacher: "O'qituvchi",
    parent: 'Ota-ona',
    reception: 'Qabul',
    government: 'Davlat',
  };
  return map[role] || role;
}

/**
 * Search filter — case-insensitive match across name/email fields.
 */
function filterByQuery(items, query) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      (item.firstName?.toLowerCase().includes(q)) ||
      (item.lastName?.toLowerCase().includes(q)) ||
      (item.email?.toLowerCase().includes(q))
  );
}

/**
 * Validates an email address.
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Formats an ISO date string to a localised display string (locale-independent
 * short format used in table cells throughout the admin UI).
 */
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('returns the first page correctly', () => {
    expect(paginate(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns the last (partial) page correctly', () => {
    expect(paginate(items, 3, 10)).toEqual([21, 22, 23, 24, 25]);
  });

  it('returns an empty array when page is beyond the list', () => {
    expect(paginate(items, 10, 10)).toEqual([]);
  });
});

describe('totalPages', () => {
  it('calculates pages for an even split', () => {
    expect(totalPages(20, 10)).toBe(2);
  });

  it('rounds up when there is a remainder', () => {
    expect(totalPages(21, 10)).toBe(3);
  });

  it('returns 0 when pageSize is 0', () => {
    expect(totalPages(20, 0)).toBe(0);
  });

  it('returns 1 for a single item', () => {
    expect(totalPages(1, 10)).toBe(1);
  });
});

describe('getRoleLabel', () => {
  it('returns Uzbek label for known roles', () => {
    expect(getRoleLabel('teacher')).toBe("O'qituvchi");
    expect(getRoleLabel('parent')).toBe('Ota-ona');
    expect(getRoleLabel('government')).toBe('Davlat');
  });

  it('falls back to the raw role string for unknown roles', () => {
    expect(getRoleLabel('unknown')).toBe('unknown');
  });
});

describe('filterByQuery', () => {
  const users = [
    { firstName: 'Ali', lastName: 'Valiyev', email: 'ali@school.uz' },
    { firstName: 'Zulfiya', lastName: 'Karimova', email: 'zulfiya@school.uz' },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@example.com' },
  ];

  it('returns all items when query is empty', () => {
    expect(filterByQuery(users, '')).toHaveLength(3);
  });

  it('filters case-insensitively by firstName', () => {
    const result = filterByQuery(users, 'ali');
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe('Ali');
  });

  it('filters by email domain', () => {
    const result = filterByQuery(users, '@school.uz');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no items match', () => {
    expect(filterByQuery(users, 'xxxxxx')).toHaveLength(0);
  });
});

describe('isValidEmail', () => {
  it('accepts a valid email address', () => {
    expect(isValidEmail('admin@school.uz')).toBe(true);
  });

  it('rejects an email without a domain', () => {
    expect(isValidEmail('admin@')).toBe(false);
  });

  it('rejects a string with no @ sign', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('formatDate', () => {
  it('returns "—" for null/undefined input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
  });

  it('returns "—" for an invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate('2025-01-15T10:30:00.000Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });
});
