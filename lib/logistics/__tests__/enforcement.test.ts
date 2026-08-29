import { describe, it, expect } from 'vitest';
import { corridorsToDeactivate } from '../enforcement';

describe('corridorsToDeactivate', () => {
  it('returns every currently-active id except the one being kept', () => {
    expect(corridorsToDeactivate(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
  it('returns empty when the kept id is the only active one', () => {
    expect(corridorsToDeactivate(['b'], 'b')).toEqual([]);
  });
});
