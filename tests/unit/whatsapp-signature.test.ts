import { describe, it, expect } from 'vitest';
import {
  verifyMetaSignature,
  computeMetaSignature,
} from '../../src/webhooks/whatsapp/whatsapp.signature.js';

const TEST_SECRET = 'test_app_secret_123';

describe('whatsapp.signature', () => {
  describe('verifyMetaSignature', () => {
    it('should accept a valid signature', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = computeMetaSignature(payload, TEST_SECRET);

      expect(verifyMetaSignature(payload, signature, TEST_SECRET)).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const fakeSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

      expect(verifyMetaSignature(payload, fakeSignature, TEST_SECRET)).toBe(false);
    });

    it('should reject a signature without sha256= prefix', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = computeMetaSignature(payload, TEST_SECRET);
      // Remove the "sha256=" prefix
      const rawHex = signature.replace('sha256=', '');

      expect(verifyMetaSignature(payload, rawHex, TEST_SECRET)).toBe(false);
    });

    it('should reject when payload has been tampered with', () => {
      const originalPayload = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = computeMetaSignature(originalPayload, TEST_SECRET);

      const tamperedPayload = JSON.stringify({ object: 'tampered' });

      expect(verifyMetaSignature(tamperedPayload, signature, TEST_SECRET)).toBe(false);
    });

    it('should reject when app secret is wrong', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const signature = computeMetaSignature(payload, TEST_SECRET);

      expect(verifyMetaSignature(payload, signature, 'wrong_secret')).toBe(false);
    });

    it('should handle Buffer payloads', () => {
      const payload = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }));
      const signature = computeMetaSignature(payload, TEST_SECRET);

      expect(verifyMetaSignature(payload, signature, TEST_SECRET)).toBe(true);
    });

    it('should reject an empty signature', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });

      expect(verifyMetaSignature(payload, '', TEST_SECRET)).toBe(false);
    });

    it('should reject a signature with different length', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });

      expect(verifyMetaSignature(payload, 'sha256=tooshort', TEST_SECRET)).toBe(false);
    });
  });

  describe('computeMetaSignature', () => {
    it('should return a string starting with sha256=', () => {
      const payload = JSON.stringify({ test: true });
      const signature = computeMetaSignature(payload, TEST_SECRET);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should produce consistent results for the same input', () => {
      const payload = JSON.stringify({ test: true });

      const sig1 = computeMetaSignature(payload, TEST_SECRET);
      const sig2 = computeMetaSignature(payload, TEST_SECRET);

      expect(sig1).toBe(sig2);
    });

    it('should produce different results for different payloads', () => {
      const sig1 = computeMetaSignature('payload1', TEST_SECRET);
      const sig2 = computeMetaSignature('payload2', TEST_SECRET);

      expect(sig1).not.toBe(sig2);
    });
  });
});
