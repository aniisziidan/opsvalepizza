'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LeadSummaryRow, PaginatedResult } from '@/lib/admin/queries';
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LeadStatus } from '@/lib/types';
import { formatNumber } from '@/lib/admin/formatters';

interface AdminLeadsListProps {
  initialData: PaginatedResult<LeadSummaryRow>;
}

export const AdminLeadsList: React.FC<AdminLeadsListProps> = ({ initialData }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const allStatuses: LeadStatus[] = [
    'NEW',
    'REVIEWING',
    'NEED_MORE_INFO',
    'QUOTE_PREPARED',
    'QUOTE_SENT',
    'NEGOTIATING',
    'WON',
    'LOST',
  ];

  const filteredLeads = initialData.items.filter((lead) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      lead.company.name.toLowerCase().includes(term) ||
      lead.contact.name.toLowerCase().includes(term) ||
      lead.contact.email.toLowerCase().includes(term) ||
      lead.code.toLowerCase().includes(term) ||
      lead.location.toLowerCase().includes(term);

    const matchesStatus = filterStatus === 'ALL' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-6 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            European Accounts Directory
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Leads &amp; Inbound Inquiries
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Manage qualified pizzeria chains, volume metrics, and active procurement pipelines.
          </p>
        </div>

        <Link
          href="/quote"
          className="bg-[#e77114] text-white px-5 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create New Lead
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#c5c6ce] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#75777e] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company, name, email, code..."
            className="w-full pl-10 pr-4 py-2 bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg font-body text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#041632]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto font-mono-data text-xs">
          <span className="text-[#75777e] whitespace-nowrap">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg px-3 py-2 text-[#041632] font-semibold outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses ({initialData.totalCount})</option>
            {allStatuses.map((st) => (
              <option key={st} value={st}>
                {LEAD_STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-[#75777e] font-mono-data text-sm space-y-2">
            <span className="material-symbols-outlined text-4xl text-[#c5c6ce] block">
              folder_off
            </span>
            <p className="font-bold text-[#041632]">No leads found</p>
            <p className="text-xs">
              {searchTerm || filterStatus !== 'ALL'
                ? 'Try adjusting your search query or status filter.'
                : 'Inbound quote requests from the website will appear here automatically.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead className="bg-[#eff4ff] border-b border-[#c5c6ce] font-mono-data text-[11px] text-[#041632] uppercase">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Company &amp; Contact</th>
                  <th className="py-3 px-4">Target Specs</th>
                  <th className="py-3 px-4">Monthly Vol</th>
                  <th className="py-3 px-4">Est. Max Savings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/60">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => router.push(`/admin/leads/${lead.id}`)}
                    className="hover:bg-[#f8f9ff] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono-data font-bold text-[#041632]">
                      {lead.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <strong className="text-[#041632] block text-sm">
                        {lead.company.name}
                      </strong>
                      <span className="text-[#75777e] text-[11px]">
                        {lead.contact.name} • {lead.location}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono-data text-[11px] text-[#44474d] max-w-[200px] truncate">
                      {lead.boxSpec}
                    </td>
                    <td className="py-3.5 px-4 font-mono-data font-bold text-[#041632]">
                      {formatNumber(lead.monthlyVolume)} pcs
                    </td>
                    <td className="py-3.5 px-4 font-mono-data font-bold text-[#e77114]">
                      {lead.estYearlySavingsMax
                        ? `€${Number(lead.estYearlySavingsMax).toLocaleString()}/yr`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded font-mono-data text-[10px] font-bold ${
                          LEAD_STATUS_STYLE[lead.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {lead.statusLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-block bg-[#041632] text-white px-3 py-1.5 rounded font-mono-data text-[11px] hover:bg-[#1b2b48] transition-colors cursor-pointer font-semibold"
                      >
                        Dossier
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
