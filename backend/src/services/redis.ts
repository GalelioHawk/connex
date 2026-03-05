import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL!;

if (!redisUrl) {
  throw new Error('Missing REDIS_URL in environment');
}

export const redis = new Redis(redisUrl, {
  tls: {},
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
});

redis.on('connect', () => console.log('[Redis] Connected'));
redis.on('error', (err) => console.error('[Redis] Error:', err.message));
