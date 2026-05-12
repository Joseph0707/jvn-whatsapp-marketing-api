import type Redis from 'ioredis';

const IDEMPOTENCY_PREFIX = 'webhook:seen:';
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Check if a webhook event has already been processed (idempotency guard).
 *
 * Uses Redis SET with NX (only set if not exists) and EX (expire after TTL).
 * This is atomic — no race condition between check and set.
 *
 * @param redis   - The ioredis client instance
 * @param eventId - The unique event ID (e.g. WhatsApp message ID)
 * @returns true if the event is NEW (not seen before), false if it's a DUPLICATE
 */
export async function isNewEvent(
  redis: Redis,
  eventId: string,
): Promise<boolean> {
  // SET key value NX EX ttl
  // Returns 'OK' if the key was set (new event), null if it already existed (duplicate)
  const result = await redis.set(
    `${IDEMPOTENCY_PREFIX}${eventId}`,
    '1',
    'EX',
    IDEMPOTENCY_TTL_SECONDS,
    'NX',
  );

  return result === 'OK';
}
