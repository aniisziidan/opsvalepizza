import { OpsDashboard } from '@/components/admin/OpsDashboard';
import { getDashboardStats } from '@/lib/admin/queries';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const stats = await getDashboardStats();
  return <OpsDashboard stats={stats} />;
}
