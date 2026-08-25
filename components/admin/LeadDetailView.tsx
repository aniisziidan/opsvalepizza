'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadStatus } from '@/lib/types';

interface LeadDetailViewProps {
  lead: Lead;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  lead: initialLead,
}) => {
  // Phase 0: no DB. Status changes and notes are held in local component
  // state (seeded from mock data). Persistence lands in Phase 1.
  const [lead, setLead] = useState<Lead>(initialLead);

  const onUpdateStatus = (_leadId: string, newStatus: LeadStatus) => {
    setLead((prev) => ({
      ...prev,
      status: newStatus,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          author: 'Sarah Jenkins',
          type: 'status_change' as const,
          content: `Changed status to ${newStatus}`,
        },
        ...prev.activityHistory,
      ],
    }));
  };

  const onAddNote = (_leadId: string, noteText: string) => {
    setLead((prev) => ({
      ...prev,
      activityHistory: [
        {
          id: `act-${Date.now()}`,
          timestamp: 'Just now',
          author: 'Sarah Jenkins',
          type: 'note' as const,
          content: noteText,
        },
        ...prev.activityHistory,
      ],
    }));
  };

  const [newNote, setNewNote] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>(`OpsVale Wholesale Packaging Proposal - ${lead.companyName}`);
  const [emailBody, setEmailBody] = useState<string>(
    `Hi ${lead.contactName},\n\nThank you for reaching out regarding wholesale packaging for ${lead.companyName}. We have reviewed your estimated monthly volume of ${lead.calculatorData.monthlyVolume.toLocaleString()} boxes.\n\nBased on your specs for ${lead.calculatorData.primaryBoxSize}, we can offer factory-direct pricing with guaranteed 48h dispatch from our European central hubs.`
  );

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(lead.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(lead.id, newNote);
    setNewNote('');
  };

  const handleSendEmailProposal = (e: React.FormEvent) => {
    e.preventDefault();
    onAddNote(lead.id, `Sent email proposal to ${lead.email} ("${emailSubject}")`);
    setShowEmailModal(false);
    alert(`Email proposal successfully logged and queued for ${lead.email}`);
  };

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-8 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Link
          href="/admin/leads"
          className="font-mono-data text-xs text-[#041632] hover:text-[#e77114] flex items-center gap-2 cursor-pointer font-bold uppercase transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Leads
        </Link>

        <div className="flex items-center gap-3">
          <span className="font-mono-data text-xs text-[#75777e] uppercase font-semibold">Lead Status:</span>
          <select
            value={lead.status}
            onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
            className="bg-white border border-[#c5c6ce] text-[#041632] font-mono-data text-xs px-3 py-1.5 rounded-lg font-bold outline-none cursor-pointer focus:ring-2 focus:ring-[#041632]"
          >
            <option value="New">New</option>
            <option value="Reviewing">Reviewing</option>
            <option value="Quoted">Quoted</option>
            <option value="Negotiation">Negotiation</option>
            <option value="Closed Won">Closed Won</option>
            <option value="Closed Lost">Closed Lost</option>
          </select>
        </div>
      </div>

      {/* Main Dossier Header */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-[#041632] text-white font-mono-data text-xs px-3 py-1 rounded font-bold">
              {lead.code}
            </span>
            <span className={`px-3 py-1 rounded font-mono-data text-xs font-bold ${
              lead.status === 'Closed Won'
                ? 'bg-emerald-100 text-emerald-800'
                : lead.status === 'Reviewing'
                ? 'bg-[#dce9ff] text-[#041632]'
                : lead.status === 'New'
                ? 'bg-[#ffdeac] text-[#735a31]'
                : 'bg-[#eff4ff] text-[#041632]'
            }`}>
              {lead.status}
            </span>
            <span className="font-mono-data text-xs text-[#75777e]">
              Created {lead.createdAt}
            </span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-[#041632]">{lead.companyName}</h1>
          <p className="font-body text-sm text-[#44474d] mt-1">
            {lead.jobTitle} - <strong className="text-[#041632]">{lead.contactName}</strong> • {lead.location}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEmailModal(true)}
            className="bg-[#e77114] text-white px-5 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-base">send</span>
            Send Proposal
          </button>
        </div>
      </div>

      {/* 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (col-span-7 or 8): Details, Specs, Calculator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Contact Information */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e77114]">badge</span>
              Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-data text-xs">
              <div>
                <span className="text-[#75777e] block">Email Address</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-[#041632] text-sm break-all">{lead.email}</span>
                  <button
                    onClick={handleCopyEmail}
                    className="text-[#44474d] hover:text-[#041632] p-1 rounded hover:bg-[#eff4ff] cursor-pointer"
                    title="Copy Email"
                  >
                    <span className="material-symbols-outlined text-base">
                      {copiedEmail ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[#75777e] block">Phone Number</span>
                <span className="font-bold text-[#041632] text-sm block mt-1">{lead.phone}</span>
              </div>

              <div>
                <span className="text-[#75777e] block">HQ / Primary Location</span>
                <span className="font-bold text-[#041632] block mt-1">{lead.location}</span>
              </div>

              <div>
                <span className="text-[#75777e] block">Operating Branches</span>
                <span className="font-bold text-[#041632] block mt-1">{lead.branches} locations</span>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[#75777e] block">Website</span>
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#e77114] hover:underline block mt-1"
                >
                  {lead.website}
                </a>
              </div>
            </div>
          </div>

          {/* Card 2: Original Calculator Input */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e77114]">calculate</span>
              Original Calculator Input &amp; Savings Target
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#f8f9ff] p-4 rounded-lg border border-[#c5c6ce]/60 font-mono-data text-xs">
              <div>
                <span className="text-[#75777e] block">Primary Size</span>
                <span className="font-bold text-sm text-[#041632]">{lead.calculatorData.primaryBoxSize}</span>
              </div>
              <div>
                <span className="text-[#75777e] block">Monthly Volume</span>
                <span className="font-bold text-sm text-[#041632]">{lead.calculatorData.monthlyVolume.toLocaleString()} pcs</span>
              </div>
              <div>
                <span className="text-[#75777e] block">Current Unit Price</span>
                <span className="font-bold text-sm text-[#041632]">€{lead.calculatorData.currentPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[#75777e] block">Est. Annual Savings</span>
                <span className="font-bold text-sm text-[#e77114]">€{lead.calculatorData.estimatedSavingsYearly.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#75777e] block">Material Preference</span>
                <span className="font-bold text-sm text-[#041632]">{lead.calculatorData.materialPreference}</span>
              </div>
              <div>
                <span className="text-[#75777e] block">Print Spec</span>
                <span className="font-bold text-sm text-[#041632]">{lead.calculatorData.printType}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Quote Request Details & Files */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e77114]">description</span>
              Quote Request Details &amp; Attachments
            </h3>

            <div className="space-y-4">
              <div>
                <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
                  Customer Notes
                </span>
                <div className="bg-[#eff4ff] p-4 rounded-lg border border-[#c5c6ce]/60 font-body text-sm text-[#041632] leading-relaxed">
                  {lead.quoteDetails?.customerNotes || 'No notes provided.'}
                </div>
              </div>

              <div>
                <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-2 font-semibold">
                  Uploaded Artwork &amp; Specs
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lead.quoteDetails?.uploadedFiles?.map((file, idx) => (
                    <div
                      key={idx}
                      className="border border-[#c5c6ce] p-3 rounded-lg flex items-center justify-between hover:bg-[#eff4ff] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#e77114] text-xl">attachment</span>
                        <div>
                          <p className="font-mono-data text-xs font-bold text-[#041632] truncate max-w-[150px]">
                            {file.name}
                          </p>
                          <p className="font-mono-data text-[10px] text-[#75777e]">{file.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => alert(`Downloading simulated asset: ${file.name}`)}
                        className="text-[#041632] hover:text-[#e77114] p-1 cursor-pointer"
                        title="Download file"
                      >
                        <span className="material-symbols-outlined text-lg">download</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (col-span-5): Quick Actions & Activity Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Actions Card */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4">Quick Actions</h3>

            <div className="space-y-3 font-mono-data text-xs">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] py-2.5 px-4 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer border border-[#c5c6ce]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#e77114]">mail</span>
                  <span>Send Email Proposal</span>
                </div>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <button
                onClick={() => {
                  onAddNote(lead.id, `Requested additional sample kit to be dispatched to ${lead.location}`);
                  alert('Sample kit request registered for warehouse team dispatch.');
                }}
                className="w-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] py-2.5 px-4 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer border border-[#c5c6ce]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#e77114]">package_2</span>
                  <span>Dispatch Sample Box Kit</span>
                </div>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Activity History Timeline with Live Note Input */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4">Activity History</h3>

            {/* Note input box */}
            <form onSubmit={handlePostNote} className="mb-6 space-y-2">
              <textarea
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log internal note or follow-up call..."
                className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3 font-body text-xs outline-none focus:ring-2 focus:ring-[#041632]"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="bg-[#041632] text-white px-4 py-1.5 rounded font-mono-data text-xs uppercase font-bold hover:bg-[#1b2b48] disabled:opacity-50 cursor-pointer"
                >
                  Add Note
                </button>
              </div>
            </form>

            {/* Timeline nodes */}
            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#c5c6ce]">
              {lead.activityHistory.map((act) => (
                <div key={act.id} className="relative pl-8 font-body text-xs">
                  <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#041632]"></div>
                  <div className="flex items-center justify-between text-[11px] font-mono-data text-[#75777e] mb-1">
                    <strong className="text-[#041632]">{act.author}</strong>
                    <span>{act.timestamp}</span>
                  </div>
                  <p className="text-[#44474d] bg-[#f8f9ff] p-2.5 rounded border border-[#c5c6ce]/50">
                    {act.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Email Proposal Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Send Email Proposal</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendEmailProposal} className="space-y-4">
              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">Recipient</label>
                <input
                  type="text"
                  disabled
                  value={`${lead.contactName} <${lead.email}>`}
                  className="w-full bg-[#eff4ff] border border-[#c5c6ce] rounded-lg p-2.5 font-mono-data text-xs"
                />
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-[#c5c6ce] rounded-lg p-2.5 font-body text-sm"
                />
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">Message Body</label>
                <textarea
                  rows={5}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full border border-[#c5c6ce] rounded-lg p-3 font-body text-xs sm:text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg font-mono-data text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#e77114] text-white px-6 py-2 rounded-lg font-mono-data text-xs uppercase font-bold hover:bg-[#c25e10] cursor-pointer"
                >
                  Transmit Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
