export interface CorridorCandidate {
  id: string;
  countryId: string;
  route: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  active: boolean;
}

export interface Corridor {
  id: string;
  name: string | null;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
}

export interface LandedBreakdown {
  productEur: number;
  freightEur: number;
  inlandEur: number;
  otherEur: number;
  logisticsEur: number;
  landedEur: number;
  corridorId: string | null;
  corridorName: string | null;
  noLogisticsConfigured: boolean;
}

/** The one active corridor for a country (the DB guarantees at most one), or null. */
export function selectActiveCorridor(
  candidates: CorridorCandidate[],
  countryId: string,
): Corridor | null {
  const match = candidates.find((c) => c.active && c.countryId === countryId);
  if (!match) return null;
  return {
    id: match.id,
    name: match.route,
    freightEur: match.freightEur,
    inlandEur: match.inlandEur,
    otherEur: match.otherEur,
  };
}

/** Effective landed cost = product cost + freight + inland + other. */
export function effectiveLandedCost(
  productEur: number,
  corridor: Corridor | null,
): LandedBreakdown {
  const freightEur = corridor?.freightEur ?? 0;
  const inlandEur = corridor?.inlandEur ?? 0;
  const otherEur = corridor?.otherEur ?? 0;
  const logisticsEur = freightEur + inlandEur + otherEur;
  return {
    productEur,
    freightEur,
    inlandEur,
    otherEur,
    logisticsEur,
    landedEur: productEur + logisticsEur,
    corridorId: corridor?.id ?? null,
    corridorName: corridor?.name ?? null,
    noLogisticsConfigured: corridor === null,
  };
}
