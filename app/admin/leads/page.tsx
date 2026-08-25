import { AdminLeadsList } from '@/components/admin/AdminLeadsList';
import { INITIAL_LEADS } from '@/lib/mockData';

export default function AdminLeads() {
  return <AdminLeadsList leads={INITIAL_LEADS} />;
}
