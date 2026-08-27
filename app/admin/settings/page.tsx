import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getAdminUsers, getAdminAuditLogs, getSystemDiagnostics } from '@/lib/admin/queries';
import { SettingsView } from '@/components/admin/SettingsView';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const currentAdmin = await requireAdmin();
  const [adminUsers, auditLogs, diagnostics] = await Promise.all([
    getAdminUsers(),
    getAdminAuditLogs(),
    getSystemDiagnostics(),
  ]);

  return (
    <SettingsView
      currentAdminEmail={currentAdmin.email}
      adminUsers={adminUsers}
      auditLogs={auditLogs}
      diagnostics={diagnostics}
    />
  );
}
