import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';

export const offlineQueue = {
  async add(request) {
    try {
      const queue = await this.getAll();
      queue.push({
        ...request,
        id: Date.now().toString(),
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      if (__DEV__) {
        console.error('[OfflineQueue] Failed to add request:', error);
      }
    }
  },

  async getAll() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async clear() {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  async replay(apiInstance) {
    const queue = await this.getAll();
    if (queue.length === 0) return { success: 0, failed: 0 };

    let success = 0;
    let failed = 0;
    const remaining = [];

    for (const request of queue) {
      try {
        await apiInstance({
          method: request.method,
          url: request.url,
          data: request.data,
          headers: request.headers,
        });
        success++;
      } catch (error) {
        failed++;
        // Keep failed requests for retry (unless too old - 24h)
        if (Date.now() - request.timestamp < 24 * 60 * 60 * 1000) {
          remaining.push(request);
        }
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return { success, failed };
  },
};
