/**
 * Redis store for express-rate-limit v7.
 * Uses the existing ioredis singleton so no extra package is needed.
 * Falls back to in-memory behaviour when Redis is unavailable.
 */
import { getRedisClient } from './redisClient.js';

export function makeRedisStore(windowMs) {
  return {
    async increment(key) {
      const redis = getRedisClient();
      if (!redis) return undefined; // fall through to in-memory store

      const windowSec = Math.ceil(windowMs / 1000);
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, windowSec);
      }
      const ttl = await redis.ttl(redisKey);
      const resetTime = new Date(Date.now() + ttl * 1000);
      return { totalHits: count, resetTime };
    },

    async decrement(key) {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.decr(`rl:${key}`).catch(() => {});
    },

    async resetKey(key) {
      const redis = getRedisClient();
      if (!redis) return;
      await redis.del(`rl:${key}`).catch(() => {});
    },
  };
}
