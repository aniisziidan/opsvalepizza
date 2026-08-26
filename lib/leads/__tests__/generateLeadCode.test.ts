import { describe, it, expect, vi } from 'vitest';
import { generateLeadCode } from '../generateLeadCode';
import type { Prisma } from '@prisma/client';

describe('generateLeadCode', () => {
  it('generates sequential padded lead codes using atomic upsert', async () => {
    const mockTx = {
      leadSequence: {
        upsert: vi.fn().mockResolvedValueOnce({
          year: 2026,
          currentNumber: 1,
        }),
      },
    } as unknown as Prisma.TransactionClient;

    const code1 = await generateLeadCode(mockTx, 2026);
    expect(code1).toBe('OPS-2026-0001');
    expect(mockTx.leadSequence.upsert).toHaveBeenCalledWith({
      where: { year: 2026 },
      create: { year: 2026, currentNumber: 1 },
      update: { currentNumber: { increment: 1 } },
    });
  });

  it('correctly pads higher sequence numbers', async () => {
    const mockTx = {
      leadSequence: {
        upsert: vi.fn().mockResolvedValueOnce({
          year: 2026,
          currentNumber: 42,
        }),
      },
    } as unknown as Prisma.TransactionClient;

    const code = await generateLeadCode(mockTx, 2026);
    expect(code).toBe('OPS-2026-0042');
  });
});
