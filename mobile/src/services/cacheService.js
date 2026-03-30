import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'cache:';

function getCacheKey(endpoint, params) {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${CACHE_PREFIX}${endpoint}:${paramStr}`;
}

export const cacheService = {
  async get(endpoint, params) {
    try {
      const key = getCacheKey(endpoint, params);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      const { data, timestamp, ttl } = JSON.parse(raw);
      const isStale = Date.now() - timestamp > (ttl || DEFAULT_TTL);
      return { data, isStale };
    } catch {
      return null;
    }
  },

  async set(endpoint, params, data, ttl = DEFAULT_TTL) {
    try {
      const key = getCacheKey(endpoint, params);
      await AsyncStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), ttl }));
    } catch (error) {
      console.warn('[CacheService] Failed to cache:', error);
    }
  },

  async clear() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.warn('[CacheService] Failed to clear cache:', error);
    }
  },

  async clearMatching(pattern) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX) && pattern.test(k));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch {
      // Silently fail on cache clear errors
    }
  },
};
