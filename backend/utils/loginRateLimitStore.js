import { getRedisClient } from './redisClient.js';
import logger from './logger.js';

const MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 5;
const LOCKOUT_SECS = parseInt(process.env.LOGIN_LOCKOUT_SECS, 10) || 15 * 60;

// In-memory fallback (used when REDIS_URL is not configured)
const _store = new Map();

export async function recordFailedAttempt(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const attemptsKey = `lockout:attempts:${key}`;
      const count = await redis.incr(attemptsKey);
      if (count === 1) {
        await redis.expire(attemptsKey, LOCKOUT_SECS);
      }
      if (count >= MAX_ATTEMPTS) {
        await redis.set(`lockout:locked:${key}`, '1', 'EX', LOCKOUT_SECS);
      }
      return;
    } catch (err) {
      logger.error('Redis recordFailedAttempt error — falling back to in-memory', { message: err.message, key });
      // fall through to in-memory
    }
  }
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
      // always also clear in-memory in case a Redis error previously caused a fallback write
    } catch (err) {
      logger.error('Redis clearAttempts error', { message: err.message, key });
    }
  }
  _store.delete(key);
}

// On Redis error: fall back to in-memory check rather than failing closed.
// Failing closed (returning true) would lock out ALL users during any Redis
// connectivity blip, which is a worse outcome than briefly losing brute-force
// protection. JTI revocation (middleware/auth.js) stays fail-closed because
// a revoked token being replayed is more critical than a short lockout gap.
export async function isLockedOut(key) {
  const redis = getRedisClient();
  if (redis) {
    try {
      const locked = await redis.exists(`lockout:locked:${key}`);
      return locked === 1;
    } catch (err) {
      logger.error('Redis isLockedOut error — falling back to in-memory', { message: err.message, key });
      // fall through to in-memory
    }
  }
  const entry = _store.get(key);
  if (!entry?.lockedUntil) return false;
  if (Date.now() > entry.lockedUntil) {
    _store.delete(key);
    return false;
  }
  return true;
}
