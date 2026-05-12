import Fastify from 'fastify';
import { env } from './config/env.js';
import { buildLoggerConfig } from './shared/logger.js';
import { whatsappRoutes } from './webhooks/whatsapp/whatsapp.routes.js';
import redisPlugin from './plugins/redis.js';

// ── Extend Fastify types to include rawBody on request ───
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

/**
 * Build and configure the Fastify application instance.
 * Separated from start() for testability.
 */
export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerConfig(env.NODE_ENV),
  });

  // ── Raw body decorator ─────────────────────────────────
  // Needed for HMAC signature verification on webhook POST
  app.decorateRequest('rawBody', undefined);

  // ── Custom JSON parser that preserves raw body ─────────
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const rawBuffer = body as Buffer;
        // Store raw body on request for HMAC verification
        req.rawBody = rawBuffer;
        const parsed: unknown = JSON.parse(rawBuffer.toString());
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // ── Health check ───────────────────────────────────────
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ── Plugins ────────────────────────────────────────────
  await app.register(redisPlugin);
  // await app.register(postgresPlugin);

  // ── Routes ─────────────────────────────────────────────
  await app.register(whatsappRoutes, { prefix: '/webhook' });
  // await app.register(conversionRoutes, { prefix: '/webhook' });
  // await app.register(campaignRoutes, { prefix: '/campaigns' });

  return app;
}

/**
 * Start the Fastify server.
 */
async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(
      { port: env.PORT, env: env.NODE_ENV },
      'Server started successfully',
    );
  } catch (err) {
    app.log.error(err, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, () => {
    process.exit(0);
  });
});

void start();
