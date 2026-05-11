import Redis from 'ioredis';
import logger from './logger.js';

let _client;
let _initAttempted = false;

export function getRedisClient() {
  if (_initAttempted) return _client;
  _initAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn('REDIS_URL not set — using in-memory auth state (single-instance only)');
    return null;
  }

  _client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 5000,
    lazyConnect: false,
  });

  _client.on('error', (err) => {
    logger.error('Redis client error', { message: err.message });
  });
  _client.on('connect', () => logger.info('Redis connected'));
  _client.on('ready', () => logger.info('Redis ready'));

  return _client;
}

// Exposed for tests only — resets the singleton so tests can inject a mock.
export function _resetClientForTest() {
  _client = undefined;
  _initAttempted = false;
}
