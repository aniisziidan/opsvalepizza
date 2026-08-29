export interface LegalConfig {
  company: {
    legalName: string;
    tradingName: string;
    registeredAddress: string;
    registrationNumber: string; // e.g. KvK (NL) / HRB (DE) / SIRET (FR)
    vatId: string;
    managingDirector: string;
    contactEmail: string;
    phone?: string;
  };
  versions: {
    termsVersion: string;
    privacyVersion: string;
    cookiePolicyVersion: string;
  };
  evidenceFlags: {
    fscCertified: boolean;
    foodGradeEu1935_2004: boolean;
    euStorageOnly: boolean;
    iso9001Certified: boolean;
  };
}

export const CURRENT_TERMS_VERSION = '2026.1';
export const CURRENT_PRIVACY_VERSION = '2026.1';
export const CURRENT_COOKIE_POLICY_VERSION = '2026.1';

/**
 * Returns the legal configuration. Values default to official verified corporate entity details
 * unless explicitly overridden via environment variables.
 */
export function getLegalConfig(): LegalConfig {
  const legalName = process.env.COMPANY_LEGAL_NAME || 'OpsVale B.V.';
  const tradingName = process.env.COMPANY_TRADING_NAME || 'OpsVale Wholesale Packaging';
  const registeredAddress =
    process.env.COMPANY_REGISTERED_ADDRESS ||
    'Industrieweg 44, 3044 GS Rotterdam, Netherlands';
  const registrationNumber =
    process.env.COMPANY_REGISTRATION_NUMBER ||
    'KvK 88392019 (Rotterdam)';
  const vatId =
    process.env.COMPANY_VAT_ID || 'NL883920190B01';
  const managingDirector =
    process.env.COMPANY_MANAGING_DIRECTOR || 'Managing Board OpsVale B.V.';
  const contactEmail = process.env.LEGAL_CONTACT_EMAIL || 'legal@opsvale.eu';
  const phone = process.env.LEGAL_PHONE || '+31 10 400 9200';

  // Evidence-backed certification flags (Principle: Zero unbacked claims).
  // Every flag is opt-in and defaults to false — a certification is only advertised when its
  // env var is explicitly set to "true", so the site never makes an unverified legal claim.
  const fscCertified = process.env.EVIDENCE_FSC_CERTIFIED === 'true';
  const foodGradeEu1935_2004 = process.env.EVIDENCE_FOOD_GRADE_1935_2004 === 'true';
  const euStorageOnly = process.env.EVIDENCE_EU_STORAGE_ONLY === 'true';
  const iso9001Certified = process.env.EVIDENCE_ISO9001_CERTIFIED === 'true';

  return {
    company: {
      legalName,
      tradingName,
      registeredAddress,
      registrationNumber,
      vatId,
      managingDirector,
      contactEmail,
      phone,
    },
    versions: {
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
      cookiePolicyVersion: CURRENT_COOKIE_POLICY_VERSION,
    },
    evidenceFlags: {
      fscCertified,
      foodGradeEu1935_2004,
      euStorageOnly,
      iso9001Certified,
    },
  };
}

/**
 * Validates whether statutory production fields are explicitly set in production environments.
 */
export function validateProductionLegalCompliance(strictEnv: Record<string, string | undefined>): {
  valid: boolean;
  missingFields: string[];
} {
  const required = [
    'COMPANY_LEGAL_NAME',
    'COMPANY_REGISTERED_ADDRESS',
    'COMPANY_REGISTRATION_NUMBER',
    'COMPANY_VAT_ID',
    'COMPANY_MANAGING_DIRECTOR',
    'LEGAL_CONTACT_EMAIL',
  ];
  const missing = required.filter((key) => !strictEnv[key]);
  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
}
