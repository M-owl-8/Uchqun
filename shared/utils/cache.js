const TTL = 60_000; // 60 seconds
const store = new Map(); // key → { data, ts }

export const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { store.delete(key); return null; }
  return entry.data;
};

export const set = (key, data) => store.set(key, { data, ts: Date.now() });

export const invalidate = (key) => store.delete(key);

export const invalidatePrefix = (prefix) => {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
};
