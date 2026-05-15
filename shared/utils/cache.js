const DEFAULT_TTL = 60_000;
const store = new Map(); // key → { data, ts, ttl }

export const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { store.delete(key); return null; }
  return entry.data;
};

export const set = (key, data, ttl = DEFAULT_TTL) => store.set(key, { data, ts: Date.now(), ttl });

export const invalidate = (key) => store.delete(key);

export const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
