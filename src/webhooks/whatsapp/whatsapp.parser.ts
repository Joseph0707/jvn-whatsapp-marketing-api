import { randomUUID } from 'node:crypto';
import {
  WhatsAppWebhookPayloadSchema,
  type WhatsAppEvent,
  type WhatsAppEventType,
} from './whatsapp.types.js';

/**
 * Parse and normalize the complex Meta webhook payload into flat WhatsAppEvent objects.
 *
 * Maps Meta's deeply nested JSON into the assessment-specified interface:
 *   - message_received    → Incoming text/media message
 *   - message_read        → Read receipt
 *   - message_failed      → Delivery failure
 *   - free_window_opened  → Message with referral (Click-to-WhatsApp Ad)
 *
 * @param rawPayload - The JSON-parsed body from Fastify
 * @returns An array of normalized WhatsAppEvent objects
 */
export function parseWhatsAppWebhook(rawPayload: unknown): WhatsAppEvent[] {
  const result = WhatsAppWebhookPayloadSchema.safeParse(rawPayload);

  if (!result.success) {
    return [];
  }

  const payload = result.data;
  const events: WhatsAppEvent[] = [];

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value.metadata.phone_number_id;

      // ── Incoming Messages ──────────────────────────────
      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const contact = value.contacts?.find(c => c.wa_id === msg.from);

          // Determine event type:
          // If the message has a referral → free_window_opened (Click-to-WhatsApp Ad)
          // Otherwise → message_received
          const type: WhatsAppEventType = msg.referral
            ? 'free_window_opened'
            : 'message_received';

          events.push({
            eventId: randomUUID(),
            tenantId: phoneNumberId,
            type,
            contactPhone: msg.from,
            messageId: msg.id,
            timestamp: new Date(parseInt(msg.timestamp) * 1000),
            metadata: {
              contactName: contact?.profile?.name,
              text: msg.text?.body,
              messageType: msg.type,
              ...(msg.referral ? { referral: msg.referral } : {}),
            },
          });
        }
      }

      // ── Status Updates (read, delivered, failed) ───────
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          // Map Meta status strings to our event types
          let type: WhatsAppEventType;
          switch (status.status) {
            case 'read':
              type = 'message_read';
              break;
            case 'failed':
              type = 'message_failed';
              break;
            default:
              // 'sent', 'delivered' → we still track them as metadata
              // but use a generic type. Skip non-relevant statuses.
              continue;
          }

          events.push({
            eventId: randomUUID(),
            tenantId: phoneNumberId,
            type,
            contactPhone: status.recipient_id,
            messageId: status.id,
            timestamp: new Date(parseInt(status.timestamp) * 1000),
            metadata: {
              rawStatus: status.status,
            },
          });
        }
      }
    }
  }

  return events;
}
