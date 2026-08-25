import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth';
describe('password', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const h = await hashPassword('s3cret!');
    expect(await verifyPassword('s3cret!', h)).toBe(true);
    expect(await verifyPassword('wrong', h)).toBe(false);
  });
});
