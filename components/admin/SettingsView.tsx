'use client';

import React, { useState, useTransition } from 'react';
import { AdminUserRow, AdminAuditLogRow, SystemDiagnosticsData } from '@/lib/admin/queries';
import {
  createAdminUser,
  updateAdminUser,
  updateAdminUserRole,
  toggleAdminUserActive,
  resetAdminPassword,
} from '@/app/admin/settings/actions';
import { Role, AdminAuditAction, NotificationCategory } from '@prisma/client';
import { formatDateTime, timeAgo } from '@/lib/admin/formatters';
import {
  registerPushSubscriptionAction,
  removePushSubscriptionAction,
  updateNotificationPreferencesAction,
} from '@/lib/notifications/actions';

interface PreferenceState {
  category: NotificationCategory;
  inApp: boolean;
  browserPush: boolean;
  email: boolean;
}

interface SettingsViewProps {
  currentAdminEmail: string;
  adminUsers: AdminUserRow[];
  auditLogs: AdminAuditLogRow[];
  diagnostics: SystemDiagnosticsData;
  initialPreferences?: PreferenceState[];
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentAdminEmail,
  adminUsers,
  auditLogs,
  diagnostics,
  initialPreferences = [],
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'audit' | 'diagnostics'>('users');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Notification Preferences State
  const ALL_CATEGORIES: NotificationCategory[] = [
    'CUSTOMER_ACTIVITY',
    'PROPOSAL',
    'QUOTE',
    'PRICING',
    'LOGISTICS',
    'SYSTEM',
  ];

  const defaultPreferences: PreferenceState[] = ALL_CATEGORIES.map((cat) => {
    const existing = initialPreferences.find((p) => p.category === cat);
    return {
      category: cat,
      inApp: existing ? existing.inApp : true,
      browserPush: existing ? existing.browserPush : true,
      email: existing ? existing.email : cat === 'PROPOSAL' || cat === 'SYSTEM',
    };
  });

  const [preferences, setPreferences] = useState<PreferenceState[]>(defaultPreferences);
  const [pushStatus, setPushStatus] = useState<'checking' | 'granted' | 'denied' | 'default' | 'unsupported'>('checking');
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }

    setPushStatus(Notification.permission as any);

    navigator.serviceWorker.ready
      .then(async (registration) => {
        const sub = await registration.pushManager.getSubscription();
        setIsPushSubscribed(Boolean(sub));
      })
      .catch(() => {});
  }, []);

  const handleTogglePush = async () => {
    if (pushStatus === 'unsupported') {
      alert('Browser Push notifications are not supported on this browser/device.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isPushSubscribed) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await removePushSubscriptionAction(sub.endpoint);
        }
        setIsPushSubscribed(false);
        setSuccessMsg('Browser push notifications deactivated for this device.');
      } else {
        const permission = await Notification.requestPermission();
        setPushStatus(permission as any);

        if (permission !== 'granted') {
          setErrorMsg('Notification permission was not granted. Please allow notifications in your browser settings.');
          return;
        }

        const vapidRes = await fetch('/api/admin/push/vapid-key');
        if (!vapidRes.ok) throw new Error('Failed to retrieve VAPID public key');
        const vapidData = await vapidRes.json();

        if (!vapidData.publicKey) {
          setErrorMsg('VAPID public key is not configured on the server. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your environment.');
          return;
        }

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const convertedKey = urlBase64ToUint8Array(vapidData.publicKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        const subJson = subscription.toJSON();
        if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
          throw new Error('Invalid push subscription keys returned by browser.');
        }

        await registerPushSubscriptionAction({
          endpoint: subJson.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
          userAgent: navigator.userAgent,
        });

        setIsPushSubscribed(true);
        setSuccessMsg('Browser push notifications activated successfully!');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to configure push notifications');
    }
  };

  const handlePreferenceChange = (
    category: NotificationCategory,
    channel: 'inApp' | 'browserPush' | 'email',
    value: boolean
  ) => {
    setPreferences((prev) =>
      prev.map((p) => (p.category === category ? { ...p, [channel]: value } : p))
    );
  };

  const handleSavePreferences = () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await updateNotificationPreferencesAction(preferences);
        setSuccessMsg('Notification preferences updated successfully.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to save notification preferences');
      }
    });
  };

  // Modal 1: Create User
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.SALES);
  const [newPassword, setNewPassword] = useState('');

  // Modal 2: Reset Password
  const [resetTargetUser, setResetTargetUser] = useState<AdminUserRow | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  // Modal 3: Edit User Details (Name, Email, Role)
  const [editTargetUser, setEditTargetUser] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<Role>(Role.SALES);

  const openEditModal = (u: AdminUserRow) => {
    setEditTargetUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setErrorMsg(null);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetUser) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await updateAdminUser(editTargetUser.id, {
          name: editName,
          email: editEmail,
          role: editRole,
        });
        setEditTargetUser(null);
        setSuccessMsg(`Administrator account for "${editName}" updated successfully.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update user');
      }
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await createAdminUser({
          name: newName,
          email: newEmail,
          role: newRole,
          password: newPassword,
        });
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setSuccessMsg(`Administrator account for "${newEmail}" created successfully.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to create user');
      }
    });
  };

  const handleRoleChange = (userId: string, targetRole: Role) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await updateAdminUserRole(userId, { role: targetRole });
        setSuccessMsg('Administrator role updated successfully.');
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update role');
      }
    });
  };

  const handleToggleActive = (userId: string, currentActive: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await toggleAdminUserActive(userId, !currentActive);
        setSuccessMsg(`Administrator ${!currentActive ? 'activated' : 'deactivated'} successfully.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to update user status');
      }
    });
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await resetAdminPassword(resetTargetUser.id, { password: resetPasswordVal });
        setResetTargetUser(null);
        setResetPasswordVal('');
        setSuccessMsg(`Password for ${resetTargetUser.name} reset successfully.`);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to reset password');
      }
    });
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'SALES':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'PRICING':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionBadge = (action: AdminAuditAction) => {
    switch (action) {
      case 'ADMIN_CREATED':
        return 'bg-emerald-100 text-emerald-800';
      case 'ADMIN_ROLE_CHANGED':
        return 'bg-blue-100 text-blue-800';
      case 'ADMIN_ACTIVATED':
        return 'bg-teal-100 text-teal-800';
      case 'ADMIN_DEACTIVATED':
        return 'bg-red-100 text-red-800';
      case 'ADMIN_PASSWORD_RESET':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-8 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            System Administration
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Settings &amp; Access Governance
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Manage administrator credentials, role-based access permissions, audit logs, and infrastructure diagnostics.
          </p>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#041632] hover:bg-[#1b2b48] text-white px-4 py-2 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-base text-[#e77114]">person_add</span>
            Add Administrator
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#c5c6ce] font-mono-data text-xs font-bold">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'users'
              ? 'border-[#041632] text-[#041632]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">manage_accounts</span>
          Admin Accounts ({adminUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'notifications'
              ? 'border-[#041632] text-[#041632]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">notifications_active</span>
          Notifications &amp; Browser Push
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'audit'
              ? 'border-[#041632] text-[#041632]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          Governance Audit Trail ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'diagnostics'
              ? 'border-[#041632] text-[#041632]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">dns</span>
          Infrastructure Diagnostics
        </button>
      </div>

      {/* TAB 1: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Role Permission</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50">
                {adminUsers.map((u) => {
                  const isSelf = u.email === currentAdminEmail;
                  return (
                    <tr key={u.id} className="hover:bg-[#f8f9ff]">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#041632]">{u.name}</span>
                          {isSelf && (
                            <span className="bg-[#e3c290] text-[#041632] text-[9px] px-1.5 py-0.5 rounded font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#75777e] block">{u.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          disabled={isPending}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className={`border px-2 py-1 rounded text-xs font-bold outline-none cursor-pointer ${getRoleBadgeStyle(
                            u.role
                          )}`}
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="SALES">SALES</option>
                          <option value="PRICING">PRICING</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleActive(u.id, u.active)}
                          disabled={isPending}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                            u.active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {u.active ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[#75777e]">{formatDateTime(u.createdAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="text-[#041632] hover:text-[#e77114] font-bold text-[11px] cursor-pointer px-2 py-1 rounded hover:bg-[#eff4ff] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setResetPasswordVal('');
                            }}
                            className="text-[#75777e] hover:text-[#041632] font-bold text-[11px] cursor-pointer px-2 py-1 rounded hover:bg-[#eff4ff] flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">key</span>
                            Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NOTIFICATIONS & BROWSER PUSH */}
      {activeTab === 'notifications' && (
        <div className="space-y-6 font-mono-data text-xs">
          {/* Section 1: Browser Push Notifications */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2e4ef] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#e77114] mb-1">
                  <span className="material-symbols-outlined">notifications_active</span>
                  <h3 className="font-headline text-base font-bold text-[#041632]">
                    Browser Web Push Notifications
                  </h3>
                </div>
                <p className="text-[#44474d] text-xs font-body">
                  Receive instant desktop &amp; mobile alerts for critical customer responses and operational failures, even when the OpsVale portal is closed.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={isPending || pushStatus === 'unsupported'}
                  className={`px-4 py-2.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 ${
                    isPushSubscribed
                      ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                      : 'bg-[#e77114] hover:bg-[#c25e10] text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isPushSubscribed ? 'notifications_off' : 'notifications'}
                  </span>
                  <span>{isPushSubscribed ? 'Disable on This Device' : 'Enable Browser Push'}</span>
                </button>
              </div>
            </div>

            {/* Status Information Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3">
                <span className="text-[#75777e] text-[10px] uppercase font-bold block mb-1">
                  Browser Permission
                </span>
                <span
                  className={`font-bold capitalize ${
                    pushStatus === 'granted'
                      ? 'text-emerald-700'
                      : pushStatus === 'denied'
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {pushStatus}
                </span>
              </div>

              <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3">
                <span className="text-[#75777e] text-[10px] uppercase font-bold block mb-1">
                  Device Subscription
                </span>
                <span className={`font-bold ${isPushSubscribed ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {isPushSubscribed ? 'Active & Subscribed' : 'Not Subscribed'}
                </span>
              </div>

              <div className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3">
                <span className="text-[#75777e] text-[10px] uppercase font-bold block mb-1">
                  Standards Protocol
                </span>
                <span className="font-bold text-[#041632]">VAPID / Web Push RFC 8291</span>
              </div>
            </div>

            {pushStatus === 'denied' && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-lg flex items-center gap-2 text-xs">
                <span className="material-symbols-outlined text-base text-amber-600 flex-shrink-0">info</span>
                <span>
                  Notifications are blocked by your browser settings. To enable, click the lock icon in your address bar and allow Notifications.
                </span>
              </div>
            )}
          </div>

          {/* Section 2: Channel Preference Matrix */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#c5c6ce] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-headline text-base font-bold text-[#041632]">
                  Notification Delivery Preferences
                </h3>
                <p className="text-[#44474d] text-xs font-body mt-0.5">
                  Customize which communication channels receive alerts for each category.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isPending}
                className="bg-[#041632] hover:bg-[#1b2b48] text-white px-5 py-2 rounded-lg font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
              >
                <span className="material-symbols-outlined text-base text-[#ffdeac]">save</span>
                Save Preferences
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-data text-xs">
                <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Event Category &amp; Scope</th>
                    <th className="py-3 px-4 text-center">In-App Bell</th>
                    <th className="py-3 px-4 text-center">Browser Push</th>
                    <th className="py-3 px-4 text-center">Email Alert</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c6ce]/50">
                  {preferences.map((p) => {
                    const categoryTitles: Record<NotificationCategory, { name: string; desc: string }> = {
                      CUSTOMER_ACTIVITY: {
                        name: 'Customer Activity',
                        desc: 'Client replies, modification requests, document uploads, and inquiry messages.',
                      },
                      PROPOSAL: {
                        name: 'Commercial Proposals',
                        desc: 'Proposal acceptance confirmations, PO notes, rejections, and expiry warnings.',
                      },
                      QUOTE: {
                        name: 'Inbound Quote Requests',
                        desc: 'New wholesale packaging inquiries submitted via public website.',
                      },
                      PRICING: {
                        name: 'Pricing & Margins',
                        desc: 'Excel pricing imports, version updates, and bulk concurrency conflicts.',
                      },
                      LOGISTICS: {
                        name: 'Logistics & Hubs',
                        desc: 'Logistics cost changes, hub route adjustments, and SLA warnings.',
                      },
                      SYSTEM: {
                        name: 'System & Health Alerts',
                        desc: 'Database connectivity issues, health check anomalies, and outbox email retry failures.',
                      },
                      SECURITY: {
                        name: 'Security & Governance',
                        desc: 'Administrative permission changes, credential resets, and account audits.',
                      },
                      ANALYTICS: {
                        name: 'Visitor & Traffic Alerts',
                        desc: 'Website traffic anomalies, market opportunity surges, and conversion drop-offs.',
                      },
                    };

                    const info = categoryTitles[p.category] || { name: p.category, desc: '' };

                    return (
                      <tr key={p.category} className="hover:bg-[#f8f9ff]">
                        <td className="py-3.5 px-4">
                          <strong className="text-[#041632] block text-xs">{info.name}</strong>
                          <span className="text-[#75777e] text-[11px] font-body block">{info.desc}</span>
                        </td>

                        {/* In-App */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.inApp}
                            onChange={(e) =>
                              handlePreferenceChange(p.category, 'inApp', e.target.checked)
                            }
                            className="w-4 h-4 text-[#e77114] rounded border-[#c5c6ce] focus:ring-[#e77114] cursor-pointer"
                          />
                        </td>

                        {/* Browser Push */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.browserPush}
                            onChange={(e) =>
                              handlePreferenceChange(p.category, 'browserPush', e.target.checked)
                            }
                            className="w-4 h-4 text-[#e77114] rounded border-[#c5c6ce] focus:ring-[#e77114] cursor-pointer"
                          />
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.email}
                            onChange={(e) =>
                              handlePreferenceChange(p.category, 'email', e.target.checked)
                            }
                            className="w-4 h-4 text-[#e77114] rounded border-[#c5c6ce] focus:ring-[#e77114] cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#75777e]">
                      No administrative audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f8f9ff]">
                      <td className="py-3 px-4 text-[#75777e] whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#041632]">{log.actorAdminName}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadge(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <strong className="text-[#041632]">{log.targetAdminName}</strong>
                        <span className="text-[10px] text-[#75777e] block">{log.targetAdminEmail}</span>
                      </td>
                      <td className="py-3 px-4 text-[#44474d] text-[11px]">
                        {log.oldValue || log.newValue ? (
                          <pre className="bg-[#f8f9ff] p-1.5 rounded border border-[#e2e4ef] text-[10px]">
                            {JSON.stringify({ old: log.oldValue, new: log.newValue }, null, 2)}
                          </pre>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DIAGNOSTICS & PERMISSION MATRIX */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-mono-data text-xs">
            {/* Storage */}
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#e77114]">
                <span className="material-symbols-outlined">cloud_sync</span>
                <span className="font-bold text-xs uppercase">Object Storage</span>
              </div>
              <span className="font-bold text-base text-[#041632] block">
                {diagnostics.storage.provider}
              </span>
              <span className="text-[11px] text-[#75777e] block">
                Status: <strong className="text-emerald-700">{diagnostics.storage.status}</strong>
                {diagnostics.storage.bucket ? ` (${diagnostics.storage.bucket})` : ''}
              </span>
            </div>

            {/* Email */}
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#e77114]">
                <span className="material-symbols-outlined">mail</span>
                <span className="font-bold text-xs uppercase">Email Dispatch</span>
              </div>
              <span className="font-bold text-base text-[#041632] block">
                {diagnostics.email.transporter}
              </span>
              <span className="text-[11px] text-[#75777e] block">
                Mode: <strong className="text-[#041632]">{diagnostics.email.status}</strong>
              </span>
            </div>

            {/* Database */}
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#e77114]">
                <span className="material-symbols-outlined">database</span>
                <span className="font-bold text-xs uppercase">PostgreSQL Database</span>
              </div>
              <span className="font-bold text-base text-emerald-700 block">
                {diagnostics.database.status}
              </span>
              <span className="text-[11px] text-[#75777e] block">
                Safe Ping Latency: <strong>{diagnostics.database.latencyMs} ms</strong>
              </span>
            </div>

            {/* Environment */}
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#e77114]">
                <span className="material-symbols-outlined">settings_suggest</span>
                <span className="font-bold text-xs uppercase">Runtime Target</span>
              </div>
              <span className="font-bold text-base text-[#041632] block">
                {diagnostics.environment}
              </span>
              <span className="text-[11px] text-[#75777e] block">
                Node.js Standard Engine
              </span>
            </div>
          </div>

          {/* Role Permission Matrix */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-headline text-lg font-bold text-[#041632]">
              Administrative Role Permission Matrix
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-data text-xs">
                <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">System Operation</th>
                    <th className="py-2.5 px-4 text-center">SUPER_ADMIN</th>
                    <th className="py-2.5 px-4 text-center">SALES</th>
                    <th className="py-2.5 px-4 text-center">PRICING</th>
                    <th className="py-2.5 px-4 text-center">VIEWER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c6ce]/50 text-[#44474d]">
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">Admin Users &amp; Role Governance</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">Reset Other Admin Passwords</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">View Leads &amp; Detail Dossiers</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">Edit Lead Status &amp; Add CRM Notes</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">Prepare &amp; Dispatch Commercial Quotes</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">Create / Edit Pricing Rules &amp; Margins</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-gray-400">NO</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-bold text-[#041632]">View Pricing Engine &amp; Audit Trail</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                    <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">YES</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW ADMINISTRATOR */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Add New Administrator</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marco Rossi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. marco@opsvale.eu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs font-bold"
                >
                  <option value="SALES">SALES (Leads &amp; Quote Dispatch)</option>
                  <option value="PRICING">PRICING (Landed Costs &amp; Margins)</option>
                  <option value="VIEWER">VIEWER (Read-Only Access)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Initial Password (Min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#041632] text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-[#1b2b48] cursor-pointer disabled:opacity-50"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD */}
      {resetTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Reset Password for {resetTargetUser.name}
              </h3>
              <button
                onClick={() => setResetTargetUser(null)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">
                  New Password (Minimum 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••••••"
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || resetPasswordVal.length < 8}
                  className="bg-[#e77114] text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-[#c25e10] cursor-pointer disabled:opacity-50"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ADMINISTRATOR (NAME, EMAIL, ROLE) */}
      {editTargetUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Edit Administrator Details
              </h3>
              <button
                onClick={() => setEditTargetUser(null)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Account Name / Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anis Zidan"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs font-bold text-[#041632]"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Email Address (Login Username)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@opsvale.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs text-[#041632]"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Role Permission</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as Role)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs font-bold"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Authority)</option>
                  <option value="SALES">SALES (Leads &amp; Quote Dispatch)</option>
                  <option value="PRICING">PRICING (Landed Costs &amp; Margins)</option>
                  <option value="VIEWER">VIEWER (Read-Only Access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTargetUser(null)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !editName.trim() || !editEmail.trim()}
                  className="bg-[#041632] text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-[#1b2b48] cursor-pointer disabled:opacity-50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
