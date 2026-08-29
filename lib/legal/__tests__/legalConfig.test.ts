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

  it('defaults all evidence/certification flags to false unless explicitly enabled (no unbacked claims)', () => {
    const keys = [
      'EVIDENCE_FSC_CERTIFIED',
      'EVIDENCE_FOOD_GRADE_1935_2004',
      'EVIDENCE_EU_STORAGE_ONLY',
      'EVIDENCE_ISO9001_CERTIFIED',
    ];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    try {
      keys.forEach((k) => delete process.env[k]);
      const config = getLegalConfig();
      expect(config.evidenceFlags.fscCertified).toBe(false);
      expect(config.evidenceFlags.foodGradeEu1935_2004).toBe(false);
      expect(config.evidenceFlags.euStorageOnly).toBe(false);
      expect(config.evidenceFlags.iso9001Certified).toBe(false);
    } finally {
      keys.forEach((k) => {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      });
    }
  });

  it('enables an evidence flag only when its env var is exactly "true"', () => {
    const saved = process.env.EVIDENCE_FSC_CERTIFIED;
    try {
      process.env.EVIDENCE_FSC_CERTIFIED = 'true';
      expect(getLegalConfig().evidenceFlags.fscCertified).toBe(true);
      process.env.EVIDENCE_FSC_CERTIFIED = 'yes';
      expect(getLegalConfig().evidenceFlags.fscCertified).toBe(false);
    } finally {
      if (saved === undefined) delete process.env.EVIDENCE_FSC_CERTIFIED;
      else process.env.EVIDENCE_FSC_CERTIFIED = saved;
    }
  });
});
