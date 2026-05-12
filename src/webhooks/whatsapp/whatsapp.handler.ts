import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { verifyMetaSignature } from './whatsapp.signature.js';

// ── Types ────────────────────────────────────────────────────

interface VerificationQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

// ── GET: Webhook Verification ────────────────────────────────

/**
 * Handle Meta's webhook verification challenge.
 *
 * Meta sends:
 *   GET /webhook/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>
 *
 * We must respond with the challenge value if the verify_token matches.
 */
export async function handleWebhookVerification(
  request: FastifyRequest<{ Querystring: VerificationQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const mode = request.query['hub.mode'];
  const token = request.query['hub.verify_token'];
  const challenge = request.query['hub.challenge'];

  if (mode === 'subscribe' && token === env.META_VERIFY_TOKEN) {
    request.log.info('Webhook verification successful');
    await reply.code(200).send(challenge);
    return;
  }

  request.log.warn({ mode, token }, 'Webhook verification failed');
  await reply.code(403).send({ error: 'Forbidden' });
}

// ── POST: Incoming Webhook Events ────────────────────────────

/**
 * Handle incoming webhook events from Meta.
 *
 * Flow:
 *   1. Validate HMAC signature → 401 if invalid
 *   2. Respond 200 immediately (Meta requires fast response)
 *   3. Process the event asynchronously (parsing, idempotency, etc.)
 */
export async function handleWebhookEvent(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // 1. Validate HMAC signature
  const signature = request.headers['x-hub-signature-256'];

  if (!signature || typeof signature !== 'string') {
    request.log.warn('Missing x-hub-signature-256 header');
    await reply.code(401).send({ error: 'Missing signature' });
    return;
  }

  // Get the raw body from our custom content type parser
  // The body was parsed from buffer in server.ts addContentTypeParser
  const rawBody = request.rawBody as string | Buffer | undefined;

  if (!rawBody) {
    request.log.error('Raw body not available for signature verification');
    await reply.code(500).send({ error: 'Internal server error' });
    return;
  }

  if (!verifyMetaSignature(rawBody, signature, env.META_APP_SECRET)) {
    request.log.warn('Invalid webhook signature');
    await reply.code(401).send({ error: 'Invalid signature' });
    return;
  }

  // 2. Respond 200 immediately — Meta expects a fast response
  await reply.code(200).send('EVENT_RECEIVED');

  // 3. Process the event asynchronously
  // Event parsing and processing will be added in the next commits.
  // For now, just log the received event.
  request.log.info(
    { body: request.body },
    'Webhook event received and acknowledged',
  );
}
