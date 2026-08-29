'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { LeadDetailData } from '@/lib/admin/queries';
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LeadStatus } from '@/lib/types';
import { updateLeadStatus, addLeadNote, sendDirectLeadEmail } from '@/app/admin/leads/actions';
import { createQuote, dispatchQuote, getProposalShareUrl } from '@/app/admin/leads/[id]/quote-actions';
import { timeAgo, formatDateTime, formatCurrency, formatNumber } from '@/lib/admin/formatters';

interface LeadDetailViewProps {
  lead: LeadDetailData;
  pricingGuidance?: {
    available: boolean;
    countryName: string;
    compact: { label: string; valueEur: number }[];
    markupMinPct: number;
    markupMaxPct: number;
    suggestedMinEur: number;
    suggestedMaxEur: number;
    noLogisticsConfigured: boolean;
  } | null;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({ lead, pricingGuidance }) => {
  const [isPending, startTransition] = useTransition();
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null);
  const [copiedLinkQuoteId, setCopiedLinkQuoteId] = useState<string | null>(null);

  const [newNote, setNewNote] = useState<string>('');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailSubject, setEmailSubject] = useState<string>(
    `OpsVale Wholesale Packaging Proposal - ${lead.company.name}`
  );
  const [emailBody, setEmailBody] = useState<string>(
    `Hi ${lead.contact.name},\n\nThank you for reaching out regarding wholesale packaging for ${lead.company.name}. We have reviewed your estimated monthly volume of ${formatNumber(
      lead.quoteRequest?.monthlyVolume || lead.calcData?.monthlyVolume || 0
    )} boxes.\n\nBased on your specifications, we can offer factory-direct pricing with guaranteed dispatch from our European central hubs.`
  );

  // Quote form state
  const defaultPrice = lead.calcData?.estMinEur || '0.2400';
  const defaultQty =
    lead.quoteRequest?.qtyPerOrder || lead.calcData?.boxesPerOrder || 15000;

  const [quotePrice, setQuotePrice] = useState<string>(defaultPrice);
  const [quoteQty, setQuoteQty] = useState<number>(defaultQty);
  const [quoteSpecs, setQuoteSpecs] = useState<string>('');
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [quotePayment, setQuotePayment] = useState<string>(
    'Standard 30 days net commercial invoicing upon approved company credit'
  );
  const [quoteSla, setQuoteSla] = useState<string>(
    '24-48 Hours guaranteed dispatch from Rotterdam Central Logistics Hub'
  );

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

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatusError(null);
    startTransition(async () => {
      try {
        await updateLeadStatus(lead.id, newStatus);
      } catch (err: any) {
        setStatusError(err.message || 'Failed to update status');
      }
    });
  };

  const handleCopyEmail = () => {
    if (lead.contact.email) {
      navigator.clipboard?.writeText(lead.contact.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handlePostNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setNoteError(null);
    startTransition(async () => {
      try {
        await addLeadNote(lead.id, newNote);
        setNewNote('');
      } catch (err: any) {
        setNoteError(err.message || 'Failed to add note');
      }
    });
  };

  const handleCreateQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuoteError(null);
    setQuoteSuccess(null);

    startTransition(async () => {
      try {
        const res = await createQuote(lead.id, {
          unitPriceEur: quotePrice,
          qty: quoteQty,
          specs: quoteSpecs,
          notes: quoteNotes,
          paymentTerms: quotePayment,
          dispatchSla: quoteSla,
        });
        setQuoteSuccess(`Quote Rev ${res.revision} successfully prepared and saved as DRAFT.`);
        setQuoteSpecs('');
        setQuoteNotes('');
      } catch (err: any) {
        setQuoteError(err.message || 'Failed to prepare quote revision');
      }
    });
  };

  const handleDispatchQuote = (quoteId: string) => {
    setQuoteError(null);
    setQuoteSuccess(null);

    startTransition(async () => {
      try {
        const res = await dispatchQuote(quoteId);
        if (res.status === 'SENT') {
          setQuoteSuccess('Quote dispatched to customer via transactional email. Proposal portal is now active.');
        } else {
          setQuoteSuccess('Quote dispatch is processing in outbox.');
        }
      } catch (err: any) {
        setQuoteError(err.message || 'Failed to dispatch quote');
      }
    });
  };

  const handleCopyProposalLink = async (quoteId: string) => {
    try {
      const res = await getProposalShareUrl(quoteId);
      if (res.url) {
        navigator.clipboard?.writeText(res.url);
        setCopiedLinkQuoteId(quoteId);
        setTimeout(() => setCopiedLinkQuoteId(null), 2500);
      } else {
        alert('Proposal link not available yet (quote must be dispatched).');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to copy proposal link');
    }
  };

  const handleSendEmailProposal = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await sendDirectLeadEmail(lead.id, {
          subject: emailSubject,
          body: emailBody,
        });
        setShowEmailModal(false);
      } catch (err: any) {
        alert(err.message || 'Failed to transmit proposal email');
      }
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const qr = lead.quoteRequest;
  const calc = lead.calcData;
  const nextRevisionNumber = (lead.quotes[0]?.revision ?? 0) + 1;

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
          <span className="font-mono-data text-xs text-[#75777e] uppercase font-semibold">
            Lead Status:
          </span>
          <select
            disabled={isPending}
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="bg-white border border-[#c5c6ce] text-[#041632] font-mono-data text-xs px-3 py-1.5 rounded-lg font-bold outline-none cursor-pointer focus:ring-2 focus:ring-[#041632] disabled:opacity-60"
          >
            {allStatuses.map((st) => (
              <option key={st} value={st}>
                {LEAD_STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {statusError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-mono-data text-xs">
          {statusError}
        </div>
      )}

      {/* Main Dossier Header */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <span className="bg-[#041632] text-white font-mono-data text-xs px-3 py-1 rounded font-bold">
              {lead.code}
            </span>
            <span
              className={`px-3 py-1 rounded font-mono-data text-xs font-bold ${
                LEAD_STATUS_STYLE[lead.status] || 'bg-gray-100 text-gray-800'
              }`}
            >
              {lead.statusLabel}
            </span>
            <span className="font-mono-data text-xs text-[#75777e]">
              Created {formatDateTime(lead.createdAt)}
            </span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-[#041632]">
            {lead.company.name}
          </h1>
          <p className="font-body text-sm text-[#44474d] mt-1">
            {lead.contact.jobTitle ? `${lead.contact.jobTitle} — ` : ''}
            <strong className="text-[#041632]">{lead.contact.name}</strong>
            {lead.company.countryCode ? ` • ${lead.company.countryCode}` : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowEmailModal(true)}
            className="bg-[#e77114] text-white px-5 py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-base">send</span>
            Quick Email
          </button>
        </div>
      </div>

      {/* 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Details, Specs, Calculator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Contact Information */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e77114]">badge</span>
              Account &amp; Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono-data text-xs">
              <div>
                <span className="text-[#75777e] block">Email Address</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-[#041632] text-sm break-all">
                    {lead.contact.email}
                  </span>
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
                <span className="font-bold text-[#041632] text-sm block mt-1">
                  {lead.contact.phone || 'Not provided'}
                </span>
              </div>

              <div>
                <span className="text-[#75777e] block">Operating Branches</span>
                <span className="font-bold text-[#041632] block mt-1">
                  {lead.company.branchRange
                    ? `${lead.company.branchRange} locations`
                    : '1-5 locations'}
                </span>
              </div>

              <div>
                <span className="text-[#75777e] block">Country / Territory</span>
                <span className="font-bold text-[#041632] block mt-1">
                  {lead.company.countryCode || 'EU Central'}
                </span>
              </div>

              {lead.company.website && (
                <div className="sm:col-span-2">
                  <span className="text-[#75777e] block">Company Website</span>
                  <a
                    href={
                      lead.company.website.startsWith('http')
                        ? lead.company.website
                        : `https://${lead.company.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-[#e77114] hover:underline block mt-1 break-all"
                  >
                    {lead.company.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Quote Request Specs & Logistics */}
          {qr ? (
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
              <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e77114]">inventory_2</span>
                Inbound Quote Specifications &amp; Logistics
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#f8f9ff] p-4 rounded-lg border border-[#c5c6ce]/60 font-mono-data text-xs mb-4">
                <div>
                  <span className="text-[#75777e] block">Box Spec Type</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.boxSpecificationType === 'STANDARD'
                      ? `${qr.standardBoxSize || 'Standard'} Box`
                      : 'Custom Dimensions'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Exact Dimensions</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.lengthMm} × {qr.widthMm} × {qr.heightMm} mm
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Material &amp; Print</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.material} • {qr.print === 'PRINTED' ? 'Custom Printed' : 'Plain'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Monthly Volume</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {formatNumber(qr.monthlyVolume)} pcs
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Order Batch Size</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {formatNumber(qr.qtyPerOrder)} pcs/order
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Destination</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.deliveryCity}, {qr.deliveryCountryCode}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Loading Dock Access</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.hasLoadingDock ? 'Yes (Semi-Trailer Accessible)' : 'No (Tail-Lift Required)'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Delivery Frequency</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.deliveryFrequency || 'Monthly'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Custom Flute</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {qr.customFlute || 'Standard E-Flute'}
                  </span>
                </div>
              </div>

              {qr.notes && (
                <div className="mb-4">
                  <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
                    Customer Notes
                  </span>
                  <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c5c6ce]/60 font-body text-xs text-[#041632] leading-relaxed">
                    {qr.notes}
                  </div>
                </div>
              )}

              {qr.deliveryAccessNotes && (
                <div>
                  <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
                    Delivery Access Notes
                  </span>
                  <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c5c6ce]/60 font-body text-xs text-[#041632] leading-relaxed">
                    {qr.deliveryAccessNotes}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Card 3: Authoritative Calculator Snapshot */}
          {calc && (
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-headline text-lg font-bold text-[#041632] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e77114]">calculate</span>
                  Authoritative Pricing Snapshot
                </h3>
                {calc.pricingVersion && (
                  <span className="font-mono-data text-[10px] bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded font-bold">
                    Rule Version: {calc.pricingVersion}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-[#f8f9ff] p-4 rounded-lg border border-[#c5c6ce]/60 font-mono-data text-xs">
                <div>
                  <span className="text-[#75777e] block">Current Benchmark Price</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {formatCurrency(calc.currentPrice)}/pc
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Landed Base Cost</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {formatCurrency(calc.landedCostEur)}/pc
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Estimated OpsVale Price</span>
                  <span className="font-bold text-sm text-emerald-700">
                    {formatCurrency(calc.estMinEur)} – {formatCurrency(calc.estMaxEur)}/pc
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Markup Band</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {calc.markupMin && calc.markupMax
                      ? `${(Number(calc.markupMin) * 100).toFixed(0)}% – ${(
                          Number(calc.markupMax) * 100
                        ).toFixed(0)}%`
                      : 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Est. Annual Savings Range</span>
                  <span className="font-bold text-sm text-[#e77114]">
                    {calc.estYearlySavingsMin && calc.estYearlySavingsMax
                      ? `${formatCurrency(calc.estYearlySavingsMin)} – ${formatCurrency(
                          calc.estYearlySavingsMax
                        )}/yr`
                      : `${formatCurrency(calc.estYearlySavings)}/yr`}
                  </span>
                </div>
                <div>
                  <span className="text-[#75777e] block">Calculated At</span>
                  <span className="font-bold text-sm text-[#041632]">
                    {formatDateTime(calc.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Uploaded Artwork & Spec Files */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#e77114]">attach_file</span>
              Uploaded Artwork &amp; Documents ({lead.files.length})
            </h3>

            {lead.files.length === 0 ? (
              <div className="p-4 text-center text-[#75777e] font-mono-data text-xs bg-[#f8f9ff] rounded-lg border border-dashed border-[#c5c6ce]">
                No files uploaded with this quote request.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {lead.files.map((file) => (
                  <div
                    key={file.id}
                    className="border border-[#c5c6ce] p-3 rounded-lg flex items-center justify-between hover:bg-[#eff4ff] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-[#e77114] text-xl flex-shrink-0">
                        description
                      </span>
                      <div className="truncate">
                        <p className="font-mono-data text-xs font-bold text-[#041632] truncate">
                          {file.fileName}
                        </p>
                        <p className="font-mono-data text-[10px] text-[#75777e]">
                          {formatFileSize(file.sizeBytes)} • {file.mimeType}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/admin/files/${file.id}`}
                      download
                      className="text-[#041632] hover:text-[#e77114] p-1.5 rounded hover:bg-white cursor-pointer transition-colors flex-shrink-0 ml-2"
                      title={`Download ${file.fileName}`}
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Commercial Quote Form, Revisions & Activity Log */}
        <div className="lg:col-span-5 space-y-6">
          {/* Commercial Quote Preparation Card */}
          <div className="bg-white border-2 border-[#041632] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <div>
                <span className="font-mono-data text-[10px] uppercase font-bold text-[#e77114] block">
                  Commercial Proposal Builder
                </span>
                <h3 className="font-headline text-lg font-bold text-[#041632]">
                  {lead.quotes.length === 0 ? 'Prepare Quote Rev 1' : `Prepare Revised Quote (Rev ${nextRevisionNumber})`}
                </h3>
              </div>
              <span className="material-symbols-outlined text-[#041632] text-2xl">request_quote</span>
            </div>

            {/* Side-by-side customer intake requirements summary */}
            <div className="bg-[#eff4ff] p-3 rounded-lg border border-[#c5c6ce] font-mono-data text-[11px] space-y-1">
              <span className="font-bold text-[#041632] block text-xs">Customer Intake Reference:</span>
              <div className="flex justify-between text-[#44474d]">
                <span>Dimensions:</span>
                <span className="font-bold text-[#041632]">
                  {qr ? `${qr.lengthMm}×${qr.widthMm}×${qr.heightMm}mm (${qr.material})` : calc?.boxSize || 'Standard'}
                </span>
              </div>
              <div className="flex justify-between text-[#44474d]">
                <span>Print &amp; Volume:</span>
                <span className="font-bold text-[#041632]">
                  {qr?.print || calc?.print || 'PLAIN'} • {formatNumber(qr?.monthlyVolume || calc?.monthlyVolume || 0)}/mo
                </span>
              </div>
              <div className="flex justify-between text-[#44474d]">
                <span>Delivery:</span>
                <span className="font-bold text-[#041632]">
                  {qr ? `${qr.deliveryCity}, ${qr.deliveryCountryCode}` : lead.company.countryCode || 'EU'}
                </span>
              </div>
            </div>

            {quoteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded font-mono-data text-xs">
                {quoteError}
              </div>
            )}

            {quoteSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded font-mono-data text-xs flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                <span>{quoteSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateQuoteSubmit} className="space-y-3 font-mono-data text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#75777e] mb-1 font-semibold">Unit Price (€/pc)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 font-bold text-sm text-[#041632]"
                  />
                </div>
                <div>
                  <label className="block text-[#75777e] mb-1 font-semibold">Order Qty (pcs)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quoteQty}
                    onChange={(e) => setQuoteQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 font-bold text-sm text-[#041632]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Commercial Specs / Material Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 32cm E-Flute Kraft, 2-color flexo lid print, palletized"
                  value={quoteSpecs}
                  onChange={(e) => setQuoteSpecs(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Payment Terms</label>
                <input
                  type="text"
                  value={quotePayment}
                  onChange={(e) => setQuotePayment(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Dispatch SLA Guarantee</label>
                <input
                  type="text"
                  value={quoteSla}
                  onChange={(e) => setQuoteSla(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Internal Procurement Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Approved by procurement desk with 48h terminal reserve"
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2 text-xs"
                />
              </div>

              {pricingGuidance?.available && (
                <div className="rounded-lg border border-[#c5c6ce] bg-[#f8f9ff] p-4 text-xs space-y-1">
                  <p className="font-semibold text-[#041632] uppercase tracking-wider">Pricing guidance</p>
                  {pricingGuidance.compact.map((l) => (
                    <div key={l.label} className="flex justify-between">
                      <span className="text-[#4f5e7e]">{l.label}</span>
                      <span className="font-bold text-[#041632]">€{l.valueEur.toFixed(4)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-[#c5c6ce]/50 pt-1">
                    <span className="text-[#4f5e7e]">Markup</span>
                    <span className="font-bold text-[#041632]">
                      {pricingGuidance.markupMinPct}%–{pricingGuidance.markupMaxPct}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4f5e7e]">Suggested unit price</span>
                    <span className="font-bold text-[#e77114]">
                      €{pricingGuidance.suggestedMinEur.toFixed(4)}–€{pricingGuidance.suggestedMaxEur.toFixed(4)}
                    </span>
                  </div>
                  {pricingGuidance.noLogisticsConfigured && (
                    <p className="text-[#b3261e]">
                      No logistics corridor configured for {pricingGuidance.countryName} — freight €0 applied.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#041632] hover:bg-[#1b2b48] text-white py-2.5 rounded-lg uppercase font-bold tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                {lead.quotes.length === 0 ? 'Save Quote Rev 1 (Draft)' : `Save Revised Quote Rev ${nextRevisionNumber} (Draft)`}
              </button>
            </form>
          </div>

          {/* Existing Quote Revisions History with Dispatch & Copy Link */}
          {lead.quotes.length > 0 && (
            <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="font-headline text-base font-bold text-[#041632]">
                Quote Revision History ({lead.quotes.length})
              </h3>

              <div className="divide-y divide-[#c5c6ce]/50 font-mono-data text-xs space-y-3">
                {lead.quotes.map((q) => (
                  <div key={q.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#041632] text-sm">Rev {q.revision}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
                        </div>
                        <span className="text-[11px] text-[#75777e] block mt-0.5">
                          {q.qty.toLocaleString()} pcs @ {formatCurrency(q.unitPriceEur)} (Total: €{q.totalEur})
                        </span>
                      </div>
                      <span className="text-[10px] text-[#75777e]">{timeAgo(q.createdAt)}</span>
                    </div>

                    {/* Action buttons per quote status */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {q.status === 'DRAFT' && (
                        <button
                          onClick={() => handleDispatchQuote(q.id)}
                          disabled={isPending}
                          className="bg-[#e77114] hover:bg-[#c25e10] text-white px-3 py-1.5 rounded font-mono-data text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">send</span>
                          Dispatch Proposal to Customer
                        </button>
                      )}

                      {q.status === 'DISPATCHING' && (
                        <button
                          onClick={() => handleDispatchQuote(q.id)}
                          disabled={isPending}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded font-mono-data text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm animate-spin">refresh</span>
                          Retry Dispatch Email
                        </button>
                      )}

                      {(q.status === 'SENT' || q.status === 'ACCEPTED') && q.hasAccessToken && (
                        <>
                          <button
                            onClick={() => handleCopyProposalLink(q.id)}
                            className="bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] border border-[#c5c6ce] px-2.5 py-1 rounded font-mono-data text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedLinkQuoteId === q.id ? 'check' : 'link'}
                            </span>
                            {copiedLinkQuoteId === q.id ? 'Link Copied!' : 'Copy Proposal Link'}
                          </button>

                          <button
                            onClick={async () => {
                              const res = await getProposalShareUrl(q.id);
                              if (res.url) window.open(res.url, '_blank');
                            }}
                            className="text-[#041632] hover:text-[#e77114] text-[11px] font-bold flex items-center gap-0.5 cursor-pointer p-1"
                            title="Open Customer Proposal in New Tab"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            View Portal
                          </button>
                        </>
                      )}

                      <a
                        href={`/api/admin/quotes/${q.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#041632] hover:text-[#e77114] text-[11px] font-bold flex items-center gap-0.5 cursor-pointer p-1"
                        title="Download Proposal PDF"
                      >
                        <span className="material-symbols-outlined text-sm text-[#e77114]">picture_as_pdf</span>
                        PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions Card */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4">
              Quick Actions
            </h3>

            <div className="space-y-3 font-mono-data text-xs">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] py-2.5 px-4 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer border border-[#c5c6ce]"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#e77114]">mail</span>
                  <span>Send Direct Email</span>
                </div>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>

              <button
                onClick={() => {
                  startTransition(async () => {
                    await addLeadNote(
                      lead.id,
                      `Dispatched standard sample kit (Kraft & White sample boxes) to ${
                        lead.quoteRequest?.deliveryCity || lead.company.countryCode || 'primary address'
                      }`
                    );
                  });
                }}
                disabled={isPending}
                className="w-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] py-2.5 px-4 rounded-lg font-bold flex items-center justify-between transition-colors cursor-pointer border border-[#c5c6ce] disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-[#e77114]">
                    package_2
                  </span>
                  <span>Dispatch Sample Box Kit</span>
                </div>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Activity History Timeline with Live Note Input */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4">
              Activity History ({lead.activities.length})
            </h3>

            {/* Note input box */}
            <form onSubmit={handlePostNote} className="mb-6 space-y-2">
              <textarea
                rows={2}
                maxLength={2000}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log internal note, phone call, or requirement update..."
                className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3 font-body text-xs outline-none focus:ring-2 focus:ring-[#041632]"
              />
              {noteError && (
                <p className="text-red-600 font-mono-data text-[11px]">{noteError}</p>
              )}
              <div className="flex justify-between items-center">
                <span className="font-mono-data text-[10px] text-[#75777e]">
                  {newNote.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={isPending || !newNote.trim()}
                  className="bg-[#041632] text-white px-4 py-1.5 rounded font-mono-data text-xs uppercase font-bold hover:bg-[#1b2b48] disabled:opacity-50 cursor-pointer transition-colors"
                >
                  Add Note
                </button>
              </div>
            </form>

            {/* Timeline nodes */}
            {lead.activities.length === 0 ? (
              <div className="py-6 text-center text-[#75777e] font-mono-data text-xs bg-[#f8f9ff] rounded-lg border border-dashed border-[#c5c6ce]">
                No activity history recorded yet.
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#c5c6ce]">
                {lead.activities.map((act) => (
                  <div key={act.id} className="relative pl-8 font-body text-xs">
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#041632]"></div>
                    <div className="flex items-center justify-between text-[11px] font-mono-data text-[#75777e] mb-1">
                      <strong className="text-[#041632]">
                        {act.authorName || 'System'}
                      </strong>
                      <span title={formatDateTime(act.createdAt)}>
                        {timeAgo(act.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#44474d] bg-[#f8f9ff] p-2.5 rounded border border-[#c5c6ce]/50 font-mono-data text-xs leading-relaxed whitespace-pre-wrap">
                      {act.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Proposal Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Send Email
              </h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSendEmailProposal} className="space-y-4">
              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">
                  Recipient
                </label>
                <input
                  type="text"
                  disabled
                  value={`${lead.contact.name} <${lead.contact.email}>`}
                  className="w-full bg-[#eff4ff] border border-[#c5c6ce] rounded-lg p-2.5 font-mono-data text-xs"
                />
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full border border-[#c5c6ce] rounded-lg p-2.5 font-body text-sm"
                />
              </div>

              <div>
                <label className="block font-mono-data text-xs text-[#75777e] mb-1">
                  Message Body
                </label>
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
                  disabled={isPending}
                  className="bg-[#e77114] text-white px-6 py-2 rounded-lg font-mono-data text-xs uppercase font-bold hover:bg-[#c25e10] cursor-pointer disabled:opacity-50"
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
