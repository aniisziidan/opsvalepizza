'use client';

import React, { useState } from 'react';

export const PricingManagement: React.FC = () => {
  // Landed Cost Simulator State
  const [factoryCost, setFactoryCost] = useState<number>(0.150);
  const [freightCost, setFreightCost] = useState<number>(0.025);
  const [portFees, setPortFees] = useState<number>(0.005);
  const [logisticsCost, setLogisticsCost] = useState<number>(0.010);
  const [targetMargin, setTargetMargin] = useState<number>(25);

  // Country multiplier overrides
  const [countryMultipliers, setCountryMultipliers] = useState([
    { country: 'Germany (DE)', code: 'DE', multiplier: 1.00, hub: 'Munich Central', status: 'Active' },
    { country: 'Italy (IT)', code: 'IT', multiplier: 0.98, hub: 'Milan Hub', status: 'Active' },
    { country: 'France (FR)', code: 'FR', multiplier: 1.02, hub: 'Paris Depot', status: 'Active' },
    { country: 'Spain (ES)', code: 'ES', multiplier: 1.01, hub: 'Madrid South', status: 'Active' },
    { country: 'United Kingdom (UK)', code: 'UK', multiplier: 1.08, hub: 'London Thames', status: 'Active' },
    { country: 'Poland (PL)', code: 'PL', multiplier: 0.96, hub: 'Warsaw Hub', status: 'Active' },
  ]);

  // Bulk operation status
  const [pendingChanges, setPendingChanges] = useState<number>(0);
  const [showCommitToast, setShowCommitToast] = useState<boolean>(false);

  // Math for Landed Cost
  const totalLandedCost = factoryCost + freightCost + portFees + logisticsCost;
  const targetMSRP = totalLandedCost / (1 - targetMargin / 100);
  const unitGrossProfit = targetMSRP - totalLandedCost;

  const handleSimulateCSVUpload = () => {
    setPendingChanges(14);
  };

  const handleCommitPricing = () => {
    setShowCommitToast(true);
    setPendingChanges(0);
    setTimeout(() => setShowCommitToast(false), 3000);
  };

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-8 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            European Supply Chain Economics
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Pricing Management &amp; Landed Cost Engine
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Configure base pricing, country overrides, and simulate landed costs across European logistics corridors.
          </p>
        </div>

        {pendingChanges > 0 && (
          <div className="flex items-center gap-3 bg-[#ffdeac] border border-[#e3c290] px-4 py-2 rounded-lg">
            <span className="material-symbols-outlined text-[#735a31] text-lg">info</span>
            <span className="font-mono-data text-xs text-[#735a31] font-bold">
              {pendingChanges} SKUs Ready to Commit
            </span>
            <button
              onClick={handleCommitPricing}
              className="bg-[#041632] text-white px-3 py-1 rounded font-mono-data text-xs uppercase font-bold hover:bg-[#1b2b48] cursor-pointer"
            >
              Commit
            </button>
          </div>
        )}
      </div>

      {showCommitToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600">check_circle</span>
          <span>New pricing rules committed and distributed to all 14 dispatch routing tables.</span>
        </div>
      )}

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Landed Cost Simulator */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#041632]">Landed Cost Simulator</h3>
                <p className="font-mono-data text-xs text-[#75777e]">Calculate true unit landed cost per box</p>
              </div>
              <span className="material-symbols-outlined text-[#e77114]">analytics</span>
            </div>

            <div className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-[#75777e] mb-1 font-semibold">Factory Unit Cost (€)</label>
                <input
                  type="number"
                  step="0.005"
                  value={factoryCost}
                  onChange={(e) => setFactoryCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3 font-bold text-sm text-[#041632]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#75777e] mb-1 font-semibold">Freight (€)</label>
                  <input
                    type="number"
                    step="0.005"
                    value={freightCost}
                    onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#75777e] mb-1 font-semibold">Port/Taxes (€)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={portFees}
                    onChange={(e) => setPortFees(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#75777e] mb-1 font-semibold">Logistics (€)</label>
                  <input
                    type="number"
                    step="0.005"
                    value={logisticsCost}
                    onChange={(e) => setLogisticsCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-2.5 font-bold text-xs"
                  />
                </div>
              </div>

              {/* Total Landed Cost badge */}
              <div className="bg-[#eff4ff] border border-[#c5c6ce] p-4 rounded-lg flex justify-between items-center">
                <span className="font-semibold text-[#041632]">Total Landed Cost:</span>
                <span className="font-headline text-xl font-bold text-[#041632]">€{totalLandedCost.toFixed(3)} / box</span>
              </div>

              {/* Margin Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-[#041632]">Target Gross Margin:</span>
                  <span className="font-bold text-[#e77114] text-sm">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                  className="w-full accent-[#e77114] cursor-pointer"
                />
              </div>

              {/* Resulting MSRP Card */}
              <div className="bg-[#041632] text-white p-5 rounded-lg space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#8393b5] uppercase text-[11px]">Recommended Wholesale Price (MSRP)</span>
                  <span className="font-headline text-2xl font-bold text-[#ffdeac]">€{targetMSRP.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[#8393b5] text-[11px] pt-1 border-t border-white/10">
                  <span>Gross Profit per box:</span>
                  <span className="text-emerald-400 font-bold">€{unitGrossProfit.toFixed(3)}</span>
                </div>
                <div className="flex justify-between text-[#8393b5] text-[11px]">
                  <span>Annual Profit (1,000,000 units):</span>
                  <span className="text-emerald-400 font-bold">€{(unitGrossProfit * 1000000).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Country Multipliers & Bulk Operations */}
        <div className="lg:col-span-6 space-y-6">
          {/* Country Overrides Table */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Regional Price Multipliers</h3>
              <span className="material-symbols-outlined text-[#75777e]">public</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full font-mono-data text-xs text-left">
                <thead>
                  <tr className="border-b border-[#c5c6ce] text-[#75777e]">
                    <th className="pb-2">Country / Hub</th>
                    <th className="pb-2">Multiplier</th>
                    <th className="pb-2">Simulated Base</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c6ce]/50">
                  {countryMultipliers.map((cm) => (
                    <tr key={cm.code} className="hover:bg-[#f8f9ff]">
                      <td className="py-2.5">
                        <span className="font-bold text-[#041632] block">{cm.country}</span>
                        <span className="text-[10px] text-[#75777e]">{cm.hub}</span>
                      </td>
                      <td className="py-2.5 font-bold text-[#041632]">{cm.multiplier}x</td>
                      <td className="py-2.5 font-bold text-[#e77114]">
                        €{(targetMSRP * cm.multiplier).toFixed(3)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bulk Operations */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-headline text-lg font-bold text-[#041632]">Bulk SKU Price Management</h3>
            <p className="font-body text-xs text-[#44474d]">
              Export current SKU price matrix, edit in Excel/Google Sheets, and upload to stage batch updates.
            </p>

            <div className="flex flex-wrap gap-3 font-mono-data text-xs">
              <button
                onClick={() => alert('Downloading: OpsVale_Master_Pricing_Matrix_2024.csv')}
                className="bg-[#eff4ff] hover:bg-[#dce9ff] text-[#041632] px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-[#c5c6ce] cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">download</span>
                Download Master Matrix (.csv)
              </button>
            </div>

            <div
              onClick={handleSimulateCSVUpload}
              className="border-2 border-dashed border-[#c5c6ce] hover:border-[#041632] bg-[#f8f9ff] p-6 rounded-lg text-center cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-3xl text-[#44474d] mb-1">upload_file</span>
              <p className="font-body text-xs font-bold text-[#041632]">Click to simulate uploading edited Pricing CSV</p>
              <p className="font-mono-data text-[10px] text-[#75777e]">Auto-validates margin constraints &amp; SKU codes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
