'use client';

import React, { useState } from 'react';

interface MarginHelperTooltipProps {
  unitPriceEur: number | string;
  landedCostEur?: number;
  suggestedMinEur?: number;
  suggestedMaxEur?: number;
  markupMinPct?: number;
  markupMaxPct?: number;
  countryName?: string;
}

export const MarginHelperTooltip: React.FC<MarginHelperTooltipProps> = ({
  unitPriceEur,
  landedCostEur,
  suggestedMinEur,
  suggestedMaxEur,
  markupMinPct = 15,
  markupMaxPct = 45,
  countryName,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const priceNum = typeof unitPriceEur === 'string' ? parseFloat(unitPriceEur) : unitPriceEur;

  // Safe margin calculations
  const hasLanded = typeof landedCostEur === 'number' && landedCostEur > 0;
  const isValidPrice = typeof priceNum === 'number' && !isNaN(priceNum) && priceNum > 0;

  const grossProfitEur = hasLanded && isValidPrice ? priceNum - landedCostEur : 0;
  const grossMarginPct = hasLanded && isValidPrice ? ((priceNum - landedCostEur) / priceNum) * 100 : null;
  const markupPct = hasLanded && isValidPrice ? ((priceNum - landedCostEur) / landedCostEur) * 100 : null;

  // Tier classification
  let tierLabel = 'Standard Margin';
  let tierBadgeBg = 'bg-blue-100 text-blue-800 border-blue-200';
  let barColor = 'bg-blue-600';

  if (grossMarginPct !== null) {
    if (grossMarginPct < 15) {
      tierLabel = 'Below 15% Governance Floor';
      tierBadgeBg = 'bg-red-100 text-red-800 border-red-200';
      barColor = 'bg-red-500';
    } else if (grossMarginPct < 25) {
      tierLabel = 'Competitive Volume Tier';
      tierBadgeBg = 'bg-amber-100 text-amber-800 border-amber-200';
      barColor = 'bg-amber-500';
    } else if (grossMarginPct <= 45) {
      tierLabel = 'Target Profitability Tier';
      tierBadgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      barColor = 'bg-emerald-500';
    } else {
      tierLabel = 'Premium / Specialized';
      tierBadgeBg = 'bg-purple-100 text-purple-800 border-purple-200';
      barColor = 'bg-purple-500';
    }
  }

  return (
    <div className="bg-[#eff4ff] border border-[#c5c6ce] rounded-lg p-3 font-mono-data text-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[#e77114] text-base">analytics</span>
          <span className="font-bold text-[#041632] uppercase tracking-wider text-[11px]">
            Live Commercial Margin Meter
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowInfoModal(!showInfoModal)}
          className="text-[#4f5e7e] hover:text-[#041632] p-0.5 rounded cursor-pointer flex items-center gap-1 text-[10px]"
          title="Explain margin hierarchy governance"
        >
          <span className="material-symbols-outlined text-sm">help</span>
          <span className="underline">Rules</span>
        </button>
      </div>

      {hasLanded && isValidPrice ? (
        <div className="space-y-2">
          {/* Main Gross Margin Display */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[#4f5e7e]">Gross Margin:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#041632]">
                {grossMarginPct !== null ? `${grossMarginPct.toFixed(1)}%` : '—'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tierBadgeBg}`}>
                {tierLabel}
              </span>
            </div>
          </div>

          {/* Progress Visualizer */}
          <div className="w-full bg-[#dce9ff] h-2 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${barColor}`}
              style={{
                width: `${Math.min(Math.max((grossMarginPct || 0), 0), 100)}%`,
              }}
            />
          </div>

          {/* Detailed metrics breakdown */}
          <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] border-t border-[#c5c6ce]/60 text-center">
            <div className="bg-white/80 p-1.5 rounded border border-[#e2e4ef]">
              <span className="text-[#75777e] block">Base Landed</span>
              <span className="font-bold text-[#041632]">€{landedCostEur.toFixed(4)}</span>
            </div>
            <div className="bg-white/80 p-1.5 rounded border border-[#e2e4ef]">
              <span className="text-[#75777e] block">Unit Profit</span>
              <span className={`font-bold ${grossProfitEur >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                {grossProfitEur >= 0 ? '+' : ''}€{grossProfitEur.toFixed(4)}
              </span>
            </div>
            <div className="bg-white/80 p-1.5 rounded border border-[#e2e4ef]">
              <span className="text-[#75777e] block">Cost Markup</span>
              <span className="font-bold text-[#041632]">
                {markupPct !== null ? `${markupPct.toFixed(1)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-[#75777e] py-1 italic">
          Enter a unit price and select quantity to calculate live gross margin and profit indicators.
        </div>
      )}

      {/* Suggested Corridor Range */}
      {suggestedMinEur && suggestedMaxEur ? (
        <div className="flex justify-between text-[11px] pt-1 border-t border-[#c5c6ce]/60">
          <span className="text-[#4f5e7e]">Corridor Suggested Price:</span>
          <span className="font-bold text-[#e77114]">
            €{suggestedMinEur.toFixed(4)} – €{suggestedMaxEur.toFixed(4)}
            {countryName ? ` (${countryName})` : ''}
          </span>
        </div>
      ) : null}

      {/* Governance Explanatory Modal / Dropdown */}
      {showInfoModal && (
        <div className="bg-white p-3 rounded-lg border border-[#c5c6ce] shadow-md text-[11px] space-y-2 mt-2 animate-in fade-in duration-100">
          <div className="flex justify-between items-center font-bold text-[#041632] pb-1 border-b border-[#e2e4ef]">
            <span>OpsVale Margin Governance</span>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="text-[#75777e] hover:text-[#041632]"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          <p className="text-[#44474d] leading-relaxed">
            The platform enforces a strict 3-tier hierarchy to protect profitability across all European freight corridors:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[#4f5e7e]">
            <li><strong>Floor (15%):</strong> Minimum permitted gross margin without executive override.</li>
            <li><strong>Target (15%–45%):</strong> Recommended commercial wholesale band factoring logistics.</li>
            <li><strong>Public Isolation:</strong> Landed costs are server-only and strictly omitted from customer proposals.</li>
          </ul>
        </div>
      )}
    </div>
  );
};
