import { describe, it, expect } from 'vitest';
import { parseWhatsAppWebhook } from '../../src/webhooks/whatsapp/whatsapp.parser.js';

describe('whatsapp.parser', () => {
  it('should return empty array for invalid payload', () => {
    expect(parseWhatsAppWebhook({ object: 'page', entry: [] })).toEqual([]);
  });

  it('should parse an incoming text message as message_received', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'ACCOUNT_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '16505551111', phone_number_id: 'tenant_123' },
            contacts: [{ profile: { name: 'Kerry Fisher' }, wa_id: '16315551234' }],
            messages: [{
              from: '16315551234',
              id: 'wamid.HBgLMTYzMTU1NTEyMzQVHQA=',
              timestamp: '1603051200',
              text: { body: 'Hello this is a test' },
              type: 'text'
            }]
          }
        }]
      }]
    };

    const events = parseWhatsAppWebhook(payload);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_received');
    expect(events[0].tenantId).toBe('tenant_123');
    expect(events[0].contactPhone).toBe('16315551234');
    expect(events[0].messageId).toBe('wamid.HBgLMTYzMTU1NTEyMzQVHQA=');
    expect(events[0].timestamp).toEqual(new Date(1603051200000));
    expect(events[0].metadata.text).toBe('Hello this is a test');
    expect(events[0].metadata.contactName).toBe('Kerry Fisher');
    expect(events[0].eventId).toBeDefined(); // UUID
  });

  it('should parse a message with referral as free_window_opened', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'ACCOUNT_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '111', phone_number_id: 'tenant_456' },
            messages: [{
              from: '333',
              id: 'msg-ad-1',
              timestamp: '1603051200',
              type: 'text',
              text: { body: 'I saw your ad' },
              referral: {
                source_url: 'https://fb.me/123',
                source_id: 'ad_id_123',
                source_type: 'ad',
                headline: 'Sale',
                body: 'Discount 50%'
              }
            }]
          }
        }]
      }]
    };

    const events = parseWhatsAppWebhook(payload);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('free_window_opened');
    expect(events[0].tenantId).toBe('tenant_456');
    expect(events[0].metadata.referral).toBeDefined();
  });

  it('should parse a read status as message_read', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'ACCOUNT_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '111', phone_number_id: 'tenant_789' },
            statuses: [{
              id: 'msg-id-123',
              status: 'read',
              timestamp: '1603051200',
              recipient_id: '333'
            }]
          }
        }]
      }]
    };

    const events = parseWhatsAppWebhook(payload);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_read');
    expect(events[0].tenantId).toBe('tenant_789');
    expect(events[0].contactPhone).toBe('333');
    expect(events[0].messageId).toBe('msg-id-123');
  });

  it('should parse a failed status as message_failed', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'ACCOUNT_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '111', phone_number_id: 'tenant_000' },
            statuses: [{
              id: 'msg-fail-1',
              status: 'failed',
              timestamp: '1603051200',
              recipient_id: '444'
            }]
          }
        }]
      }]
    };

    const events = parseWhatsAppWebhook(payload);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_failed');
  });

  it('should skip delivered/sent statuses (not in spec)', () => {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: 'ACCOUNT_ID',
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '111', phone_number_id: 'tenant_000' },
            statuses: [
              { id: 'msg-1', status: 'sent', timestamp: '1603051200', recipient_id: '444' },
              { id: 'msg-2', status: 'delivered', timestamp: '1603051200', recipient_id: '444' }
            ]
          }
        }]
      }]
    };

    const events = parseWhatsAppWebhook(payload);
    expect(events).toHaveLength(0);
  });
});
