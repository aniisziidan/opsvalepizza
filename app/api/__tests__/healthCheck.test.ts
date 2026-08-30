import { describe, it, expect, vi } from 'vitest';
import { GET } from '../health/route';

vi.mock('@/lib/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock('@/lib/notifications/dispatcher', () => ({
  emitNotificationEvent: vi.fn().mockResolvedValue([]),
}));

describe('/api/health Route', () => {
  it('returns valid health probe JSON with status and system checks', async () => {
    const res = await GET();
    expect(res).toBeDefined();

    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('storage');
    expect(data.system).toHaveProperty('uptimeSeconds');
  });
});

