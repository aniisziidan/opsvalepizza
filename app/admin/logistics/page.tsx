import { LogisticsHubs } from '@/components/admin/LogisticsHubs';
import { getLogisticsData, getCountries } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminLogisticsPage() {
  const [corridors, countries] = await Promise.all([
    getLogisticsData(),
    getCountries(),
  ]);

  return <LogisticsHubs corridors={corridors} countries={countries} />;
}
