/**
 * Redis store for express-rate-limit v7.
 * Uses the existing ioredis singleton so no extra package is needed.
 * Falls back to in-memory behaviour when Redis is unavailable.
 *
 * Each limiter MUST pass a unique `prefix` so limiters do not share
 * the same Redis counter — previously all limiters used `rl:<ip>`,
 * causing apiLimiter's per-request increments to exhaust
 * passwordResetLimiter's max:3 after just 2 logins.
 */
import { getRedisClient } from './redisClient.js';

export function makeRedisStore(windowMs, prefix) {
  if (!prefix) throw new Error('makeRedisStore requires a unique prefix per limiter');

  const windowSec = Math.ceil(windowMs / 1000);

  const redisKey = (key) => `rl:${prefix}:${key}`;

  return {
    async increment(key) {
      const redis = getRedisClient();
      if (!redis) return undefined; // fall through to in-memory store

      const rKey = redisKey(key);

      // Atomic SET-if-not-exists + EXPIRE via Lua to avoid the race where
      // EXPIRE is never called if the process dies between INCR and EXPIRE.
      const count = await redis.eval(
        `local c = redis.call('INCR', KEYS[1])
         if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
         return c`,
        1,
        rKey,
        windowSec,
      );

      const ttl = await redis.ttl(rKey);
      const resetTime = new Date(Date.now() + Math.max(ttl, 0) * 1000);
      return { totalHits: count, resetTime };
    },

    async decrement(key) {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.decr(redisKey(key)).catch(() => {});
    },

    async resetKey(key) {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.del(redisKey(key)).catch(() => {});
    },
  };
}
