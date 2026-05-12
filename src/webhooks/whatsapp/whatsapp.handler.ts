import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../../config/env.js';
import { verifyMetaSignature } from './whatsapp.signature.js';
import { parseWhatsAppWebhook } from './whatsapp.parser.js';

// ── Types ────────────────────────────────────────────────────

interface VerificationQuery {
  'hub.mode': string;
  'hub.verify_token': string;
  'hub.challenge': string;
}

// ── GET: Webhook Verification ────────────────────────────────

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
  try {
    // We pass the parsed body to our Zod parser to flatten it
    const events = parseWhatsAppWebhook(request.body);
    
    if (events.length === 0) {
      request.log.debug('No actionable WhatsApp events found in payload');
      return;
    }

    request.log.info({ parsedEvents: events }, 'Normalized WhatsApp events');

    // In the next commit, we will add Idempotency checks here 
    // and store the events in PostgreSQL.

  } catch (err) {
    request.log.error({ err, body: request.body }, 'Error processing WhatsApp webhook');
  }
}
