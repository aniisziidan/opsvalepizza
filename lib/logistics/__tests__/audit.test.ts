import { describe, it, expect } from 'vitest';
import { logisticsAuditValues } from '../audit';

describe('logisticsAuditValues', () => {
  it('captures the auditable corridor fields as plain values', () => {
    expect(
      logisticsAuditValues({
        route: 'Genoa', port: 'Genoa Port', shipMethod: 'Intermodal',
        freightEur: '0.0400', inlandEur: '0.0200', otherEur: null, active: true,
      }),
    ).toEqual({
      route: 'Genoa', port: 'Genoa Port', shipMethod: 'Intermodal',
      freightEur: '0.0400', inlandEur: '0.0200', otherEur: null, active: true,
    });
  });
});
