import { PricingManagement } from '@/components/admin/PricingManagement';
import {
  getLandedCosts,
  getPricingRules,
  getPublicPriceRanges,
  getPricingAuditLogs,
  getCountries,
  getBoxConfigs,
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
  ] = await Promise.all([
    getLandedCosts(),
    getPricingRules(),
    getPublicPriceRanges(),
    getPricingAuditLogs(),
    getCountries(),
    getBoxConfigs(),
  ]);

  return (
    <PricingManagement
      landedCosts={landedCosts}
      pricingRules={pricingRules}
      publicPriceRanges={publicPriceRanges}
      auditLogs={auditLogs}
      countries={countries}
      boxConfigs={boxConfigs}
    />
  );
}
