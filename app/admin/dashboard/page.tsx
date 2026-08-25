import { OpsDashboard } from '@/components/admin/OpsDashboard';
import { INITIAL_LEADS, INITIAL_ACTIVITIES } from '@/lib/mockData';

export default function AdminDashboard() {
  return <OpsDashboard leads={INITIAL_LEADS} activities={INITIAL_ACTIVITIES} />;
}
