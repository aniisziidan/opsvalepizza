import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getAdminUsers, getAdminAuditLogs, getSystemDiagnostics } from '@/lib/admin/queries';
import { getNotificationPreferences } from '@/lib/notifications/queries';
import { SettingsView } from '@/components/admin/SettingsView';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const currentAdmin = await requireAdmin();
  const [adminUsers, auditLogs, diagnostics, notificationPreferences] = await Promise.all([
    getAdminUsers(),
    getAdminAuditLogs(),
    getSystemDiagnostics(),
    getNotificationPreferences(currentAdmin.id),
  ]);

  const serializedPreferences = notificationPreferences.map((p) => ({
    category: p.category,
    inApp: p.inApp,
    browserPush: p.browserPush,
    email: p.email,
  }));

  return (
    <SettingsView
      currentAdminEmail={currentAdmin.email}
      adminUsers={adminUsers}
      auditLogs={auditLogs}
      diagnostics={diagnostics}
      initialPreferences={serializedPreferences}
    />
  );
}
