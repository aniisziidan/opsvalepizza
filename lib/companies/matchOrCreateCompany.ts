import type { Prisma } from '@prisma/client';
import { parseBranchRange } from '@/lib/validation/quoteRequest';

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function extractNormalizedDomain(urlStr?: string | null): string | null {
  if (!urlStr || !urlStr.trim()) return null;
  let raw = urlStr.trim().toLowerCase();
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
  }
  try {
    const parsed = new URL(raw);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    return host || null;
  } catch {
    return null;
  }
}

export interface MatchCompanyInput {
  name: string;
  websiteUrl?: string | null;
  countryCode: string;
  branchRange: string;
}

/**
 * Deterministically finds an existing company or creates a new one.
 * Priority 1: Match by normalized website domain
 * Priority 2: Match by normalized name + country code
 * Never overwrites existing CRM fields from public submissions.
 */
export async function matchOrCreateCompany(
  tx: Prisma.TransactionClient,
  input: MatchCompanyInput,
): Promise<{ id: string; isNew: boolean }> {
  const normName = normalizeCompanyName(input.name);
  const normDomain = extractNormalizedDomain(input.websiteUrl);
  const countryCode = input.countryCode.toUpperCase().trim();

  // Priority 1: Domain matching if domain exists
  if (normDomain) {
    const existingByDomain = await tx.company.findFirst({
      where: {
        normalizedWebsiteDomain: normDomain,
      },
    });
    if (existingByDomain) {
      return { id: existingByDomain.id, isNew: false };
    }
  }

  // Priority 2: Normalized name + country match
  if (normName) {
    const existingByNameCountry = await tx.company.findFirst({
      where: {
        normalizedName: normName,
        countryCode: countryCode,
      },
    });
    if (existingByNameCountry) {
      return { id: existingByNameCountry.id, isNew: false };
    }
  }

  // Fallback: Create new Company record safely
  const { range, min, max } = parseBranchRange(input.branchRange);
  const newCompany = await tx.company.create({
    data: {
      name: input.name.trim(),
      normalizedName: normName,
      website: input.websiteUrl?.trim() || null,
      normalizedWebsiteDomain: normDomain,
      countryCode: countryCode,
      branchRange: range,
      branchCountMin: min,
      branchCountMax: max,
      branchCount: min,
    },
  });

  return { id: newCompany.id, isNew: true };
}
