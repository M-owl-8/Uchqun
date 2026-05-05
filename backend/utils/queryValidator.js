/**
 * Safely parse a positive integer from a query/param value.
 * Rejects Infinity, NaN, negative numbers, and values exceeding max.
 */
export function parsePositiveInt(value, defaultValue = 20, max = 1000) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return defaultValue;
  return Math.min(n, max);
}

export function parsePage(value) {
  return parsePositiveInt(value, 1, 10000);
}

export function parseLimit(value, defaultLimit = 20) {
  return parsePositiveInt(value, defaultLimit, 100);
}

export function parseOffset(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}
