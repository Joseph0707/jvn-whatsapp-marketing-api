import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import Redis from 'ioredis';
import { env } from '../config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

/**
 * Fastify plugin that registers a shared Redis (ioredis) client.
 * Accessible via `app.redis` in routes and handlers.
 */
async function redisPlugin(app: FastifyInstance): Promise<void> {
  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  await redis.connect();
  app.log.info('Redis connected');

  app.decorate('redis', redis);

  app.addHook('onClose', async () => {
    await redis.quit();
    app.log.info('Redis disconnected');
  });
}

export default fp(redisPlugin, {
  name: 'redis',
});
