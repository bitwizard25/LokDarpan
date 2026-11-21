/**
 * Redis connection for BullMQ (separate connections recommended for Queue vs Worker).
 */
import Redis from 'ioredis';

export function createRedisConnection() {
  const url = process.env.REDIS_URL;
  const client = url
    ? new Redis(url, { maxRetriesPerRequest: null, retryStrategy: () => 5000 })
    : new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
        retryStrategy: () => 5000,
      });

  client.on('error', (err) => {
    // Avoid crashing server if Redis is temporarily offline in development
    console.warn('⚠️ Redis notice (worker queues offline):', err.message);
  });

  return client;
}
