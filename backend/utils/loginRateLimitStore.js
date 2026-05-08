// Per-account login lockout store — in-memory, single-instance.
// To support multi-instance Railway deploys, replace with a Redis-backed implementation:
//   import { createClient } from 'redis';
//   const redis = createClient({ url: process.env.REDIS_URL });
//   export async function recordFailedAttempt(key) { ... redis.incr / redis.expire ... }
//
// Interface contract: all three functions accept a string key (e.g. email) and
// return void / boolean synchronously (in-memory) or via Promise (Redis path).

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const store = new Map();

export function recordFailedAttempt(key) {
  const entry = store.get(key) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  store.set(key, entry);
}

export function clearAttempts(key) {
  store.delete(key);
}

export function isLockedOut(key) {
  const entry = store.get(key);
  if (!entry?.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    store.delete(key);
    return false;
  }
  return true;
}
