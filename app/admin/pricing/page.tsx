import { PricingManagement } from '@/components/admin/PricingManagement';
import {
  getLandedCosts,
  getPricingRules,
  getPublicPriceRanges,
  getPricingAuditLogs,
  getCountries,
  getBoxConfigs,
  getActiveCorridorCandidates,
} from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  const [
    landedCosts,
    pricingRules,
    publicPriceRanges,
    auditLogs,
    countries,
    boxConfigs,
    corridorCandidates,
  ] = await Promise.all([
    getLandedCosts(),
    getPricingRules(),
    getPublicPriceRanges(),
    getPricingAuditLogs(),
    getCountries(),
    getBoxConfigs(),
    getActiveCorridorCandidates(),
  ]);

  return (
    <PricingManagement
      landedCosts={landedCosts}
      pricingRules={pricingRules}
      publicPriceRanges={publicPriceRanges}
      auditLogs={auditLogs}
      countries={countries}
      boxConfigs={boxConfigs}
      corridorCandidates={corridorCandidates}
    />
  );
}
