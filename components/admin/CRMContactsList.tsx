'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ContactSummaryRow, PaginatedResult } from '@/lib/admin/queries';
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE } from '@/lib/types';
import { formatDateTime } from '@/lib/admin/formatters';

interface CRMContactsListProps {
  initialData: PaginatedResult<ContactSummaryRow>;
}

export const CRMContactsList: React.FC<CRMContactsListProps> = ({ initialData }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const filteredContacts = initialData.items.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.phone && c.phone.toLowerCase().includes(term)) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(term)) ||
      c.company.name.toLowerCase().includes(term) ||
      (c.company.countryCode && c.company.countryCode.toLowerCase().includes(term)) ||
      (c.latestLead && c.latestLead.code.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-6 bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            B2B Contacts &amp; Decision Makers
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            CRM Contacts Directory
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Direct contact records for pizzeria group owners, procurement directors, and franchise managers.
          </p>
        </div>

        <Link
          href="/quote"
          className="bg-[#e77114] hover:bg-[#c25e10] text-white px-5 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider transition-colors shadow-sm cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Create Inbound Lead</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:w-96">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#75777e] text-lg">
            search
          </span>
          <input
            type="text"
            placeholder="Search by contact name, email, phone, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg font-mono-data text-xs text-[#041632] placeholder-[#75777e] focus:outline-none focus:border-[#e77114]"
          />
        </div>

        <div className="font-mono-data text-xs text-[#75777e] w-full sm:w-auto text-right">
          Total Contacts: <strong className="text-[#041632]">{filteredContacts.length}</strong>
        </div>
      </div>

      {/* Contacts Data Table */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono-data text-xs">
            <thead>
              <tr className="bg-[#f1f3fa] border-b border-[#c5c6ce] text-[#75777e] uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 font-bold">Contact Person</th>
                <th className="py-3.5 px-4 font-bold">Company &amp; Region</th>
                <th className="py-3.5 px-4 font-bold">Direct Channels</th>
                <th className="py-3.5 px-4 font-bold text-center">Inquiries</th>
                <th className="py-3.5 px-4 font-bold">Latest Lead</th>
                <th className="py-3.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5c6ce]/50">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#75777e]">
                    <span className="material-symbols-outlined text-4xl text-[#c5c6ce] mb-2 block">
                      contacts_product
                    </span>
                    <p className="font-bold text-sm text-[#041632]">No CRM contacts found</p>
                    <p className="text-xs mt-1">Try adjusting your search query.</p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-[#f8f9ff] transition-colors"
                  >
                    {/* Contact Person */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#041632] font-bold flex items-center justify-center text-xs flex-shrink-0 border border-[#c5c6ce]">
                          {contact.name[0]?.toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#041632] text-xs truncate">{contact.name}</p>
                          <p className="text-[10px] text-[#75777e] truncate">
                            {contact.jobTitle || 'Procurement Contact'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Company & Country */}
                    <td className="py-4 px-4">
                      <p className="font-bold text-[#041632] truncate max-w-[200px]">
                        {contact.company.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#75777e]">
                        <span className="bg-gray-100 px-1.5 py-0.2 rounded font-semibold text-[#041632]">
                          {contact.company.countryCode || 'EU'}
                        </span>
                        {contact.company.website && (
                          <span className="truncate max-w-[140px] text-[#4f5e7e]">
                            {contact.company.website}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Direct Channels (Email & Phone) */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-[#041632] hover:text-[#e77114] font-semibold truncate max-w-[180px]"
                          title={`Email ${contact.email}`}
                        >
                          {contact.email}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleCopy(contact.email, `email-${contact.id}`)}
                          className="text-[#75777e] hover:text-[#041632] p-0.5 cursor-pointer"
                          title="Copy Email"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {copiedText === `email-${contact.id}` ? 'check' : 'content_copy'}
                          </span>
                        </button>
                      </div>

                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#75777e]">
                          <a
                            href={`tel:${contact.phone}`}
                            className="hover:text-[#041632] truncate max-w-[160px]"
                          >
                            {contact.phone}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(contact.phone!, `phone-${contact.id}`)}
                            className="text-[#75777e] hover:text-[#041632] p-0.5 cursor-pointer"
                            title="Copy Phone"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {copiedText === `phone-${contact.id}` ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#c5c6ce] italic">No phone recorded</span>
                      )}
                    </td>

                    {/* Inquiries Count */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block bg-[#eff4ff] text-[#041632] font-bold px-2 py-0.5 rounded-full text-xs">
                        {contact.leadsCount}
                      </span>
                    </td>

                    {/* Latest Lead Status */}
                    <td className="py-4 px-4">
                      {contact.latestLead ? (
                        <div>
                          <Link
                            href={`/admin/leads/${contact.latestLead.id}`}
                            className="font-bold text-[#e77114] hover:underline block"
                          >
                            {contact.latestLead.code}
                          </Link>
                          <span
                            className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              LEAD_STATUS_STYLE[contact.latestLead.status] || 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {LEAD_STATUS_LABEL[contact.latestLead.status] || contact.latestLead.status}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#75777e] text-[10px] italic">No active leads</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      {contact.latestLead ? (
                        <Link
                          href={`/admin/leads/${contact.latestLead.id}`}
                          className="inline-block bg-[#041632] hover:bg-[#1b2b48] text-white px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-colors cursor-pointer"
                        >
                          Dossier
                        </Link>
                      ) : (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-block bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] border border-[#c5c6ce] px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-colors cursor-pointer"
                        >
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
