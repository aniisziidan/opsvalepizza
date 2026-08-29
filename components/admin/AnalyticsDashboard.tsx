'use client';

import React from 'react';
import { AnalyticsData } from '@/lib/admin/analyticsQueries';
import { formatCurrency } from '@/lib/admin/formatters';

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const handleExportCsv = () => {
    const rows: string[][] = [
      ['OpsVale Commercial Analytics Report'],
      [`Generated at: ${data.generatedAt}`],
      [''],
      ['--- PIPELINE SUMMARY ---'],
      ['Total Leads', String(data.summary.totalLeads)],
      ['Active Pipeline Count', String(data.summary.activePipelineCount)],
      ['Won Leads Count', String(data.summary.wonLeadsCount)],
      ['Lost Leads Count', String(data.summary.lostLeadsCount)],
      ['Overall Conversion Rate (%)', `${data.summary.overallConversionRate}%`],
      ['Total Pipeline Gross (EUR)', String(data.summary.totalPipelineGrossEur)],
      ['Realized Won Revenue (EUR)', String(data.summary.realizedWonRevenueEur)],
      ['Average Contract Value (EUR)', String(data.summary.averageContractValueEur)],
      ['Total Contracted Boxes', String(data.summary.totalContractedBoxes)],
      ['Avg Lead to Quote (Hours)', String(data.summary.avgLeadToQuoteHours)],
      ['Avg Quote to Won (Hours)', String(data.summary.avgQuoteToWonHours)],
      [''],
      ['--- CONVERSION FUNNEL ---'],
      ['Stage', 'Status', 'Count', 'Share of Total (%)', 'Conversion From Prev (%)'],
      ...data.funnel.map((f) => [
        f.stage,
        f.status,
        String(f.count),
        `${f.percentageOfTotal.toFixed(1)}%`,
        `${f.conversionRateFromPrev.toFixed(1)}%`,
      ]),
      [''],
      ['--- TERRITORY BREAKDOWN ---'],
      ['Country Code', 'Country Name', 'Leads', 'Won', 'Total Volume (Boxes)', 'Revenue (EUR)'],
      ...data.territories.map((t) => [
        t.countryCode,
        t.countryName,
        String(t.leadCount),
        String(t.wonCount),
        String(t.totalVolume),
        String(t.totalRevenueEur),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `opsvale_analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `opsvale_telemetry_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-8 bg-[#f8f9ff] font-mono-data text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 bg-[#dce9ff] px-2.5 py-1 rounded text-[11px] font-semibold text-[#041632]">
            <span className="material-symbols-outlined text-xs">monitoring</span>
            Commercial Intelligence &amp; Funnel Telemetry
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Analytics &amp; Pipeline Conversion KPIs
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Real-time commercial velocity, territory volume distributions, and deal flow attribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCsv}
            className="bg-white border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] px-4 py-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow-sm font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export CSV Report
          </button>
          <button
            onClick={handleExportJson}
            className="bg-[#1b2b48] hover:bg-[#041632] text-white px-4 py-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow-md font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">data_object</span>
            Export JSON
          </button>
        </div>
      </div>

      {/* Top Financial & Velocity KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Realized Revenue */}
        <div className="bg-white p-5 rounded-xl border border-[#c5c6ce] shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase text-[#75777e] font-bold">Won Contract Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </div>
          </div>
          <div>
            <span className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
              {formatCurrency(data.summary.realizedWonRevenueEur)}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold block mt-1">
              {data.summary.totalContractedBoxes.toLocaleString()} boxes contracted
            </span>
          </div>
        </div>

        {/* Card 2: Active Pipeline Gross */}
        <div className="bg-white p-5 rounded-xl border border-[#c5c6ce] shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase text-[#75777e] font-bold">Active Pipeline Value</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">payments</span>
            </div>
          </div>
          <div>
            <span className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
              {formatCurrency(data.summary.totalPipelineGrossEur)}
            </span>
            <span className="text-[11px] text-blue-800 font-bold block mt-1">
              {data.summary.activePipelineCount} active opportunities
            </span>
          </div>
        </div>

        {/* Card 3: Average Contract Value */}
        <div className="bg-white p-5 rounded-xl border border-[#c5c6ce] shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase text-[#75777e] font-bold">Average Deal Value (ACV)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">receipt_long</span>
            </div>
          </div>
          <div>
            <span className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
              {formatCurrency(data.summary.averageContractValueEur)}
            </span>
            <span className="text-[11px] text-amber-900 font-bold block mt-1">
              {data.summary.overallConversionRate}% closed-won rate
            </span>
          </div>
        </div>

        {/* Card 4: Velocity */}
        <div className="bg-white p-5 rounded-xl border border-[#c5c6ce] shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[11px] uppercase text-[#75777e] font-bold">Commercial Velocity</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">speed</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-2xl font-bold text-[#041632]">
                {data.summary.avgLeadToQuoteHours}h
              </span>
              <span className="text-[11px] text-[#75777e]">to quote</span>
            </div>
            <span className="text-[11px] text-purple-800 font-bold block mt-1">
              {data.summary.avgQuoteToWonHours}h avg time-to-close
            </span>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff] flex justify-between items-center">
          <div>
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Commercial Pipeline Conversion Funnel
            </h3>
            <p className="text-[11px] text-[#75777e]">
              Stage-by-stage progression from web inquiry to formal contract execution
            </p>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded bg-[#dce9ff] text-[#041632] font-bold">
            Total Leads: {data.summary.totalLeads}
          </span>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-4">
            {data.funnel.map((stage, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1b2b48] text-white flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#041632]">{stage.stage}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({stage.status})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#041632]">{stage.count} deals</span>
                    <span className="text-[11px] text-[#75777e] font-medium">
                      ({stage.percentageOfTotal.toFixed(1)}% of total)
                    </span>
                  </div>
                </div>

                {/* Funnel Progress Bar */}
                <div className="w-full bg-[#f0f2f8] h-4 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      idx === 0
                        ? 'bg-[#1b2b48]'
                        : idx === 1
                        ? 'bg-blue-600'
                        : idx === 2
                        ? 'bg-amber-500'
                        : idx === 3
                        ? 'bg-purple-600'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.max(5, stage.percentageOfTotal)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Territory Revenue & Product Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Territory Breakdown (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c5c6ce] bg-[#eff4ff] flex justify-between items-center">
            <div>
              <h3 className="font-headline text-base font-bold text-[#041632]">
                Territory Revenue &amp; Freight Corridor Breakdown
              </h3>
              <p className="text-[11px] text-[#75777e]">
                Deal distribution and contracted pallet volumes across European destinations
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-3 px-4">Territory</th>
                  <th className="py-3 px-4">Leads</th>
                  <th className="py-3 px-4">Won Contracts</th>
                  <th className="py-3 px-4">Total Boxes</th>
                  <th className="py-3 px-4 text-right">Revenue (EUR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50">
                {data.territories.map((t) => (
                  <tr key={t.countryCode} className="hover:bg-[#f8f9ff]">
                    <td className="py-3 px-4 font-bold text-[#041632]">
                      <span className="px-2 py-0.5 rounded bg-gray-100 mr-2 text-[10px]">
                        {t.countryCode}
                      </span>
                      {t.countryName}
                    </td>
                    <td className="py-3 px-4 text-[#44474d]">{t.leadCount}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{t.wonCount}</td>
                    <td className="py-3 px-4 text-[#44474d]">{t.totalVolume.toLocaleString()} pcs</td>
                    <td className="py-3 px-4 font-bold text-[#e77114] text-right text-sm">
                      {formatCurrency(t.totalRevenueEur)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Spec Distributions (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#c5c6ce] pb-3">
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Packaging Specification Demand
            </h3>
            <p className="text-[11px] text-[#75777e]">Share of inquiries by box specifications</p>
          </div>

          {/* Box Size */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold text-[#041632] block">Box Dimensions</span>
            <div className="space-y-1.5">
              {data.productDistribution.boxSizes.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-bold">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#f0f2f8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#e77114] h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Material */}
          <div className="space-y-2 pt-3 border-t border-[#c5c6ce]/60">
            <span className="text-[11px] uppercase font-bold text-[#041632] block">Paperboard Material</span>
            <div className="space-y-1.5">
              {data.productDistribution.materials.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-bold">{item.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-[#f0f2f8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#1b2b48] h-full rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Source Attribution */}
          <div className="space-y-2 pt-3 border-t border-[#c5c6ce]/60">
            <span className="text-[11px] uppercase font-bold text-[#041632] block">Acquisition Channel</span>
            <div className="space-y-1.5">
              {data.sources.map((item) => (
                <div key={item.source} className="flex justify-between items-center py-1 text-[11px]">
                  <span>{item.source}</span>
                  <span className="font-bold text-[#041632]">{item.count} inquiries ({item.wonCount} won)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
