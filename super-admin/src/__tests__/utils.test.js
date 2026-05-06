import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Utility logic used throughout the super-admin panel.
// The super-admin manages schools, admins, government accounts, payments,
// and registration requests. Tests here cover shared data-handling patterns.
// ---------------------------------------------------------------------------

/**
 * Searches a list of admin/government objects by name or email.
 */
function searchUsers(users, query) {
  if (!query?.trim()) return users;
  const q = query.trim().toLowerCase();
  return users.filter((u) =>
    `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
    (u.email ?? '').toLowerCase().includes(q)
  );
}

/**
 * Maps a school's rating (0–5) to a display label used in the SchoolsTab.
 */
function ratingLabel(score) {
  if (score === null || score === undefined) return 'Unrated';
  if (score >= 4.5) return 'Excellent';
  if (score >= 3.5) return 'Good';
  if (score >= 2.5) return 'Average';
  if (score >= 1.5) return 'Below Average';
  return 'Poor';
}

/**
 * Filters registration requests by status.
 */
function filterByStatus(requests, status) {
  if (!status) return requests;
  return requests.filter((r) => r.status === status);
}

/**
 * Formats a monetary amount (sum) with thousand separators, used in PaymentsTab.
 */
function formatSum(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '—';
  return Number(amount).toLocaleString('uz-UZ') + ' so\'m';
}

/**
 * Derives pagination meta from total count and current page config.
 */
function paginationMeta(total, page, pageSize) {
  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    total,
    page,
    pageSize,
    totalPages: pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('searchUsers', () => {
  const users = [
    { id: 1, firstName: 'Rustam', lastName: 'Nazarov',  email: 'rustam@uz.com' },
    { id: 2, firstName: 'Malika', lastName: 'Tosheva',  email: 'malika@uz.com' },
    { id: 3, firstName: 'John',   lastName: 'Smith',    email: 'john@global.com' },
  ];

  it('returns all users for an empty query', () => {
    expect(searchUsers(users, '')).toHaveLength(3);
    expect(searchUsers(users, null)).toHaveLength(3);
  });

  it('matches by first name (case-insensitive)', () => {
    expect(searchUsers(users, 'rustam')).toHaveLength(1);
    expect(searchUsers(users, 'RUSTAM')[0].id).toBe(1);
  });

  it('matches by email domain', () => {
    expect(searchUsers(users, '@uz.com')).toHaveLength(2);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchUsers(users, 'zzzzzz')).toHaveLength(0);
  });
});

describe('ratingLabel', () => {
  it('returns "Excellent" for scores >= 4.5', () => {
    expect(ratingLabel(5)).toBe('Excellent');
    expect(ratingLabel(4.5)).toBe('Excellent');
  });

  it('returns "Good" for scores in [3.5, 4.5)', () => {
    expect(ratingLabel(4)).toBe('Good');
    expect(ratingLabel(3.5)).toBe('Good');
  });

  it('returns "Poor" for scores below 1.5', () => {
    expect(ratingLabel(1)).toBe('Poor');
    expect(ratingLabel(0)).toBe('Poor');
  });

  it('returns "Unrated" for null or undefined', () => {
    expect(ratingLabel(null)).toBe('Unrated');
    expect(ratingLabel(undefined)).toBe('Unrated');
  });
});

describe('filterByStatus', () => {
  const requests = [
    { id: 1, status: 'pending' },
    { id: 2, status: 'approved' },
    { id: 3, status: 'pending' },
    { id: 4, status: 'rejected' },
  ];

  it('returns all requests when status is falsy', () => {
    expect(filterByStatus(requests, '')).toHaveLength(4);
    expect(filterByStatus(requests, null)).toHaveLength(4);
  });

  it('filters to the specified status', () => {
    const pending = filterByStatus(requests, 'pending');
    expect(pending).toHaveLength(2);
    expect(pending.every((r) => r.status === 'pending')).toBe(true);
  });

  it('returns empty for a status that does not exist', () => {
    expect(filterByStatus(requests, 'unknown')).toHaveLength(0);
  });
});

describe('formatSum', () => {
  it('returns "—" for null, undefined, or NaN', () => {
    expect(formatSum(null)).toBe('—');
    expect(formatSum(undefined)).toBe('—');
    expect(formatSum('abc')).toBe('—');
  });

  it('formats a valid amount with so\'m suffix', () => {
    const result = formatSum(1000000);
    expect(result).toContain("so'm");
  });

  it('handles zero correctly', () => {
    const result = formatSum(0);
    expect(result).toContain("so'm");
    expect(result).not.toBe('—');
  });
});

describe('paginationMeta', () => {
  it('calculates totalPages correctly', () => {
    expect(paginationMeta(25, 1, 10).totalPages).toBe(3);
  });

  it('reports hasNext=true when not on the last page', () => {
    expect(paginationMeta(25, 1, 10).hasNext).toBe(true);
  });

  it('reports hasNext=false on the last page', () => {
    expect(paginationMeta(25, 3, 10).hasNext).toBe(false);
  });

  it('reports hasPrev=false on the first page', () => {
    expect(paginationMeta(25, 1, 10).hasPrev).toBe(false);
  });

  it('reports hasPrev=true on page 2+', () => {
    expect(paginationMeta(25, 2, 10).hasPrev).toBe(true);
  });
});
