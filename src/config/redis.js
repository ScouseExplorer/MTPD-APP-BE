import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  enableReadyCheck: true,
});

redis.on('connect', () => console.log(`✅ Redis connected: ${REDIS_URL}`));
redis.on('error', (err) => console.error('Redis error:', err.message));

export default redis;