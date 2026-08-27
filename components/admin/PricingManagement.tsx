'use client';

import React, { useState, useTransition, useRef } from 'react';
import {
  LandedCostRow,
  PricingRuleRow,
  PublicPriceRangeRow,
  PricingAuditLogRow,
  CountryOption,
  BoxConfigOption,
} from '@/lib/admin/queries';
import {
  createLandedCostVersion,
  createPricingRuleVersion,
  createPublicPriceRangeVersion,
  togglePricingEntityActive,
} from '@/app/admin/pricing/actions';
import {
  previewExcelUpload,
  commitBulkPricingChanges,
} from '@/app/admin/pricing/excel-actions';
import { ExcelPreviewResult, BulkCommitPayload, ImportMode } from '@/lib/excel/types';
import { formatCurrency, formatDateTime } from '@/lib/admin/formatters';

interface PricingManagementProps {
  landedCosts: LandedCostRow[];
  pricingRules: PricingRuleRow[];
  publicPriceRanges: PublicPriceRangeRow[];
  auditLogs: PricingAuditLogRow[];
  countries: CountryOption[];
  boxConfigs: BoxConfigOption[];
}

export const PricingManagement: React.FC<PricingManagementProps> = ({
  landedCosts,
  pricingRules,
  publicPriceRanges,
  auditLogs,
  countries,
  boxConfigs,
}) => {
  const [activeTab, setActiveTab] = useState<'landed' | 'rules' | 'ranges' | 'audit'>('landed');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Excel Bulk State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadMode, setActiveUploadMode] = useState<ImportMode>('AUTO');
  const [cachedFile, setCachedFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [previewResult, setPreviewResult] = useState<ExcelPreviewResult | null>(null);
  const [previewTab, setPreviewTab] = useState<'landed' | 'rules' | 'ranges' | 'errors'>('landed');
  const [isCommitting, setIsCommitting] = useState(false);

  // Forms state
  const [showCostModal, setShowCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    countryId: countries[0]?.id || '',
    boxConfigId: boxConfigs[0]?.id || '',
    qtyTierMin: 10000,
    qtyTierMax: '' as string | number,
    costEur: '0.1850',
  });

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    scope: 'GLOBAL' as 'GLOBAL' | 'COUNTRY' | 'PRODUCT',
    countryId: countries[0]?.id || '',
    boxConfigId: boxConfigs[0]?.id || '',
    markupMin: 0.20,
    markupMax: 0.35,
  });

  const [showRangeModal, setShowRangeModal] = useState(false);
  const [rangeForm, setRangeForm] = useState({
    countryId: countries[0]?.id || '',
    boxConfigId: boxConfigs[0]?.id || '',
    minEur: '0.22',
    maxEur: '0.28',
  });

  // Simulator helper state (read-only math preview)
  const [simFactory, setSimFactory] = useState(0.145);
  const [simFreight, setSimFreight] = useState(0.025);
  const [simPort, setSimPort] = useState(0.005);
  const [simLogistics, setSimLogistics] = useState(0.010);
  const [simMargin, setSimMargin] = useState(25);

  const simLanded = simFactory + simFreight + simPort + simLogistics;
  const simMSRP = simLanded * (1 + simMargin / 100);

  const handleCreateCost = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await createLandedCostVersion({
          countryId: costForm.countryId,
          boxConfigId: costForm.boxConfigId,
          qtyTierMin: Number(costForm.qtyTierMin),
          qtyTierMax: costForm.qtyTierMax ? Number(costForm.qtyTierMax) : null,
          costEur: costForm.costEur,
        });
        setShowCostModal(false);
        setActionSuccess('Landed cost version successfully created and activated.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to save landed cost version');
      }
    });
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await createPricingRuleVersion({
          scope: ruleForm.scope,
          countryId: ruleForm.scope !== 'GLOBAL' ? ruleForm.countryId : null,
          boxConfigId: ruleForm.scope === 'PRODUCT' ? ruleForm.boxConfigId : null,
          markupMin: Number(ruleForm.markupMin),
          markupMax: Number(ruleForm.markupMax),
        });
        setShowRuleModal(false);
        setActionSuccess('Pricing rule version successfully created and activated.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to save pricing rule');
      }
    });
  };

  const handleCreateRange = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await createPublicPriceRangeVersion({
          countryId: rangeForm.countryId,
          boxConfigId: rangeForm.boxConfigId,
          minEur: rangeForm.minEur,
          maxEur: rangeForm.maxEur,
          isManualOverride: true,
        });
        setShowRangeModal(false);
        setActionSuccess('Public price range override successfully updated.');
      } catch (err: any) {
        setActionError(err.message || 'Failed to save public price range');
      }
    });
  };

  const handleToggle = (
    entityType: 'LANDED_COST' | 'PRICING_RULE' | 'PUBLIC_PRICE_RANGE',
    id: string,
    currentActive: boolean
  ) => {
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      try {
        await togglePricingEntityActive(entityType, id, !currentActive);
        setActionSuccess(`Status updated to ${!currentActive ? 'Active' : 'Retired'}.`);
      } catch (err: any) {
        setActionError(err.message || 'Failed to toggle status');
      }
    });
  };

  // Excel Handlers
  const triggerFileInput = (mode: ImportMode) => {
    setActiveUploadMode(mode);
    fileInputRef.current?.click();
  };

  const processFilePreview = async (file: File, mode: ImportMode) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    setIsParsingExcel(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const result = await previewExcelUpload(formData);
      setPreviewResult(result);
      if (result.errors.length > 0) {
        setPreviewTab('errors');
      } else if (result.landedCosts.length > 0) {
        setPreviewTab('landed');
      } else if (result.pricingRules.length > 0) {
        setPreviewTab('rules');
      } else {
        setPreviewTab('ranges');
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to parse Excel spreadsheet');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setCachedFile(file);
    await processFilePreview(file, activeUploadMode);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReevaluateMode = async (newMode: ImportMode) => {
    if (!cachedFile) return;
    setActiveUploadMode(newMode);
    await processFilePreview(cachedFile, newMode);
  };

  const handleCommitBulk = async () => {
    if (!previewResult || !previewResult.canCommit) return;

    setIsCommitting(true);
    setActionError(null);
    setActionSuccess(null);

    const payload: BulkCommitPayload = {
      importMode: previewResult.importMode,
      landedCosts: previewResult.landedCosts
        .filter((i) => i.action === 'INSERT' || i.action === 'UPDATE')
        .map((i) => ({
          recordId: i.recordId,
          countryCode: i.countryCode,
          boxSizeLabel: i.boxSizeLabel,
          material: i.material,
          print: i.print,
          qtyTierMin: i.qtyTierMin,
          qtyTierMax: i.qtyTierMax,
          costEur: i.newCostEur,
          action: i.action as 'INSERT' | 'UPDATE',
        })),
      pricingRules: previewResult.pricingRules
        .filter((i) => i.action === 'INSERT' || i.action === 'UPDATE')
        .map((i) => ({
          recordId: i.recordId,
          scope: i.scope,
          countryCode: i.countryCode,
          boxSizeLabel: i.boxSizeLabel,
          markupMin: i.newMarkupMin,
          markupMax: i.newMarkupMax,
          action: i.action as 'INSERT' | 'UPDATE',
        })),
      publicPriceRanges: previewResult.publicPriceRanges
        .filter((i) => i.action === 'INSERT' || i.action === 'UPDATE')
        .map((i) => ({
          recordId: i.recordId,
          countryCode: i.countryCode,
          boxSizeLabel: i.boxSizeLabel,
          material: i.material,
          print: i.print,
          minEur: i.newMinEur,
          maxEur: i.newMaxEur,
          action: i.action as 'INSERT' | 'UPDATE',
        })),
    };

    try {
      const res = await commitBulkPricingChanges(payload);
      setActionSuccess(res.message);
      setPreviewResult(null);
      setCachedFile(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to commit bulk pricing updates');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-8 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Hidden File Input for Excel */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 bg-[#dce9ff] px-2.5 py-1 rounded text-[11px] font-mono-data text-[#041632] font-semibold">
            <span className="material-symbols-outlined text-xs">tune</span>
            Commercial Engine &amp; Governance
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Pricing Engine &amp; Landed Cost Matrix
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Manage territory landed costs, 3-tier markup hierarchy, and customer-facing public price bands.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/admin/pricing/excel/export?type=current"
            download
            className="bg-white border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] px-4 py-2 rounded-lg font-mono-data text-xs flex items-center gap-2 cursor-pointer shadow-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export Matrix (.xlsx)
          </a>

          <button
            onClick={() => triggerFileInput('UPDATE_EXISTING')}
            disabled={isParsingExcel}
            className="bg-[#1b2b48] hover:bg-[#041632] text-white px-4 py-2 rounded-lg font-mono-data text-xs flex items-center gap-2 cursor-pointer shadow-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isParsingExcel ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Parsing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">upload_file</span>
                Import Sheet
              </>
            )}
          </button>

          {activeTab === 'landed' && (
            <button
              onClick={() => setShowCostModal(true)}
              className="bg-[#e77114] text-white px-4 py-2 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Landed Cost
            </button>
          )}

          {activeTab === 'rules' && (
            <button
              onClick={() => setShowRuleModal(true)}
              className="bg-[#e77114] text-white px-4 py-2 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Markup Rule
            </button>
          )}

          {activeTab === 'ranges' && (
            <button
              onClick={() => setShowRangeModal(true)}
              className="bg-[#e77114] text-white px-4 py-2 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Set Range Override
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Bulk Operations Workspace Card (Google Stitch Design with Explicit Mode Split) */}
      <div className="bg-white rounded-xl border border-[#c5c6ce] shadow-sm overflow-hidden font-mono-data text-xs">
        <div className="p-4 border-b border-[#c5c6ce] bg-[#f8f9ff] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#e77114]">table_view</span>
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Bulk Pricing Operations with Version Conflict Safeguards
            </h3>
          </div>
          <span className="text-[11px] text-[#75777e]">Dedicated Modes: UPDATE_EXISTING &amp; ADD_NEW</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#c5c6ce]">
          {/* Card 1: UPDATE_EXISTING Mode */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#dce9ff] text-[#041632] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">sync_saved_locally</span>
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[10px] font-bold">
                  MODE: UPDATE_EXISTING
                </div>
                <h4 className="font-headline text-base font-bold text-[#041632]">
                  Update Existing Pricing Matrix
                </h4>
                <p className="font-body text-xs text-[#44474d]">
                  Download the current pricing matrix with stable <strong>Record IDs</strong>, edit values, and re-upload. Automatically validates against stale versions and concurrent edits.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href="/api/admin/pricing/excel/export?type=current"
                download
                className="flex-1 bg-white hover:bg-[#eff4ff] text-[#041632] border border-[#c5c6ce] py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download Matrix
              </a>
              <button
                onClick={() => triggerFileInput('UPDATE_EXISTING')}
                disabled={isParsingExcel}
                className="flex-1 bg-[#041632] hover:bg-[#1b2b48] text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold shadow-md cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">upload</span>
                Upload &amp; Diff
              </button>
            </div>
          </div>

          {/* Card 2: ADD_NEW Mode */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#ffdeac] text-[#735a31] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">add_to_photos</span>
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                  MODE: ADD_NEW
                </div>
                <h4 className="font-headline text-base font-bold text-[#041632]">
                  Add New Pricing Rows
                </h4>
                <p className="font-body text-xs text-[#44474d]">
                  Use the blank template structure to define landed costs and overrides for entirely new SKUs. Prevents accidental duplicate overwrites of existing configurations.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href="/api/admin/pricing/excel/export?type=blank"
                download
                className="flex-1 bg-white hover:bg-[#eff4ff] text-[#041632] border border-[#c5c6ce] py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold shadow-sm cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">file_download</span>
                Download Blank
              </a>
              <button
                onClick={() => triggerFileInput('ADD_NEW')}
                disabled={isParsingExcel}
                className="flex-1 border-2 border-dashed border-[#c5c6ce] hover:border-[#041632] hover:bg-[#eff4ff] text-[#041632] py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                Drop Sheet Here
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-[#c5c6ce] font-mono-data text-xs">
        <button
          onClick={() => setActiveTab('landed')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'landed'
              ? 'border-[#e77114] text-[#e77114]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">factory</span>
          Landed Costs ({landedCosts.filter((l) => l.active).length})
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'rules'
              ? 'border-[#e77114] text-[#e77114]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">tune</span>
          Markup Rules ({pricingRules.filter((r) => r.active).length})
        </button>

        <button
          onClick={() => setActiveTab('ranges')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'ranges'
              ? 'border-[#e77114] text-[#e77114]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">price_change</span>
          Public Range Overrides ({publicPriceRanges.filter((r) => r.active).length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-[#e77114] text-[#e77114]'
              : 'border-transparent text-[#75777e] hover:text-[#041632]'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          Pricing Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: LANDED COSTS */}
      {activeTab === 'landed' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff] flex justify-between items-center">
              <div>
                <h3 className="font-headline text-base font-bold text-[#041632]">
                  Active &amp; Historical Landed Cost Tiers
                </h3>
                <p className="font-mono-data text-[11px] text-[#75777e]">
                  Versioned unit manufacturing + freight base costs per territory and batch size
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono-data text-xs">
                <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Territory</th>
                    <th className="py-3 px-4">Box SKU</th>
                    <th className="py-3 px-4">Volume Tier</th>
                    <th className="py-3 px-4">Landed Cost</th>
                    <th className="py-3 px-4">Effective Dates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c6ce]/50">
                  {landedCosts.map((lc) => (
                    <tr key={lc.id} className={lc.active ? 'hover:bg-[#f8f9ff]' : 'bg-gray-50/70 opacity-60'}>
                      <td className="py-3 px-4 font-bold text-[#041632]">
                        {lc.countryName} ({lc.countryCode})
                      </td>
                      <td className="py-3 px-4 text-[#041632]">
                        <span className="font-bold">{lc.boxSizeLabel}</span> • {lc.material} • {lc.print}
                      </td>
                      <td className="py-3 px-4 text-[#44474d]">
                        {lc.qtyTierMin.toLocaleString()}
                        {lc.qtyTierMax ? ` – ${lc.qtyTierMax.toLocaleString()}` : '+'} pcs
                      </td>
                      <td className="py-3 px-4 font-bold text-[#e77114] text-sm">
                        {formatCurrency(lc.costEur)}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-[#75777e]">
                        {new Date(lc.effectiveFrom).toLocaleDateString('en-GB')}
                        {lc.effectiveTo ? ` to ${new Date(lc.effectiveTo).toLocaleDateString('en-GB')}` : ' (Current)'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            lc.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {lc.active ? 'ACTIVE' : 'RETIRED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggle('LANDED_COST', lc.id, lc.active)}
                          disabled={isPending}
                          className="text-[11px] text-[#041632] hover:text-[#e77114] underline cursor-pointer disabled:opacity-50"
                        >
                          {lc.active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Landed Cost Simulator Helper */}
          <div className="lg:col-span-4 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4 font-mono-data text-xs">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-sm font-bold text-[#041632]">
                Landed Cost Simulator
              </h3>
              <span className="text-[10px] bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded font-bold">
                ESTIMATOR
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[#75777e] mb-1">Factory Cost (€)</label>
                <input
                  type="number"
                  step="0.005"
                  value={simFactory}
                  onChange={(e) => setSimFactory(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-[#c5c6ce] rounded bg-[#f8f9ff]"
                />
              </div>

              <div>
                <label className="block text-[#75777e] mb-1">Ocean/Cross-border Freight (€)</label>
                <input
                  type="number"
                  step="0.005"
                  value={simFreight}
                  onChange={(e) => setSimFreight(parseFloat(e.target.value) || 0)}
                  className="w-full h-9 px-3 border border-[#c5c6ce] rounded bg-[#f8f9ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#75777e] mb-1">Port/Customs (€)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={simPort}
                    onChange={(e) => setSimPort(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-[#c5c6ce] rounded bg-[#f8f9ff]"
                  />
                </div>
                <div>
                  <label className="block text-[#75777e] mb-1">Inland Hub (€)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={simLogistics}
                    onChange={(e) => setSimLogistics(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 px-3 border border-[#c5c6ce] rounded bg-[#f8f9ff]"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#c5c6ce] space-y-2">
                <div className="flex justify-between font-bold text-[#041632]">
                  <span>Calculated Landed:</span>
                  <span>{formatCurrency(simLanded)}</span>
                </div>

                <div>
                  <div className="flex justify-between text-[#75777e] mb-1">
                    <span>Target Margin:</span>
                    <span className="font-bold text-[#e77114]">{simMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={simMargin}
                    onChange={(e) => setSimMargin(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#c5c6ce] rounded-lg appearance-none cursor-pointer accent-[#e77114]"
                  />
                </div>

                <div className="bg-[#dce9ff] p-3 rounded text-center">
                  <span className="text-[11px] text-[#75777e] uppercase block font-bold">
                    Target Unit Selling Price
                  </span>
                  <span className="font-headline text-xl font-bold text-[#041632]">
                    {formatCurrency(simMSRP)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING RULES */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff] flex justify-between items-center">
            <div>
              <h3 className="font-headline text-base font-bold text-[#041632]">
                Markup Hierarchy Resolution Rules
              </h3>
              <p className="font-mono-data text-[11px] text-[#75777e]">
                Evaluated from most specific to general: Product Override → Country Override → Global Default
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Rule Scope</th>
                  <th className="py-3 px-4">Country Target</th>
                  <th className="py-3 px-4">Product Target</th>
                  <th className="py-3 px-4">Min Markup</th>
                  <th className="py-3 px-4">Max Markup</th>
                  <th className="py-3 px-4">Effective Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50">
                {pricingRules.map((pr) => (
                  <tr key={pr.id} className={pr.active ? 'hover:bg-[#f8f9ff]' : 'bg-gray-50/70 opacity-60'}>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] ${
                          pr.scope === 'PRODUCT'
                            ? 'bg-[#ffdeac] text-[#735a31]'
                            : pr.scope === 'COUNTRY'
                            ? 'bg-[#dce9ff] text-[#041632]'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {pr.scope}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#041632]">
                      {pr.countryName ? `${pr.countryName} (${pr.countryCode})` : '— Global —'}
                    </td>
                    <td className="py-3 px-4 text-[#041632]">
                      {pr.boxSizeLabel || '— All Products —'}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      {(parseFloat(pr.markupMin) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-bold text-[#e77114]">
                      {(parseFloat(pr.markupMax) * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#75777e]">
                      {new Date(pr.effectiveFrom).toLocaleDateString('en-GB')}
                      {pr.effectiveTo ? ` to ${new Date(pr.effectiveTo).toLocaleDateString('en-GB')}` : ' (Current)'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {pr.active ? 'ACTIVE' : 'RETIRED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggle('PRICING_RULE', pr.id, pr.active)}
                        disabled={isPending}
                        className="text-[11px] text-[#041632] hover:text-[#e77114] underline cursor-pointer disabled:opacity-50"
                      >
                        {pr.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PUBLIC PRICE RANGES */}
      {activeTab === 'ranges' && (
        <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff] flex justify-between items-center">
            <div>
              <h3 className="font-headline text-base font-bold text-[#041632]">
                Public Savings Calculator Overrides
              </h3>
              <p className="font-mono-data text-[11px] text-[#75777e]">
                Explicit price bands displayed to anonymous prospective clients without exposing internal landed cost
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Territory</th>
                  <th className="py-3 px-4">Box SKU</th>
                  <th className="py-3 px-4">Public Minimum</th>
                  <th className="py-3 px-4">Public Maximum</th>
                  <th className="py-3 px-4">Override Source</th>
                  <th className="py-3 px-4">Effective Dates</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50">
                {publicPriceRanges.map((pr) => (
                  <tr key={pr.id} className={pr.active ? 'hover:bg-[#f8f9ff]' : 'bg-gray-50/70 opacity-60'}>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      {pr.countryName} ({pr.countryCode})
                    </td>
                    <td className="py-3 px-4 text-[#041632]">
                      <span className="font-bold">{pr.boxSizeLabel}</span> • {pr.material} • {pr.print}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      {formatCurrency(pr.minEur)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#e77114]">
                      {formatCurrency(pr.maxEur)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[#dce9ff] text-[#041632] font-bold">
                        {pr.isManualOverride ? 'MANUAL OVERRIDE' : 'CALCULATED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#75777e]">
                      {new Date(pr.effectiveFrom).toLocaleDateString('en-GB')}
                      {pr.effectiveTo ? ` to ${new Date(pr.effectiveTo).toLocaleDateString('en-GB')}` : ' (Current)'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pr.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {pr.active ? 'ACTIVE' : 'RETIRED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggle('PUBLIC_PRICE_RANGE', pr.id, pr.active)}
                        disabled={isPending}
                        className="text-[11px] text-[#041632] hover:text-[#e77114] underline cursor-pointer disabled:opacity-50"
                      >
                        {pr.active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRICING AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff]">
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Pricing &amp; Matrix Audit History
            </h3>
            <p className="font-mono-data text-[11px] text-[#75777e]">
              Timestamped chronological log of all manual and bulk version adjustments
            </p>
          </div>

          <div className="divide-y divide-[#c5c6ce]/60 font-mono-data text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-[#f8f9ff] flex flex-col md:flex-row justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1b2b48] text-white font-bold">
                      {log.entityType}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#ffdeac] text-[#735a31] font-bold">
                      {log.action}
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="font-bold text-[#041632]">{log.authorName || 'System'}</span>
                  </div>

                  <div className="text-[#44474d] text-[11px]">
                    {log.newValues && (
                      <span>
                        Applied: {JSON.stringify(log.newValues)}
                      </span>
                    )}
                    {log.oldValues && (
                      <span className="text-[#75777e] block">
                        Previous: {JSON.stringify(log.oldValues)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-[#75777e] text-[11px] shrink-0">
                  {formatDateTime(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Diff & Validation Modal (Excel Preview with Mode and Conflict Badges) */}
      {previewResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#c5c6ce] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#c5c6ce] flex justify-between items-start bg-[#f8f9ff] rounded-t-xl shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono-data font-bold ${
                      previewResult.importMode === 'UPDATE_EXISTING'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : previewResult.importMode === 'ADD_NEW'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    MODE: {previewResult.importMode}
                  </span>
                  <span className="text-[11px] font-mono-data text-[#75777e]">
                    ({previewResult.importMode === 'UPDATE_EXISTING' ? 'Version Conflict Checking' : 'Duplicate Protection Active'})
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold text-[#041632]">
                  {previewResult.fileName}
                </h3>
                <div className="flex items-center gap-3 mt-1 font-mono-data text-xs text-[#75777e]">
                  <span>Total Rows Evaluated: {previewResult.summary.totalRows}</span>
                  <span>•</span>
                  <span>Switch Mode:</span>
                  <button
                    onClick={() => handleReevaluateMode('UPDATE_EXISTING')}
                    disabled={isParsingExcel || previewResult.importMode === 'UPDATE_EXISTING'}
                    className={`underline cursor-pointer ${previewResult.importMode === 'UPDATE_EXISTING' ? 'font-bold text-[#041632]' : 'text-blue-700'}`}
                  >
                    Update Existing
                  </button>
                  <span>|</span>
                  <button
                    onClick={() => handleReevaluateMode('ADD_NEW')}
                    disabled={isParsingExcel || previewResult.importMode === 'ADD_NEW'}
                    className={`underline cursor-pointer ${previewResult.importMode === 'ADD_NEW' ? 'font-bold text-[#041632]' : 'text-amber-700'}`}
                  >
                    Add New
                  </button>
                </div>
              </div>

              {/* Summary Metric Badges */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-mono-data font-bold">
                  +{previewResult.summary.insertsCount} New
                </span>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-mono-data font-bold">
                  ~{previewResult.summary.updatesCount} Updates
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-mono-data font-bold">
                  ={previewResult.summary.unchangedCount} Unchanged
                </span>
                {previewResult.summary.conflictsCount > 0 && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-lg text-xs font-mono-data font-bold animate-pulse">
                    ⚠️ {previewResult.summary.conflictsCount} Conflicts
                  </span>
                )}
                {previewResult.summary.errorsCount > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-mono-data font-bold animate-pulse">
                    !{previewResult.summary.errorsCount} Errors
                  </span>
                )}
                <button
                  onClick={() => setPreviewResult(null)}
                  className="ml-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="px-6 border-b border-[#c5c6ce] flex gap-2 font-mono-data text-xs shrink-0 bg-white">
              <button
                onClick={() => setPreviewTab('landed')}
                className={`py-3 px-4 font-bold border-b-2 transition-colors cursor-pointer ${
                  previewTab === 'landed'
                    ? 'border-[#e77114] text-[#e77114]'
                    : 'border-transparent text-[#75777e]'
                }`}
              >
                Landed Costs ({previewResult.landedCosts.length})
              </button>

              <button
                onClick={() => setPreviewTab('rules')}
                className={`py-3 px-4 font-bold border-b-2 transition-colors cursor-pointer ${
                  previewTab === 'rules'
                    ? 'border-[#e77114] text-[#e77114]'
                    : 'border-transparent text-[#75777e]'
                }`}
              >
                Pricing Rules ({previewResult.pricingRules.length})
              </button>

              <button
                onClick={() => setPreviewTab('ranges')}
                className={`py-3 px-4 font-bold border-b-2 transition-colors cursor-pointer ${
                  previewTab === 'ranges'
                    ? 'border-[#e77114] text-[#e77114]'
                    : 'border-transparent text-[#75777e]'
                }`}
              >
                Public Overrides ({previewResult.publicPriceRanges.length})
              </button>

              {previewResult.errors.length > 0 && (
                <button
                  onClick={() => setPreviewTab('errors')}
                  className={`py-3 px-4 font-bold border-b-2 transition-colors cursor-pointer text-red-600 ${
                    previewTab === 'errors' ? 'border-red-600' : 'border-transparent'
                  }`}
                >
                  Validation &amp; Conflicts ({previewResult.errors.length})
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 font-mono-data text-xs space-y-4">
              {/* Landed Tab */}
              {previewTab === 'landed' && (
                <div className="overflow-x-auto border border-[#c5c6ce] rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Record ID</th>
                        <th className="py-2.5 px-3">Country</th>
                        <th className="py-2.5 px-3">SKU &amp; Specs</th>
                        <th className="py-2.5 px-3">Volume Tier</th>
                        <th className="py-2.5 px-3">New Landed (€)</th>
                        <th className="py-2.5 px-3">Old Landed (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c5c6ce]/50">
                      {previewResult.landedCosts.map((item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.action === 'CONFLICT'
                              ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                              : item.action === 'INSERT'
                              ? 'bg-emerald-50/50'
                              : item.action === 'UPDATE'
                              ? 'bg-amber-50/50'
                              : item.action === 'INVALID'
                              ? 'bg-red-50/60'
                              : 'hover:bg-gray-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-bold text-gray-500">#{item.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.action === 'CONFLICT'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : item.action === 'INSERT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.action === 'UPDATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.action === 'INVALID'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-gray-400 font-mono text-[10px]">
                            {item.recordId || item.existingId || '— (New) —'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#041632]">{item.countryCode}</td>
                          <td className="py-2.5 px-3">
                            {item.boxSizeLabel} • {item.material} • {item.print}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {item.qtyTierMin.toLocaleString()}
                            {item.qtyTierMax ? ` – ${item.qtyTierMax.toLocaleString()}` : '+'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#e77114]">
                            {formatCurrency(item.newCostEur)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            {item.oldCostEur !== undefined && item.oldCostEur !== null
                              ? formatCurrency(item.oldCostEur)
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Rules Tab */}
              {previewTab === 'rules' && (
                <div className="overflow-x-auto border border-[#c5c6ce] rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Scope</th>
                        <th className="py-2.5 px-3">Country</th>
                        <th className="py-2.5 px-3">Box Size</th>
                        <th className="py-2.5 px-3">New Markup Range</th>
                        <th className="py-2.5 px-3">Old Markup Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c5c6ce]/50">
                      {previewResult.pricingRules.map((item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.action === 'CONFLICT'
                              ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                              : item.action === 'INSERT'
                              ? 'bg-emerald-50/50'
                              : item.action === 'UPDATE'
                              ? 'bg-amber-50/50'
                              : item.action === 'INVALID'
                              ? 'bg-red-50/60'
                              : 'hover:bg-gray-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-bold text-gray-500">#{item.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.action === 'CONFLICT'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : item.action === 'INSERT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.action === 'UPDATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.action === 'INVALID'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#041632]">{item.scope}</td>
                          <td className="py-2.5 px-3">{item.countryCode || '— Global —'}</td>
                          <td className="py-2.5 px-3">{item.boxSizeLabel || '— All Sizes —'}</td>
                          <td className="py-2.5 px-3 font-bold text-[#e77114]">
                            {(item.newMarkupMin * 100).toFixed(1)}% – {(item.newMarkupMax * 100).toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            {item.oldMarkupMin !== undefined && item.oldMarkupMin !== null
                              ? `${(item.oldMarkupMin * 100).toFixed(1)}% – ${(Number(item.oldMarkupMax) * 100).toFixed(1)}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Public Ranges Tab */}
              {previewTab === 'ranges' && (
                <div className="overflow-x-auto border border-[#c5c6ce] rounded-lg">
                  <table className="w-full text-left">
                    <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">Country</th>
                        <th className="py-2.5 px-3">SKU Specs</th>
                        <th className="py-2.5 px-3">New Band (€)</th>
                        <th className="py-2.5 px-3">Old Band (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c5c6ce]/50">
                      {previewResult.publicPriceRanges.map((item, idx) => (
                        <tr
                          key={idx}
                          className={
                            item.action === 'CONFLICT'
                              ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                              : item.action === 'INSERT'
                              ? 'bg-emerald-50/50'
                              : item.action === 'UPDATE'
                              ? 'bg-amber-50/50'
                              : item.action === 'INVALID'
                              ? 'bg-red-50/60'
                              : 'hover:bg-gray-50'
                          }
                        >
                          <td className="py-2.5 px-3 font-bold text-gray-500">#{item.rowNumber}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.action === 'CONFLICT'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-300'
                                  : item.action === 'INSERT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.action === 'UPDATE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.action === 'INVALID'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {item.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#041632]">{item.countryCode}</td>
                          <td className="py-2.5 px-3">
                            {item.boxSizeLabel} • {item.material} • {item.print}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[#e77114]">
                            {formatCurrency(item.newMinEur)} – {formatCurrency(item.newMaxEur)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500">
                            {item.oldMinEur !== undefined && item.oldMinEur !== null
                              ? `${formatCurrency(item.oldMinEur)} – ${formatCurrency(item.oldMaxEur || 0)}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Errors & Conflicts Tab */}
              {previewTab === 'errors' && (
                <div className="space-y-2">
                  {previewResult.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg flex items-start gap-3 border ${
                        err.isConflict
                          ? 'bg-purple-50 border-purple-300 text-purple-950'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${err.isConflict ? 'text-purple-700' : 'text-red-600'}`}>
                        {err.isConflict ? 'warning' : 'cancel'}
                      </span>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>[{err.sheet}] Row #{err.rowNumber} • Field: {err.field}</span>
                          {err.isConflict && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-200 text-purple-900 font-bold">
                              CONFLICT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] mt-0.5 font-medium">{err.message}</div>
                        {err.value && (
                          <div className="text-gray-500 text-[10px] mt-0.5">
                            Received value: &quot;{String(err.value)}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#c5c6ce] bg-[#f8f9ff] flex justify-between items-center rounded-b-xl shrink-0">
              <div className="font-mono-data text-xs text-[#75777e]">
                {previewResult.canCommit ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Validation passed in {previewResult.importMode} mode. Ready to commit.
                  </span>
                ) : previewResult.summary.conflictsCount > 0 ? (
                  <span className="text-purple-800 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {previewResult.summary.conflictsCount} version conflicts detected. Resolve or re-export to proceed.
                  </span>
                ) : (
                  <span className="text-red-700 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Validation errors block committing. Please correct spreadsheet rows.
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewResult(null)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg hover:bg-white text-gray-700 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={handleCommitBulk}
                  disabled={!previewResult.canCommit || isCommitting}
                  className="bg-[#041632] hover:bg-[#1b2b48] text-white px-6 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-md"
                >
                  {isCommitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Committing Transaction...
                    </>
                  ) : (
                    `Commit ${previewResult.summary.insertsCount + previewResult.summary.updatesCount} Changes`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Create Landed Cost */}
      {showCostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                New Landed Cost Version
              </h3>
              <button onClick={() => setShowCostModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCost} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-gray-700 mb-1">Target Country</label>
                <select
                  value={costForm.countryId}
                  onChange={(e) => setCostForm({ ...costForm, countryId: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Box SKU &amp; Specs</label>
                <select
                  value={costForm.boxConfigId}
                  onChange={(e) => setCostForm({ ...costForm, boxConfigId: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                >
                  {boxConfigs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.sizeLabel} • {b.material} • {b.print}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 mb-1">Min Tier Volume</label>
                  <input
                    type="number"
                    value={costForm.qtyTierMin}
                    onChange={(e) => setCostForm({ ...costForm, qtyTierMin: parseInt(e.target.value) || 0 })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Max Tier (optional)</label>
                  <input
                    type="number"
                    placeholder="Leave blank for +"
                    value={costForm.qtyTierMax}
                    onChange={(e) => setCostForm({ ...costForm, qtyTierMax: e.target.value ? parseInt(e.target.value) : '' })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Unit Landed Cost (€ EUR)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={costForm.costEur}
                  onChange={(e) => setCostForm({ ...costForm, costEur: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded font-bold text-[#e77114]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c6ce]">
                <button
                  type="button"
                  onClick={() => setShowCostModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#041632] hover:bg-[#1b2b48] text-white px-4 py-2 rounded font-bold"
                >
                  {isPending ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Pricing Rule */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                New Markup Rule
              </h3>
              <button onClick={() => setShowRuleModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-gray-700 mb-1">Scope</label>
                <select
                  value={ruleForm.scope}
                  onChange={(e) => setRuleForm({ ...ruleForm, scope: e.target.value as any })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white font-bold"
                >
                  <option value="GLOBAL">GLOBAL (Applies across all countries)</option>
                  <option value="COUNTRY">COUNTRY (Overrides global for specific country)</option>
                  <option value="PRODUCT">PRODUCT (Overrides country &amp; global for SKU)</option>
                </select>
              </div>

              {ruleForm.scope !== 'GLOBAL' && (
                <div>
                  <label className="block text-gray-700 mb-1">Country</label>
                  <select
                    value={ruleForm.countryId}
                    onChange={(e) => setRuleForm({ ...ruleForm, countryId: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                  >
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {ruleForm.scope === 'PRODUCT' && (
                <div>
                  <label className="block text-gray-700 mb-1">Box SKU</label>
                  <select
                    value={ruleForm.boxConfigId}
                    onChange={(e) => setRuleForm({ ...ruleForm, boxConfigId: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                  >
                    {boxConfigs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.sizeLabel} • {b.material} • {b.print}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 mb-1">Min Markup (15–45%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.15"
                    max="0.45"
                    value={ruleForm.markupMin}
                    onChange={(e) => setRuleForm({ ...ruleForm, markupMin: parseFloat(e.target.value) || 0.15 })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded font-bold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Max Markup (15–45%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.15"
                    max="0.45"
                    value={ruleForm.markupMax}
                    onChange={(e) => setRuleForm({ ...ruleForm, markupMax: parseFloat(e.target.value) || 0.35 })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded font-bold text-[#e77114]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c6ce]">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#041632] hover:bg-[#1b2b48] text-white px-4 py-2 rounded font-bold"
                >
                  {isPending ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Range Override */}
      {showRangeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#c5c6ce] space-y-4">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Public Price Range Override
              </h3>
              <button onClick={() => setShowRangeModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRange} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-gray-700 mb-1">Target Country</label>
                <select
                  value={rangeForm.countryId}
                  onChange={(e) => setRangeForm({ ...rangeForm, countryId: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                >
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-1">Box SKU &amp; Specs</label>
                <select
                  value={rangeForm.boxConfigId}
                  onChange={(e) => setRangeForm({ ...rangeForm, boxConfigId: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded bg-white"
                >
                  {boxConfigs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.sizeLabel} • {b.material} • {b.print}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 mb-1">Min EUR (€)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={rangeForm.minEur}
                    onChange={(e) => setRangeForm({ ...rangeForm, minEur: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded font-bold text-[#041632]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1">Max EUR (€)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={rangeForm.maxEur}
                    onChange={(e) => setRangeForm({ ...rangeForm, maxEur: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded font-bold text-[#e77114]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c6ce]">
                <button
                  type="button"
                  onClick={() => setShowRangeModal(false)}
                  className="px-4 py-2 border border-[#c5c6ce] rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#041632] hover:bg-[#1b2b48] text-white px-4 py-2 rounded font-bold"
                >
                  {isPending ? 'Saving...' : 'Set Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
