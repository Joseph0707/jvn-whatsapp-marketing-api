import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isNewEvent } from '../../src/webhooks/whatsapp/whatsapp.idempotency.js';

// Mock Redis client
function createMockRedis() {
  return {
    set: vi.fn(),
  };
}

describe('whatsapp.idempotency', () => {
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    mockRedis = createMockRedis();
  });

  it('should return true for a new event (SET NX returns OK)', async () => {
    mockRedis.set.mockResolvedValue('OK');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isNewEvent(mockRedis as any, 'event-123');

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'webhook:seen:event-123',
      '1',
      'EX',
      86400, // 24h in seconds
      'NX',
    );
  });

  it('should return false for a duplicate event (SET NX returns null)', async () => {
    mockRedis.set.mockResolvedValue(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await isNewEvent(mockRedis as any, 'event-123');

    expect(result).toBe(false);
  });

  it('should use the correct key prefix', async () => {
    mockRedis.set.mockResolvedValue('OK');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await isNewEvent(mockRedis as any, 'wamid.abc123');

    expect(mockRedis.set).toHaveBeenCalledWith(
      'webhook:seen:wamid.abc123',
      '1',
      'EX',
      86400,
      'NX',
    );
  });

  it('should set a 24-hour TTL', async () => {
    mockRedis.set.mockResolvedValue('OK');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await isNewEvent(mockRedis as any, 'test-event');

    // Verify 4th argument is 86400 (24 * 60 * 60)
    const callArgs = mockRedis.set.mock.calls[0];
    expect(callArgs[3]).toBe(86400);
  });
});
