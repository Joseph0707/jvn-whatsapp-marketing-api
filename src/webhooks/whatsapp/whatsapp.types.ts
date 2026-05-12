import { z } from 'zod';

// ── Meta Webhook Payload Schema (Deeply Nested) ──────────────

export const WhatsAppProfileSchema = z.object({
  name: z.string(),
});

export const WhatsAppContactSchema = z.object({
  wa_id: z.string(),
  profile: WhatsAppProfileSchema.optional(),
});

export const WhatsAppReferralSchema = z.object({
  source_url: z.string(),
  source_id: z.string(),
  source_type: z.string(),
  headline: z.string(),
  body: z.string(),
  media_type: z.string().optional(),
  image_url: z.string().optional(),
  video_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
});

export const WhatsAppMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  referral: WhatsAppReferralSchema.optional(),
}).passthrough();

export const WhatsAppStatusSchema = z.object({
  id: z.string(),
  status: z.string(), // e.g. 'sent', 'delivered', 'read', 'failed'
  timestamp: z.string(),
  recipient_id: z.string(),
}).passthrough();

export const WhatsAppValueSchema = z.object({
  messaging_product: z.string(),
  metadata: z.object({
    display_phone_number: z.string(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(WhatsAppContactSchema).optional(),
  messages: z.array(WhatsAppMessageSchema).optional(),
  statuses: z.array(WhatsAppStatusSchema).optional(),
});

export const WhatsAppChangeSchema = z.object({
  value: WhatsAppValueSchema,
  field: z.string(),
});

export const WhatsAppEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WhatsAppChangeSchema),
});

export const WhatsAppWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(WhatsAppEntrySchema),
});

export type WhatsAppWebhookPayload = z.infer<typeof WhatsAppWebhookPayloadSchema>;

// ── Normalized Internal Event (matches assessment spec) ──────

/**
 * Unified WhatsApp event type as specified in the technical assessment.
 *
 * - `message_received`    → A new message was received from a contact
 * - `message_read`        → A sent message was read by the recipient
 * - `message_failed`      → A sent message failed to deliver
 * - `free_window_opened`  → A message came from a Click-to-WhatsApp Ad (referral present)
 */
export type WhatsAppEventType =
  | 'message_received'
  | 'message_read'
  | 'message_failed'
  | 'free_window_opened';

export interface WhatsAppEvent {
  eventId: string;                    // ID unique de l'événement
  tenantId: string;                   // ID du client (extrait du phoneNumberId)
  type: WhatsAppEventType;
  contactPhone: string;               // Numéro du contact (format E.164)
  messageId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;  // Données supplémentaires (text, referral, etc.)
}
