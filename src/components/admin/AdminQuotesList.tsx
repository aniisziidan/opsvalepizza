import React from 'react';
import { Lead } from '../../types';

interface AdminQuotesListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const AdminQuotesList: React.FC<AdminQuotesListProps> = ({ leads, onSelectLead }) => {
  const quoteRows = [
    { id: 'Q-4921', lead: leads[1] || leads[0], amount: '€28,400', date: 'Oct 24, 2024', status: 'Pending Review', terms: 'Net 30' },
    { id: 'Q-4919', lead: leads[0], amount: '€47,250', date: 'Oct 22, 2024', status: 'Approved / Sent', terms: 'Net 45' },
    { id: 'Q-4908', lead: leads[2] || leads[0], amount: '€68,200', date: 'Oct 18, 2024', status: 'In Negotiation', terms: 'Net 60' },
    { id: 'Q-4892', lead: leads[3] || leads[0], amount: '€112,000', date: 'Oct 14, 2024', status: 'Accepted / Won', terms: 'Net 30' },
  ];

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-6 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            Procurement Proposals
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Wholesale Quotes &amp; Contracts
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Track formal commercial offers, freight rate surcharges, and signed supply contracts.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body text-xs">
            <thead className="bg-[#eff4ff] border-b border-[#c5c6ce] font-mono-data text-[11px] text-[#041632] uppercase">
              <tr>
                <th className="py-3 px-4">Quote #</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Order Value</th>
                <th className="py-3 px-4">Payment Terms</th>
                <th className="py-3 px-4">Date Issued</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5c6ce]/60 font-mono-data text-xs">
              {quoteRows.map((q) => (
                <tr key={q.id} className="hover:bg-[#f8f9ff] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#041632]">{q.id}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-body font-bold text-sm text-[#041632] block">{q.lead.companyName}</span>
                    <span className="text-[#75777e] text-[11px]">{q.lead.contactName}</span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#e77114] text-sm">{q.amount}</td>
                  <td className="py-3.5 px-4 text-[#44474d]">{q.terms}</td>
                  <td className="py-3.5 px-4 text-[#75777e]">{q.date}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded text-[10px] font-bold">
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectLead(q.lead)}
                      className="bg-[#041632] text-white px-3 py-1.5 rounded font-mono-data text-[11px] hover:bg-[#1b2b48] cursor-pointer"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
