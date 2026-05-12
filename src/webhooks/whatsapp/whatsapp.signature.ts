import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify the Meta/WhatsApp webhook signature (HMAC-SHA256).
 *
 * Meta sends the header `x-hub-signature-256` with the value `sha256=<hex>`.
 * We recompute the HMAC using our app secret and compare using
 * timingSafeEqual to prevent timing attacks.
 *
 * @param payload  - The raw request body (string or Buffer)
 * @param signature - The value of the `x-hub-signature-256` header
 * @param appSecret - The Meta App Secret used to compute the HMAC
 * @returns true if the signature is valid
 */
export function verifyMetaSignature(
  payload: string | Buffer,
  signature: string,
  appSecret: string,
): boolean {
  // Guard: signature must start with "sha256="
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature =
    'sha256=' +
    createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');

  // Both buffers must be the same length for timingSafeEqual
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Compute the expected Meta signature for a given payload.
 * Useful for testing and debugging.
 *
 * @param payload  - The raw body
 * @param appSecret - The Meta App Secret
 * @returns The full signature string (e.g. "sha256=abc123...")
 */
export function computeMetaSignature(
  payload: string | Buffer,
  appSecret: string,
): string {
  return (
    'sha256=' +
    createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')
  );
}
