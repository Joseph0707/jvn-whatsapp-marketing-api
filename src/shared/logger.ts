import type { FastifyBaseLogger } from 'fastify';

/**
 * Pino logger configuration for Fastify.
 * Uses structured JSON logging in production, pretty-print in development.
 */
export function buildLoggerConfig(nodeEnv: string): boolean | Record<string, unknown> {
  if (nodeEnv === 'production') {
    return {
      level: 'info',
      serializers: {
        req(request: { method: string; url: string; hostname: string }) {
          return {
            method: request.method,
            url: request.url,
            hostname: request.hostname,
          };
        },
        res(reply: { statusCode: number }) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
    };
  }

  // Development: human-readable logs
  return {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  };
}

/**
 * Helper to create a child logger with additional context.
 * Use this in services/workers to add tenant/request context.
 */
export function createChildLogger(
  logger: FastifyBaseLogger,
  context: Record<string, unknown>,
): FastifyBaseLogger {
  return logger.child(context);
}
