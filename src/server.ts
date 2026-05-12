import Fastify from 'fastify';
import { env } from './config/env.js';
import { buildLoggerConfig } from './shared/logger.js';

/**
 * Build and configure the Fastify application instance.
 * Separated from start() for testability.
 */
export async function buildApp() {
  const app = Fastify({
    logger: buildLoggerConfig(env.NODE_ENV),
  });

  // ── Raw body access for HMAC signature validation ──
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      try {
        const rawBody = body as Buffer;
        const parsed: unknown = JSON.parse(rawBody.toString());
        done(null, parsed);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // ── Health check ───────────────────────────────────
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // ── Plugins will be registered here ────────────────
  // await app.register(redisPlugin);
  // await app.register(postgresPlugin);

  // ── Routes will be registered here ─────────────────
  // await app.register(whatsappRoutes, { prefix: '/webhook' });
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
