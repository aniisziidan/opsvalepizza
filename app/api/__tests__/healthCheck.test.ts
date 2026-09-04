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
  it('returns valid health probe JSON with status and checks', async () => {
    const res = await GET(new Request('http://localhost/api/health'));
    expect(res).toBeDefined();

    const data = await res.json();
    expect(data).toHaveProperty('status');
    expect(['healthy', 'degraded']).toContain(data.status);
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('version');
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('storage');
  });

  it('does not leak runtime/system internals on the public endpoint', async () => {
    const res = await GET(new Request('http://localhost/api/health'));
    const data = await res.json();
    expect(data).not.toHaveProperty('system');
    expect(JSON.stringify(data)).not.toContain('nodeVersion');
    expect(JSON.stringify(data)).not.toMatch(/memory/i);
  });
});

