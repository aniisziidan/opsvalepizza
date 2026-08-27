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
import { Role, AdminAuditAction } from '@prisma/client';
import { formatDateTime, timeAgo } from '@/lib/admin/formatters';

interface SettingsViewProps {
  currentAdminEmail: string;
  adminUsers: AdminUserRow[];
  auditLogs: AdminAuditLogRow[];
  diagnostics: SystemDiagnosticsData;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentAdminEmail,
  adminUsers,
  auditLogs,
  diagnostics,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'diagnostics'>('users');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

      {/* TAB 2: AUDIT TRAIL */}
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
