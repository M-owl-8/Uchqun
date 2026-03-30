export function parsePagination(query, defaults = {}) {
  const MAX_LIMIT = 100;
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaults.limit || 20, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(query.offset, 10) || 0, 0);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, offset: offset || (page - 1) * limit };
}
