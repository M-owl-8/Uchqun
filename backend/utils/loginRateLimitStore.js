import { getRedisClient } from './redisClient.js';
import logger from './logger.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 15 * 60; // 15 minutes

// In-memory fallback (used when REDIS_URL is not configured)
const _store = new Map();

export async function recordFailedAttempt(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const attemptsKey = `lockout:attempts:${key}`;
      const count = await redis.incr(attemptsKey);
      if (count === 1) {
        // First attempt — set expiry on the sliding counter window
        await redis.expire(attemptsKey, LOCKOUT_SECS);
      }
      if (count >= MAX_ATTEMPTS) {
        await redis.set(`lockout:locked:${key}`, '1', 'EX', LOCKOUT_SECS);
      }
    } catch (err) {
      logger.error('Redis recordFailedAttempt error', { message: err.message, key });
    }
    return;
  }
  // In-memory fallback
  const entry = _store.get(key) || { attempts: 0, lockedUntil: null };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_SECS * 1000;
  }
  _store.set(key, entry);
}

export async function clearAttempts(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(`lockout:attempts:${key}`, `lockout:locked:${key}`);
    } catch (err) {
      logger.error('Redis clearAttempts error', { message: err.message, key });
    }
    return;
  }
  _store.delete(key);
}

// Returns true (locked) on Redis error — fail-closed for security.
export async function isLockedOut(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const locked = await redis.exists(`lockout:locked:${key}`);
      return locked === 1;
    } catch (err) {
      logger.error('Redis isLockedOut error — fail closed', { message: err.message, key });
      return true;
    }
  }
  // In-memory fallback
  const entry = _store.get(key);
  if (!entry?.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    _store.delete(key);
    return false;
  }
  return true;
}
