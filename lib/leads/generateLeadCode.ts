import type { Prisma } from '@prisma/client';

/**
 * Concurrency-safe, atomic sequential lead code generator.
 * Format: OPS-YYYY-#### (e.g. OPS-2026-0001)
 *
 * Executes an atomic SQL upsert/increment directly in PostgreSQL via the transaction client.
 * Never performs a client-side read-and-increment.
 */
export async function generateLeadCode(
  tx: Prisma.TransactionClient,
  year: number = new Date().getFullYear(),
): Promise<string> {
  const seq = await tx.leadSequence.upsert({
    where: { year },
    create: { year, currentNumber: 1 },
    update: { currentNumber: { increment: 1 } },
  });

  const paddedNumber = String(seq.currentNumber).padStart(4, '0');
  return `OPS-${year}-${paddedNumber}`;
}
