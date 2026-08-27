import { describe, it, expect } from 'vitest';
import { getLegalConfig, CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '../config';

describe('Legal Configuration & Compliance Guarantees', () => {
  it('returns valid development legal configuration with version identifiers', () => {
    const config = getLegalConfig();

    expect(config.company.legalName).toBeDefined();
    expect(config.company.contactEmail).toBe('legal@opsvale.eu');
    expect(config.versions.termsVersion).toBe(CURRENT_TERMS_VERSION);
    expect(config.versions.privacyVersion).toBe(CURRENT_PRIVACY_VERSION);
    expect(typeof config.evidenceFlags.foodGradeEu1935_2004).toBe('boolean');
    expect(typeof config.evidenceFlags.fscCertified).toBe('boolean');
  });

  it('provides safe placeholder markers when env variables are not set in dev', () => {
    const config = getLegalConfig();
    expect(config.company.legalName).toBeTruthy();
    expect(config.company.registeredAddress).toBeTruthy();
  });
});
