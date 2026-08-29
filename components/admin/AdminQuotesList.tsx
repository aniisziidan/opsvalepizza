import React from 'react';
import Link from 'next/link';
import { QuoteRow } from '@/lib/admin/queries';
import { formatCurrency, formatNumber, formatDateTime } from '@/lib/admin/formatters';

interface AdminQuotesListProps {
  quotes: QuoteRow[];
}

export const AdminQuotesList: React.FC<AdminQuotesListProps> = ({ quotes }) => {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-6 bg-[#f8f9ff]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            Procurement Proposals
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Wholesale Quotes &amp; Contracts
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Track formal commercial proposals, revision history, and signed procurement supply contracts.
          </p>
        </div>

        <Link
          href="/admin/leads"
          className="bg-[#041632] text-white px-5 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#1b2b48] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span className="material-symbols-outlined text-base">group</span>
          Open Leads Directory
        </Link>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        {quotes.length === 0 ? (
          <div className="p-12 text-center text-[#75777e] font-mono-data text-sm space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#c5c6ce] block">
              receipt_long
            </span>
            <p className="font-bold text-[#041632] text-base">No formal quotes created yet</p>
            <p className="text-xs max-w-md mx-auto text-[#44474d]">
              Quotes will appear here once formal wholesale pricing proposals are prepared and issued for qualified leads from their dossiers.
            </p>
            <div className="pt-2">
              <Link
                href="/admin/leads"
                className="inline-flex items-center gap-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] px-4 py-2 rounded-lg font-mono-data text-xs font-bold border border-[#c5c6ce] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                Browse Qualified Leads
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body text-xs">
              <thead className="bg-[#eff4ff] border-b border-[#c5c6ce] font-mono-data text-[11px] text-[#041632] uppercase">
                <tr>
                  <th className="py-3 px-4">Quote Ref / Rev</th>
                  <th className="py-3 px-4">Account &amp; Contact</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Order Qty</th>
                  <th className="py-3 px-4">Total Contract Value</th>
                  <th className="py-3 px-4">Date Issued</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/60 font-mono-data text-xs">
                {quotes.map((q) => {
                  const unitPrice = parseFloat(q.unitPriceEur) || 0;
                  const totalValue = unitPrice * q.qty;

                  return (
                    <tr key={q.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#041632]">
                        {q.leadCode} <span className="text-[#75777e] font-normal">(Rev {q.revision})</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-body font-bold text-sm text-[#041632] block">
                          {q.companyName}
                        </span>
                        <span className="text-[#75777e] text-[11px]">{q.contactName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#041632]">
                        {formatCurrency(q.unitPriceEur)}
                      </td>
                      <td className="py-3.5 px-4 text-[#44474d]">
                        {formatNumber(q.qty)} pcs
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#e77114] text-sm">
                        {formatCurrency(totalValue)}
                      </td>
                      <td className="py-3.5 px-4 text-[#75777e]">
                        {formatDateTime(q.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded text-[10px] font-bold">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/admin/leads/${q.leadId}`}
                          className="inline-block bg-[#041632] text-white px-3 py-1.5 rounded font-mono-data text-[11px] hover:bg-[#1b2b48] cursor-pointer"
                        >
                          View Dossier
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
