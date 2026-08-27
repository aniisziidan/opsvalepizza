import { describe, it, expect } from 'vitest';
import { GET } from '../health/route';

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
