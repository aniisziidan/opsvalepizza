'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QuoteRow } from '@/lib/admin/queries';
import { dispatchQuote, getProposalShareUrl } from '@/app/admin/leads/[id]/quote-actions';
import { formatCurrency, timeAgo } from '@/lib/admin/formatters';

interface QuotesListProps {
  quotes: QuoteRow[];
  currentFilter?: string;
  currentSearch?: string;
}

export const QuotesList: React.FC<QuotesListProps> = ({
  quotes,
  currentFilter = 'ALL',
  currentSearch = '',
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(currentSearch);
  const [statusFilter, setStatusFilter] = useState(currentFilter);
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const filters = [
    { id: 'ALL', label: 'All Quotes' },
    { id: 'DRAFT', label: 'Draft' },
    { id: 'DISPATCHING', label: 'Dispatching' },
    { id: 'SENT', label: 'Sent (Active)' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'REJECTED', label: 'Declined' },
    { id: 'SUPERSEDED', label: 'Superseded' },
    { id: 'EXPIRED', label: 'Expired' },
  ];

  const handleFilterChange = (filterId: string) => {
    setStatusFilter(filterId);
    const params = new URLSearchParams(searchParams.toString());
    if (filterId === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', filterId);
    }
    router.push(`/admin/quotes?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set('search', search.trim());
    } else {
      params.delete('search');
    }
    router.push(`/admin/quotes?${params.toString()}`);
  };

  const handleDispatch = (quoteId: string) => {
    setDispatchError(null);
    startTransition(async () => {
      try {
        await dispatchQuote(quoteId);
        router.refresh();
      } catch (err: any) {
        setDispatchError(err.message || 'Failed to dispatch quote');
      }
    });
  };

  const handleCopyLink = async (quoteId: string) => {
    try {
      const res = await getProposalShareUrl(quoteId);
      if (res.url) {
        navigator.clipboard?.writeText(res.url);
        setCopiedQuoteId(quoteId);
        setTimeout(() => setCopiedQuoteId(null), 2500);
      } else {
        alert('Proposal link not available yet (quote must be dispatched).');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to copy proposal link');
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-8 bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            Commercial Pipeline &amp; Proposals
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Wholesale Commercial Quotes
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Formal pricing proposals, customer revision history, and interactive proposal status tracking.
          </p>
        </div>
      </div>

      {dispatchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{dispatchError}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Status Filter Chips */}
          <div className="flex flex-wrap gap-1.5 font-mono-data text-xs">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => handleFilterChange(f.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-[#041632] text-white'
                    : 'bg-[#f8f9ff] text-[#44474d] hover:bg-[#eff4ff] border border-[#c5c6ce]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Search code, company, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg px-3 py-1.5 font-mono-data text-xs outline-none focus:ring-2 focus:ring-[#041632] w-full md:w-64"
            />
            <button
              type="submit"
              className="bg-[#041632] text-white px-4 py-1.5 rounded-lg font-mono-data text-xs uppercase font-bold hover:bg-[#1b2b48] cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-data text-xs">
            <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Quote Ref</th>
                <th className="py-3 px-4">Account / Contact</th>
                <th className="py-3 px-4">Order Batch</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Total Net</th>
                <th className="py-3 px-4">Status &amp; Validity</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5c6ce]/50">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#75777e]">
                    <span className="material-symbols-outlined text-3xl text-[#c5c6ce] block mb-2">
                      request_quote
                    </span>
                    No quote proposals found matching the selected filter.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#f8f9ff]">
                    <td className="py-3 px-4">
                      <span className="font-bold text-[#041632] block">
                        {q.leadCode}-R{q.revision}
                      </span>
                      <span className="text-[10px] text-[#75777e]">Revision {q.revision}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/leads/${q.leadId}`}
                        className="font-bold text-[#041632] hover:text-[#e77114] block"
                      >
                        {q.companyName}
                      </Link>
                      <span className="text-[10px] text-[#75777e]">
                        {q.contactName} ({q.contactEmail || ''})
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      {q.qty.toLocaleString()} pcs
                    </td>
                    <td className="py-3 px-4 font-bold text-[#e77114]">
                      {formatCurrency(q.unitPriceEur)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      €{Number(q.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                          q.status === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : q.status === 'DISPATCHING'
                            ? 'bg-indigo-100 text-indigo-800'
                            : q.status === 'SENT'
                            ? q.isExpired
                              ? 'bg-gray-200 text-gray-700'
                              : 'bg-blue-100 text-blue-800'
                            : q.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {q.status === 'SENT' && q.isExpired ? 'EXPIRED' : q.status}
                      </span>
                      {q.expiresAt && q.status === 'SENT' && !q.isExpired && (
                        <span className="block text-[9px] text-[#75777e] mt-0.5">
                          Exp: {new Date(q.expiresAt).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#75777e] text-[11px] whitespace-nowrap">
                      {timeAgo(q.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {q.status === 'DRAFT' && (
                          <button
                            onClick={() => handleDispatch(q.id)}
                            disabled={isPending}
                            className="bg-[#e77114] hover:bg-[#c25e10] text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Dispatch
                          </button>
                        )}

                        {q.status === 'DISPATCHING' && (
                          <button
                            onClick={() => handleDispatch(q.id)}
                            disabled={isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Retry
                          </button>
                        )}

                        {(q.status === 'SENT' || q.status === 'ACCEPTED') && q.hasAccessToken && (
                          <>
                            <button
                              onClick={() => handleCopyLink(q.id)}
                              className="text-[#041632] hover:text-[#e77114] p-1 rounded hover:bg-[#eff4ff] cursor-pointer"
                              title={copiedQuoteId === q.id ? 'Copied!' : 'Copy Proposal Link'}
                            >
                              <span className="material-symbols-outlined text-base">
                                {copiedQuoteId === q.id ? 'check' : 'link'}
                              </span>
                            </button>

                            <button
                              onClick={async () => {
                                const res = await getProposalShareUrl(q.id);
                                if (res.url) window.open(res.url, '_blank');
                              }}
                              className="text-[#041632] hover:text-[#e77114] p-1 rounded hover:bg-[#eff4ff] cursor-pointer"
                              title="Open Customer Proposal"
                            >
                              <span className="material-symbols-outlined text-base">open_in_new</span>
                            </button>
                          </>
                        )}

                        <a
                          href={`/api/admin/quotes/${q.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#041632] hover:text-[#e77114] p-1 rounded hover:bg-[#eff4ff] cursor-pointer"
                          title="Download Commercial Proposal PDF"
                        >
                          <span className="material-symbols-outlined text-base text-[#e77114]">picture_as_pdf</span>
                        </a>

                        <Link
                          href={`/admin/leads/${q.leadId}`}
                          className="text-[#041632] hover:text-[#e77114] p-1 rounded hover:bg-[#eff4ff] cursor-pointer"
                          title="Open Lead Dossier"
                        >
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </Link>
                      </div>
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
