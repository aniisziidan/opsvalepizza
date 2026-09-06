import { LandedCostCalculator } from '@/components/admin/LandedCostCalculator';
import { getLandedCalcs, getCountries, getBoxConfigs } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLandedCostPage() {
  const [calcs, countries, boxConfigs] = await Promise.all([
    getLandedCalcs(),
    getCountries(),
    getBoxConfigs(),
  ]);

  return (
    <LandedCostCalculator calcs={calcs} countries={countries} boxConfigs={boxConfigs} />
  );
}
