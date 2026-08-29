'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { CustomerProposalDTO, acceptProposal, requestProposalModification, declineProposal } from '@/app/proposals/[token]/actions';
import { formatCurrency, formatNumber } from '@/lib/admin/formatters';

interface CustomerProposalViewProps {
  token: string;
  proposal: CustomerProposalDTO;
}

export const CustomerProposalView: React.FC<CustomerProposalViewProps> = ({ token, proposal }) => {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptNotes, setAcceptNotes] = useState('');

  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyMessage, setModifyMessage] = useState('');

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const isActionable = proposal.status === 'SENT' && !proposal.isExpired;

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await acceptProposal(token, { customerNotes: acceptNotes.trim() || undefined });
        setShowAcceptModal(false);
        setActionSuccess('Your acceptance has been recorded. An OpsVale representative will contact you regarding the next steps.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to accept proposal');
      }
    });
  };

  const handleModify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyMessage.trim() || modifyMessage.trim().length < 10) {
      setActionError('Please provide at least 10 characters explaining your adjustment request.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await requestProposalModification(token, { message: modifyMessage.trim() });
        setShowModifyModal(false);
        setActionSuccess('Your adjustment request has been transmitted to your dedicated procurement specialist. We will review and follow up promptly.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to submit adjustment request');
      }
    });
  };

  const handleDecline = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await declineProposal(token, { reason: declineReason.trim() || undefined });
        setShowDeclineModal(false);
        setActionSuccess('Your feedback has been recorded. Thank you for considering OpsVale.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to decline proposal');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col justify-between selection:bg-[#ffdeac] selection:text-[#281900]">
      {/* Top Brand Bar */}
      <header className="bg-[#041632] text-white border-b border-[#1b2b48] py-4 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#e77114] rounded flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-xl">package</span>
            </div>
            <div>
              <span className="font-headline font-bold text-base text-white block">OpsVale</span>
              <span className="font-mono-data text-[9px] text-[#8393b5] uppercase tracking-wider block">
                European Commercial Portal
              </span>
            </div>
          </Link>

          <div className="font-mono-data text-xs text-right">
            <span className="text-[#8393b5] block text-[10px]">Reference Code</span>
            <span className="font-bold text-white text-sm">{proposal.leadCode}</span>
          </div>
        </div>
      </header>

      {/* Main Proposal Body */}
      <main className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 my-6 space-y-8">
        {/* Status Banners */}
        {proposal.status === 'SUPERSEDED' && (
          <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-5 rounded-xl font-mono-data text-xs flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-2xl text-amber-600 flex-shrink-0">info</span>
            <div>
              <strong className="block text-sm">Proposal Superseded</strong>
              This proposal has been replaced by a newer revision. Please refer to the latest proposal sent to your email.
            </div>
          </div>
        )}

        {proposal.status === 'ACCEPTED' && (
          <div className="bg-emerald-50 border-2 border-emerald-400 text-emerald-950 p-6 rounded-xl font-mono-data text-xs flex items-start gap-3 shadow-sm">
            <span className="material-symbols-outlined text-2xl text-emerald-600 flex-shrink-0">check_circle</span>
            <div>
              <strong className="block text-base mb-1">Commercial Proposal Accepted</strong>
              Your acceptance has been recorded. An OpsVale representative will contact you regarding the next steps.
              {proposal.acceptedAt && (
                <span className="block text-[#75777e] text-[11px] mt-1">
                  Accepted on: {new Date(proposal.acceptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        )}

        {proposal.status === 'REJECTED' && (
          <div className="bg-gray-100 border-2 border-gray-300 text-gray-800 p-5 rounded-xl font-mono-data text-xs flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-2xl text-gray-500 flex-shrink-0">cancel</span>
            <div>
              <strong className="block text-sm">Proposal Declined</strong>
              This commercial proposal was declined on {proposal.rejectedAt ? new Date(proposal.rejectedAt).toLocaleDateString('en-GB') : 'record'}.
            </div>
          </div>
        )}

        {proposal.isExpired && proposal.status === 'SENT' && (
          <div className="bg-gray-100 border-2 border-gray-300 text-gray-800 p-5 rounded-xl font-mono-data text-xs flex items-center gap-3 shadow-sm">
            <span className="material-symbols-outlined text-2xl text-gray-500 flex-shrink-0">schedule</span>
            <div>
              <strong className="block text-sm">Proposal Expired</strong>
              This quotation reached its validity date on {proposal.expiresAt ? new Date(proposal.expiresAt).toLocaleDateString('en-GB') : 'record'}. Please contact OpsVale for an updated quotation.
            </div>
          </div>
        )}

        {actionSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 p-5 rounded-xl font-mono-data text-xs flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-emerald-600">check_circle</span>
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-mono-data text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">error</span>
            <span>{actionError}</span>
          </div>
        )}

        {/* Hero Proposal Card */}
        <div className="bg-white border border-[#c5c6ce] rounded-2xl p-6 sm:p-10 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#c5c6ce] pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#041632] text-white font-mono-data text-xs px-2.5 py-0.5 rounded font-bold">
                  {proposal.leadCode}
                </span>
                <span className="bg-[#eff4ff] text-[#041632] border border-[#c5c6ce] font-mono-data text-xs px-2.5 py-0.5 rounded font-bold">
                  Revision {proposal.revision}
                </span>
              </div>
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
                Commercial Packaging Proposal
              </h1>
              <p className="font-body text-sm text-[#44474d] mt-1">
                Prepared exclusively for <strong className="text-[#041632]">{proposal.companyName}</strong> (Attn: {proposal.contactName})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/api/proposals/${token}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="bg-white border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] px-3.5 py-2.5 rounded-lg font-mono-data text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Download Official Proposal PDF"
              >
                <span className="material-symbols-outlined text-base text-[#e77114]">picture_as_pdf</span>
                Download Official PDF
              </a>

              {proposal.expiresAt && proposal.status === 'SENT' && !proposal.isExpired && (
                <div className="bg-[#eff4ff] border border-[#c5c6ce] p-2.5 rounded-lg font-mono-data text-xs text-right">
                  <span className="text-[#75777e] block text-[9px] uppercase font-semibold">Offer Validity</span>
                  <span className="font-bold text-[#041632] text-xs">
                    Until {new Date(proposal.expiresAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Highlight Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#041632] text-white p-6 sm:p-8 rounded-xl font-mono-data">
            <div>
              <span className="text-[#8393b5] text-xs uppercase block mb-1">Unit Wholesale Price</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline text-3xl sm:text-4xl font-bold text-[#ffdeac]">
                  €{Number(proposal.unitPriceEur).toFixed(4)}
                </span>
                <span className="text-xs text-[#8393b5]">/ pc</span>
              </div>
            </div>

            <div>
              <span className="text-[#8393b5] text-xs uppercase block mb-1">Order Batch Quantity</span>
              <span className="font-headline text-2xl sm:text-3xl font-bold text-white">
                {proposal.orderQuantity.toLocaleString()} pcs
              </span>
            </div>

            <div>
              <span className="text-[#8393b5] text-xs uppercase block mb-1">Total Net Order Value</span>
              <span className="font-headline text-2xl sm:text-3xl font-bold text-emerald-400">
                €{Number(proposal.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Technical & Commercial Specifications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono-data text-xs">
            {/* Box Specifications */}
            <div className="border border-[#c5c6ce] rounded-xl p-5 space-y-3 bg-[#f8f9ff]">
              <h3 className="font-headline text-base font-bold text-[#041632] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e77114]">inventory_2</span>
                Packaging Specifications
              </h3>

              <div className="space-y-2 text-[#44474d]">
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Configuration SKU:</span>
                  <strong className="text-[#041632]">{proposal.boxSpec}</strong>
                </div>
                {proposal.dimensionsMm && (
                  <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                    <span>Exact Dimensions:</span>
                    <strong className="text-[#041632]">
                      {proposal.dimensionsMm.length} × {proposal.dimensionsMm.width} × {proposal.dimensionsMm.height} mm
                    </strong>
                  </div>
                )}
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Paperboard &amp; Print:</span>
                  <strong className="text-[#041632]">
                    {proposal.material} • {proposal.print === 'PRINTED' ? 'Custom Printed' : 'Plain'}
                  </strong>
                </div>
                {proposal.customFlute && (
                  <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                    <span>Flute Specification:</span>
                    <strong className="text-[#041632]">{proposal.customFlute}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Monthly Volume Target:</span>
                  <strong className="text-[#041632]">{formatNumber(proposal.monthlyVolume)} pcs/mo</strong>
                </div>
              </div>
            </div>

            {/* Logistics & Commercial Terms */}
            <div className="border border-[#c5c6ce] rounded-xl p-5 space-y-3 bg-[#f8f9ff]">
              <h3 className="font-headline text-base font-bold text-[#041632] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e77114]">local_shipping</span>
                Logistics &amp; Payment Terms
              </h3>

              <div className="space-y-2 text-[#44474d]">
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Destination Hub:</span>
                  <strong className="text-[#041632]">
                    {proposal.deliveryCity}, {proposal.deliveryCountryCode}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Delivery Cadence:</span>
                  <strong className="text-[#041632]">{proposal.deliveryFrequency}</strong>
                </div>
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Loading Dock Access:</span>
                  <strong className="text-[#041632]">
                    {proposal.hasLoadingDock ? 'Semi-Trailer Accessible' : 'Tail-Lift Required'}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-[#e2e4ef] pb-1.5">
                  <span>Dispatch SLA:</span>
                  <strong className="text-[#041632]">{proposal.dispatchSla}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Commercial Payment:</span>
                  <strong className="text-[#041632] text-right">{proposal.paymentTerms}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Special Instructions */}
          {(proposal.specsNotes || proposal.commercialNotes) && (
            <div className="bg-[#eff4ff] border border-[#c5c6ce] rounded-xl p-5 font-mono-data text-xs space-y-2">
              <h4 className="font-bold text-[#041632]">Commercial &amp; Production Notes</h4>
              {proposal.specsNotes && <p className="text-[#44474d]">{proposal.specsNotes}</p>}
              {proposal.commercialNotes && <p className="text-[#44474d]">{proposal.commercialNotes}</p>}
            </div>
          )}

          {/* Customer Action Bar (Only visible when active & unexpired) */}
          {isActionable && (
            <div className="pt-6 border-t border-[#c5c6ce] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowModifyModal(true)}
                  disabled={isPending}
                  className="px-5 py-3 border border-[#c5c6ce] rounded-xl font-mono-data text-xs font-bold text-[#041632] hover:bg-[#eff4ff] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-[#e77114]">edit_note</span>
                  Request Adjustment
                </button>

                <button
                  onClick={() => setShowDeclineModal(true)}
                  disabled={isPending}
                  className="px-5 py-3 border border-red-200 text-red-700 hover:bg-red-50 rounded-xl font-mono-data text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                  Decline
                </button>
              </div>

              <button
                onClick={() => setShowAcceptModal(true)}
                disabled={isPending}
                className="w-full sm:w-auto bg-[#e77114] hover:bg-[#c25e10] text-white px-8 py-3.5 rounded-xl font-mono-data text-sm font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-xl">check</span>
                Accept Commercial Proposal
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#c5c6ce] py-6 px-6 text-center font-mono-data text-xs text-[#75777e]">
        <p>
          OpsVale European Distribution B.V. • Central Dispatch Hub Rotterdam, Netherlands • Dedicated Support: support@opsvale.eu
        </p>
      </footer>

      {/* MODAL 1: ACCEPT PROPOSAL */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Accept Commercial Proposal</h3>
              <button onClick={() => setShowAcceptModal(false)} className="text-[#75777e] hover:text-[#041632] cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-body text-xs text-[#44474d] leading-relaxed">
              By confirming, you agree to the commercial pricing of <strong>€{Number(proposal.unitPriceEur).toFixed(4)}/box</strong> for <strong>{proposal.orderQuantity.toLocaleString()} units</strong> (Total: €{Number(proposal.totalEur).toLocaleString('en-US', { minimumFractionDigits: 2 })}) for {proposal.companyName}.
            </p>

            <form onSubmit={handleAccept} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">
                  Purchase Order / Reference Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. PO #88921, Delivery contact: Marco Rossi (+39 02 123 4567)"
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#e77114] text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-[#c25e10] cursor-pointer disabled:opacity-50"
                >
                  Confirm Acceptance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REQUEST MODIFICATION */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Request Proposal Adjustments</h3>
              <button onClick={() => setShowModifyModal(false)} className="text-[#75777e] hover:text-[#041632] cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-body text-xs text-[#44474d] leading-relaxed">
              Describe any requested adjustments to batch volume, box dimensions, material, or delivery schedule. Our procurement team will prepare an updated revision.
            </p>

            <form onSubmit={handleModify} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">
                  Adjustment Details (Required, min 10 characters)
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="e.g. Could we increase the order volume to 25,000 boxes for a better tier? Also need bi-weekly delivery instead of monthly."
                  value={modifyMessage}
                  onChange={(e) => setModifyMessage(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModifyModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || modifyMessage.trim().length < 10}
                  className="bg-[#041632] text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-[#1b2b48] cursor-pointer disabled:opacity-50"
                >
                  Submit Adjustment Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DECLINE OFFER */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Decline Proposal</h3>
              <button onClick={() => setShowDeclineModal(false)} className="text-[#75777e] hover:text-[#041632] cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleDecline} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">
                  Reason for Declining (Optional feedback)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Existing supplier contract renewed; price point not competitive with local distributor."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-red-700 text-white px-6 py-2.5 rounded-lg uppercase font-bold hover:bg-red-800 cursor-pointer disabled:opacity-50"
                >
                  Confirm Decline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
