'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  VisitorIntelligenceData,
  DateRangePreset,
} from '@/lib/analytics/types';

interface VisitorsIntelligenceViewProps {
  data: VisitorIntelligenceData;
}

export const VisitorsIntelligenceView: React.FC<VisitorsIntelligenceViewProps> = ({ data }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedRange, setSelectedRange] = useState<DateRangePreset>(
    data.timeframe.rangePreset || '30D'
  );
  const [selectedCountry, setSelectedCountry] = useState<string>(
    data.filterApplied.country || 'ALL'
  );
  const [selectedLocale, setSelectedLocale] = useState<string>(
    data.filterApplied.locale || 'ALL'
  );
  const [selectedSource, setSelectedSource] = useState<string>(
    data.filterApplied.source || 'ALL'
  );
  const [activeChartMetric, setActiveChartMetric] = useState<'all' | 'visitors' | 'sessions' | 'quotes'>('all');
  const [lastRefreshedSec, setLastRefreshedSec] = useState<number>(0);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Auto-refresh timer every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setLastRefreshedSec((prev) => prev + 1);
    }, 1000);

    const refreshInterval = setInterval(() => {
      router.refresh();
      setLastRefreshedSec(0);
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(refreshInterval);
    };
  }, [router]);

  const applyFilters = (newRange?: DateRangePreset, newCountry?: string, newLocale?: string, newSource?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newRange || selectedRange);

    const c = newCountry !== undefined ? newCountry : selectedCountry;
    if (c && c !== 'ALL') params.set('country', c);
    else params.delete('country');

    const l = newLocale !== undefined ? newLocale : selectedLocale;
    if (l && l !== 'ALL') params.set('locale', l);
    else params.delete('locale');

    const s = newSource !== undefined ? newSource : selectedSource;
    if (s && s !== 'ALL') params.set('source', s);
    else params.delete('source');

    router.push(`/admin/visitors?${params.toString()}`);
  };

  const handleRangeChange = (preset: DateRangePreset) => {
    setSelectedRange(preset);
    applyFilters(preset);
  };

  const handleCountryChange = (c: string) => {
    setSelectedCountry(c);
    applyFilters(undefined, c);
  };

  const handleLocaleChange = (l: string) => {
    setSelectedLocale(l);
    applyFilters(undefined, undefined, l);
  };

  const handleSourceChange = (s: string) => {
    setSelectedSource(s);
    applyFilters(undefined, undefined, undefined, s);
  };

  // Helper for Delta Badges
  const renderDeltaBadge = (deltaPct: number, invert = false) => {
    const isPositive = deltaPct > 0;
    const isNeutral = deltaPct === 0;
    const isGood = invert ? !isPositive : isPositive;

    const colorClass = isNeutral
      ? 'bg-gray-100 text-gray-700 border-gray-200'
      : isGood
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200';

    const icon = isNeutral ? 'remove' : isPositive ? 'arrow_upward' : 'arrow_downward';

    return (
      <span
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-mono-data font-bold border ${colorClass}`}
      >
        <span className="material-symbols-outlined text-xs">{icon}</span>
        <span>{Math.abs(deltaPct)}% vs prev</span>
      </span>
    );
  };

  // Format seconds to mm:ss
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  // Compute SVG chart coordinates
  const points = data.trafficOverTime;
  const maxVal = Math.max(
    1,
    ...points.map((p) => Math.max(p.visitors, p.sessions, p.pageViews, p.quoteSubmissions))
  );
  const chartHeight = 180;
  const chartWidth = 720;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  const buildPath = (key: 'visitors' | 'sessions' | 'pageViews' | 'quoteSubmissions') => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => {
        const x = i * stepX;
        const y = chartHeight - (p[key] / maxVal) * (chartHeight - 30) - 15;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-8 font-sans">
      {/* 1. Header & Filter Bar */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#041632] text-white font-mono-data text-xs px-2.5 py-0.5 rounded font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#ffdeac]">travel_explore</span>
                OpsVale Visitor Intelligence
              </span>
              <span className="text-[#75777e] text-xs font-mono-data">
                • Auto-refreshing (Updated {lastRefreshedSec}s ago)
              </span>
            </div>
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
              Website Traffic &amp; Acquisition Intelligence
            </h1>
            <p className="font-body text-xs text-[#44474d] mt-0.5">
              Privacy-aware telemetry measuring consented visitor journeys, geographic demand, calculator engagement, and conversion drop-offs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] rounded-lg font-mono-data text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-[#4f5e7e]">download</span>
              Export Data
            </button>
          </div>
        </div>

        {/* Global Date Presets & Filter Row */}
        <div className="pt-3 border-t border-[#e2e4ef] flex flex-wrap items-center justify-between gap-4 font-mono-data text-xs">
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: '7D', label: '7 Days' },
              { id: '30D', label: '30 Days' },
              { id: '90D', label: '90 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'LAST_MONTH', label: 'Last Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleRangeChange(p.id as DateRangePreset)}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors cursor-pointer ${
                  selectedRange === p.id
                    ? 'bg-[#041632] text-white shadow-xs'
                    : 'bg-[#f8f9ff] text-[#4f5e7e] hover:bg-[#e2e4ef] hover:text-[#041632]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Multi-Dimensional Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Country */}
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="bg-[#f8f9ff] border border-[#c5c6ce] text-[#041632] px-2.5 py-1.5 rounded-md font-bold text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Countries</option>
              {data.countries.map((c) => (
                <option key={c.countryCode} value={c.countryCode}>
                  {c.countryName} ({c.countryCode})
                </option>
              ))}
            </select>

            {/* Locale */}
            <select
              value={selectedLocale}
              onChange={(e) => handleLocaleChange(e.target.value)}
              className="bg-[#f8f9ff] border border-[#c5c6ce] text-[#041632] px-2.5 py-1.5 rounded-md font-bold text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Languages</option>
              <option value="en">English (EN)</option>
              <option value="de">German (DE)</option>
              <option value="fr">French (FR)</option>
              <option value="it">Italian (IT)</option>
              <option value="es">Spanish (ES)</option>
            </select>

            {/* Source */}
            <select
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="bg-[#f8f9ff] border border-[#c5c6ce] text-[#041632] px-2.5 py-1.5 rounded-md font-bold text-xs outline-none cursor-pointer"
            >
              <option value="ALL">All Acquisition Channels</option>
              <option value="DIRECT">Direct Navigation</option>
              <option value="ORGANIC_SEARCH">Organic Search (SEO)</option>
              <option value="REFERRAL">Referral Traffic</option>
              <option value="SOCIAL">Social Networks</option>
              <option value="PAID">Paid Campaigns (PPC)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Website Health & Conversion Alerts Section */}
      {data.alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.alerts.map((alert) => {
            const isOpp = alert.type === 'OPPORTUNITY';
            const isWarn = alert.type === 'WARNING' || alert.type === 'ANOMALY';
            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border font-mono-data text-xs flex items-start gap-3 shadow-2xs ${
                  isOpp
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : isWarn
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : 'bg-[#eff4ff] border-blue-200 text-blue-950'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-lg mt-0.5 ${
                    isOpp ? 'text-emerald-600' : isWarn ? 'text-amber-600' : 'text-blue-600'
                  }`}
                >
                  {isOpp ? 'trending_up' : isWarn ? 'warning' : 'insights'}
                </span>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">{alert.title}</h4>
                  <p className="text-[11px] font-body leading-relaxed opacity-90">{alert.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Visitors */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-2xs space-y-2 font-mono-data">
          <div className="flex items-center justify-between text-[#75777e] text-xs font-bold">
            <span className="flex items-center gap-1.5" title="Visitors who consented to analytics under GDPR">
              <span className="material-symbols-outlined text-base text-[#e77114]">group</span>
              Consent Unique Visitors
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-[#041632]">
              {data.summary.consentedUniqueVisitors.toLocaleString()}
            </span>
            {renderDeltaBadge(data.summary.deltas.visitorsDeltaPct)}
          </div>
          <span className="text-[10px] text-[#75777e] block">
            {data.summary.consentedSessions.toLocaleString()} total consented sessions
          </span>
        </div>

        {/* Page Views */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-2xs space-y-2 font-mono-data">
          <div className="flex items-center justify-between text-[#75777e] text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#041632]">visibility</span>
              Page Views &amp; Depth
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-[#041632]">
              {data.summary.consentedPageViews.toLocaleString()}
            </span>
            {renderDeltaBadge(data.summary.deltas.pageViewsDeltaPct)}
          </div>
          <span className="text-[10px] text-[#75777e] block">
            Avg. {data.summary.pagesPerSession} pages per visit
          </span>
        </div>

        {/* Engagement Duration */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-2xs space-y-2 font-mono-data">
          <div className="flex items-center justify-between text-[#75777e] text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-emerald-600">timer</span>
              Avg. Session Duration
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-[#041632]">
              {formatDuration(data.summary.avgSessionDurationSec)}
            </span>
            {renderDeltaBadge(data.summary.deltas.avgDurationDeltaPct)}
          </div>
          <span className="text-[10px] text-[#75777e] block">
            Bounce Rate: {data.summary.bounceRatePct}%
          </span>
        </div>

        {/* Commercial Conversion */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-5 shadow-2xs space-y-2 font-mono-data">
          <div className="flex items-center justify-between text-[#75777e] text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-[#e77114]">request_quote</span>
              Quote Conversion
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-[#e77114]">
              {data.summary.visitorToQuoteConversionRatePct}%
            </span>
            {renderDeltaBadge(data.summary.deltas.quoteConversionDeltaPct)}
          </div>
          <span className="text-[10px] text-[#75777e] block">
            {data.summary.quoteSubmissionsCount} quote requests submitted
          </span>
        </div>
      </div>

      {/* 4. Traffic Over Time Visualizer (SVG Chart) */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#041632]">
              Traffic Dynamics &amp; Acquisition Velocity
            </h3>
            <p className="font-body text-xs text-[#44474d]">
              Trend curve of consented unique visitors, sessions, and quote generation over the selected timeframe.
            </p>
          </div>

          {/* Metric Toggles */}
          <div className="flex items-center gap-2 font-mono-data text-xs">
            {[
              { id: 'all', label: 'All Metrics' },
              { id: 'visitors', label: 'Visitors' },
              { id: 'sessions', label: 'Sessions' },
              { id: 'quotes', label: 'Quote Inquiries' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveChartMetric(t.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeChartMetric === t.id
                    ? 'bg-[#041632] text-white shadow-xs'
                    : 'bg-[#f8f9ff] text-[#4f5e7e] hover:bg-[#e2e4ef]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Chart Render */}
        <div className="relative pt-4 overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-52 stroke-linecap-round">
            {/* Grid lines */}
            <line x1="0" y1={chartHeight - 15} x2={chartWidth} y2={chartHeight - 15} stroke="#e2e4ef" strokeWidth="1" />
            <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#f0f2f8" strokeWidth="1" />
            <line x1="0" y1="15" x2={chartWidth} y2="15" stroke="#f0f2f8" strokeWidth="1" />

            {/* Visitors Line (Navy) */}
            {(activeChartMetric === 'all' || activeChartMetric === 'visitors') && (
              <path
                d={buildPath('visitors')}
                fill="none"
                stroke="#041632"
                strokeWidth="2.5"
                className="transition-all duration-300"
              />
            )}

            {/* Sessions Line (Blue) */}
            {(activeChartMetric === 'all' || activeChartMetric === 'sessions') && (
              <path
                d={buildPath('sessions')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 2"
                className="transition-all duration-300"
              />
            )}

            {/* Quote Inquiries Line (Orange) */}
            {(activeChartMetric === 'all' || activeChartMetric === 'quotes') && (
              <path
                d={buildPath('quoteSubmissions')}
                fill="none"
                stroke="#e77114"
                strokeWidth="3"
                className="transition-all duration-300"
              />
            )}
          </svg>

          {/* Time Labels */}
          <div className="flex justify-between items-center text-[10px] text-[#75777e] font-mono-data pt-2">
            <span>{points[0]?.dateLabel || 'Start'}</span>
            <span>{points[Math.floor(points.length / 2)]?.dateLabel || 'Mid'}</span>
            <span>{points[points.length - 1]?.dateLabel || 'End'}</span>
          </div>

          {/* Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 font-mono-data text-xs">
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-1 bg-[#041632] rounded-full inline-block" />
              <span>Unique Visitors</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-1 bg-[#3b82f6] rounded-full inline-block" />
              <span>Consented Sessions</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-1 bg-[#e77114] rounded-full inline-block" />
              <span>Quote Inquiries Submitted</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Geographic Breakdown & Dual-Stage Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Country Breakdown Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Geographic Market Distribution
              </h3>
              <p className="font-body text-xs text-[#44474d]">
                Visitor origin by ISO territory and commercial conversion yield.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Country</th>
                  <th className="py-2.5 px-3 text-right">Visitors</th>
                  <th className="py-2.5 px-3 text-right">Sessions</th>
                  <th className="py-2.5 px-3 text-right">Quotes</th>
                  <th className="py-2.5 px-3 text-right">Conv. %</th>
                  <th className="py-2.5 px-3 text-right">Avg. Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e4ef]">
                {data.countries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#75777e]">
                      No geographic traffic recorded in this timeframe.
                    </td>
                  </tr>
                ) : (
                  data.countries.map((c) => (
                    <tr key={c.countryCode} className="hover:bg-[#f8f9ff]">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#041632] text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                            {c.countryCode}
                          </span>
                          <strong className="text-[#041632]">{c.countryName}</strong>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#041632] font-bold">
                        {c.visitors.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#4f5e7e]">{c.sessions}</td>
                      <td className="py-2.5 px-3 text-right text-[#e77114] font-bold">
                        {c.quoteRequests}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-bold ${
                            c.conversionRatePct > 5 ? 'text-emerald-700' : 'text-[#041632]'
                          }`}
                        >
                          {c.conversionRatePct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#75777e]">
                        {formatDuration(c.avgDurationSec)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dual-Stage Conversion Funnel (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-5">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#041632]">
              Dual-Stage Conversion Funnel
            </h3>
            <p className="font-body text-xs text-[#44474d]">
              Website acquisition telemetry mapped through to CRM commercial won contracts.
            </p>
          </div>

          {/* Acquisition Stages */}
          <div className="space-y-3 font-mono-data text-xs">
            <span className="text-[#735a31] text-[11px] font-bold uppercase tracking-wider block">
              1. Website Acquisition Funnel
            </span>
            {data.funnel.acquisitionFunnel.map((stage, idx) => (
              <div key={stage.stage} className="bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg p-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-[#041632]">
                    {idx + 1}. {stage.stage}
                  </span>
                  <strong className="text-sm text-[#041632]">{stage.count.toLocaleString()}</strong>
                </div>
                <div className="w-full bg-[#e2e4ef] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#041632] h-full rounded-full"
                    style={{ width: `${Math.max(4, stage.conversionFromTopPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#75777e]">
                  <span>{stage.description}</span>
                  <span>{stage.conversionFromTopPct}% of total</span>
                </div>
              </div>
            ))}
          </div>

          {/* Commercial Pipeline Stages */}
          <div className="space-y-3 font-mono-data text-xs pt-2 border-t border-[#e2e4ef]">
            <span className="text-[#735a31] text-[11px] font-bold uppercase tracking-wider block">
              2. Commercial Pipeline (CRM)
            </span>
            <div className="grid grid-cols-2 gap-3">
              {data.funnel.crmPipeline.map((p) => (
                <div key={p.stage} className="bg-white border border-[#c5c6ce] rounded-lg p-3 space-y-1">
                  <span className="text-[10px] text-[#75777e] block">{p.stage}</span>
                  <span className="text-lg font-bold text-[#e77114]">{p.count}</span>
                  <span className="text-[10px] text-[#4f5e7e] block">
                    {p.conversionFromTopPct}% yield
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Top Pages, Landing Pages & Exit Drop-offs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Visited Pages */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-headline text-base font-bold text-[#041632]">
                Top Visited Pages &amp; Engagement
              </h3>
              <p className="font-body text-xs text-[#44474d]">
                Most viewed routes and exit percentages.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Canonical Path</th>
                  <th className="py-2.5 px-3 text-right">Views</th>
                  <th className="py-2.5 px-3 text-right">Unique</th>
                  <th className="py-2.5 px-3 text-right">Exit Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e4ef]">
                {data.topPages.slice(0, 7).map((p) => (
                  <tr key={p.canonicalPath} className="hover:bg-[#f8f9ff]">
                    <td className="py-2.5 px-3">
                      <strong className="text-[#041632]">{p.canonicalPath}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#041632]">{p.pageViews}</td>
                    <td className="py-2.5 px-3 text-right text-[#4f5e7e]">{p.uniqueVisitors}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-bold ${
                          p.exitRatePct > 50 ? 'text-red-700' : 'text-[#041632]'
                        }`}
                      >
                        {p.exitRatePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Landing & Exit Drop-offs */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Landing Entries &amp; Exit Drop-offs
            </h3>
            <p className="font-body text-xs text-[#44474d]">
              Key entrance paths and pages with high drop-off exit rates.
            </p>
          </div>

          <div className="space-y-4 font-mono-data text-xs">
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[#735a31] uppercase">Top Entry Pages</span>
              {data.landingPages.slice(0, 3).map((l) => (
                <div
                  key={l.landingPath}
                  className="flex items-center justify-between p-2.5 bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg"
                >
                  <div>
                    <strong className="text-[#041632] block">{l.landingPath}</strong>
                    <span className="text-[10px] text-[#75777e]">
                      {l.sessions} visits • Bounce Rate: {l.bounceRatePct}%
                    </span>
                  </div>
                  <span className="text-emerald-700 font-bold">{l.conversionRatePct}% quote yield</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-[#e2e4ef]">
              <span className="text-[11px] font-bold text-red-800 uppercase">High Drop-off Exit Pages</span>
              {data.exitPages.slice(0, 3).map((ex) => (
                <div
                  key={ex.exitPath}
                  className="flex items-center justify-between p-2.5 bg-red-50/50 border border-red-200 rounded-lg"
                >
                  <div>
                    <strong className="text-[#041632] block">{ex.exitPath}</strong>
                    <span className="text-[10px] text-[#75777e]">
                      {ex.exits} exits out of {ex.totalViews} views
                    </span>
                  </div>
                  <span className="text-red-700 font-bold">{ex.exitRatePct}% exit rate</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Savings Calculator Telemetry & CTA Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Savings Calculator Card (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4 font-mono-data">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-1.5 text-[#e77114] mb-1">
                <span className="material-symbols-outlined text-base">calculate</span>
                <span className="text-xs font-bold uppercase">Commercial Feature Telemetry</span>
              </div>
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Savings Calculator Telemetry
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-[#f8f9ff] border border-[#c5c6ce] p-3 rounded-lg text-center">
              <span className="text-[10px] text-[#75777e] block">Views</span>
              <strong className="text-lg text-[#041632] block">
                {data.calculatorTelemetry.totalCalculatorViews}
              </strong>
            </div>
            <div className="bg-[#f8f9ff] border border-[#c5c6ce] p-3 rounded-lg text-center">
              <span className="text-[10px] text-[#75777e] block">Calculations</span>
              <strong className="text-lg text-[#041632] block">
                {data.calculatorTelemetry.totalCalculationsRun}
              </strong>
            </div>
            <div className="bg-[#f8f9ff] border border-[#c5c6ce] p-3 rounded-lg text-center">
              <span className="text-[10px] text-[#75777e] block">Completed</span>
              <strong className="text-lg text-emerald-700 block">
                {data.calculatorTelemetry.calculatorCompletionRatePct}%
              </strong>
            </div>
            <div className="bg-[#f8f9ff] border border-[#c5c6ce] p-3 rounded-lg text-center">
              <span className="text-[10px] text-[#75777e] block">Quote Handoffs</span>
              <strong className="text-lg text-[#e77114] block">
                {data.calculatorTelemetry.quoteHandoffsClicked}
              </strong>
            </div>
          </div>

          {/* Popular Pizza Box Sizes in Calculator */}
          {data.calculatorTelemetry.topBoxSizesCalculated.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-[#735a31] block mb-2">
                Most Evaluated Box Configurations
              </span>
              <div className="flex flex-wrap gap-2">
                {data.calculatorTelemetry.topBoxSizesCalculated.map((b) => (
                  <span
                    key={b.size}
                    className="bg-[#f8f9ff] border border-[#c5c6ce] px-3 py-1.5 rounded-lg text-xs font-bold text-[#041632]"
                  >
                    {b.size} <strong className="text-[#e77114]">({b.percentage}%)</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Performance Matrix (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4 font-mono-data">
          <div>
            <h3 className="font-headline text-base font-bold text-[#041632]">
              Call-to-Action (CTA) Engagement
            </h3>
            <p className="font-body text-xs text-[#44474d]">
              Click-through tracking on primary conversion triggers.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {data.ctaPerformance.length === 0 ? (
              <p className="text-[#75777e] text-center py-6">No CTA click events recorded in this window.</p>
            ) : (
              data.ctaPerformance.map((cta) => (
                <div
                  key={`${cta.ctaName}_${cta.location}`}
                  className="flex items-center justify-between p-3 bg-[#f8f9ff] border border-[#c5c6ce] rounded-lg"
                >
                  <div>
                    <strong className="text-[#041632] block">{cta.ctaName}</strong>
                    <span className="text-[10px] text-[#75777e]">Location: {cta.location}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#e77114] block">{cta.clicks} clicks</span>
                    <span className="text-[10px] text-[#4f5e7e]">{cta.shareOfTotalClicksPct}% share</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 8. Acquisition Channels & UTM Campaigns */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="font-headline text-lg font-bold text-[#041632]">
            Acquisition Channels &amp; UTM Campaign Performance
          </h3>
          <p className="font-body text-xs text-[#44474d]">
            Inbound traffic attribution and campaign conversion yields.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-data text-xs">
            <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Traffic Source</th>
                <th className="py-2.5 px-3">Campaign Tag</th>
                <th className="py-2.5 px-3 text-right">Sessions</th>
                <th className="py-2.5 px-3 text-right">Unique Visitors</th>
                <th className="py-2.5 px-3 text-right">Quote Submissions</th>
                <th className="py-2.5 px-3 text-right">Conversion Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e4ef]">
              {data.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#75777e]">
                    No campaign sources recorded yet.
                  </td>
                </tr>
              ) : (
                data.campaigns.map((camp) => (
                  <tr key={`${camp.source}_${camp.campaign}`} className="hover:bg-[#f8f9ff]">
                    <td className="py-2.5 px-3">
                      <strong className="text-[#041632]">{camp.source}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-[#4f5e7e]">
                      {camp.campaign ? (
                        <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          {camp.campaign}
                        </span>
                      ) : (
                        <span className="text-[#75777e]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#041632]">{camp.sessions}</td>
                    <td className="py-2.5 px-3 text-right text-[#4f5e7e]">{camp.uniqueVisitors}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#e77114]">
                      {camp.quoteSubmissions}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {camp.conversionRatePct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Privacy-Safe Session Stream Inspector */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="font-headline text-lg font-bold text-[#041632]">
            Live Consented Session Activity Stream
          </h3>
          <p className="font-body text-xs text-[#44474d]">
            Recent anonymized visitor navigation sequences and conversion outcomes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-data text-xs">
            <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Session Token</th>
                <th className="py-2.5 px-3">Territory</th>
                <th className="py-2.5 px-3">Device</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Navigation Journey</th>
                <th className="py-2.5 px-3 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e4ef]">
              {data.recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#75777e]">
                    No active sessions recorded yet.
                  </td>
                </tr>
              ) : (
                data.recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#f8f9ff]">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-[#041632]">{s.sessionToken.slice(0, 12)}...</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="bg-[#041632] text-white text-[9px] px-1.5 py-0.5 rounded font-bold mr-1">
                        {s.countryCode || 'INT'}
                      </span>
                      <span>{s.countryName || 'International'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[#4f5e7e] capitalize">{s.deviceType.toLowerCase()}</td>
                    <td className="py-2.5 px-3 text-[#75777e]">{formatDuration(s.durationSec)}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 max-w-md overflow-x-auto text-[11px]">
                        {s.journey.map((step, idx) => (
                          <React.Fragment key={idx}>
                            <span className="bg-[#eff4ff] text-[#041632] px-2 py-0.5 rounded border border-[#c5c6ce]/60 whitespace-nowrap">
                              {step}
                            </span>
                            {idx < s.journey.length - 1 && <span className="text-[#c5c6ce]">&rarr;</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {s.outcome === 'QUOTE_SUBMITTED' && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          QUOTE SUBMITTED
                        </span>
                      )}
                      {s.outcome === 'CALCULATED' && (
                        <span className="bg-orange-100 text-[#e77114] border border-orange-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          CALCULATED
                        </span>
                      )}
                      {s.outcome === 'BROWSED' && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
                          ENGAGED
                        </span>
                      )}
                      {s.outcome === 'BOUNCED' && (
                        <span className="bg-gray-100 text-gray-700 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-bold">
                          BOUNCED
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 10. Data Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] space-y-4 font-mono-data text-xs">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-3">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Export Visitor Analytics</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-[#75777e] hover:text-[#041632] cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-[#44474d] font-body">
              Download structured telemetry reports for the currently selected timeframe (<strong>{selectedRange}</strong>).
            </p>

            <div className="space-y-2 pt-2">
              <a
                href={`/api/admin/analytics/export?range=${selectedRange}&section=countries&format=csv`}
                className="w-full flex items-center justify-between p-3 border border-[#c5c6ce] hover:bg-[#f8f9ff] rounded-lg cursor-pointer"
              >
                <strong>Geographic Market Breakdown (CSV)</strong>
                <span className="material-symbols-outlined text-base">download</span>
              </a>

              <a
                href={`/api/admin/analytics/export?range=${selectedRange}&section=pages&format=csv`}
                className="w-full flex items-center justify-between p-3 border border-[#c5c6ce] hover:bg-[#f8f9ff] rounded-lg cursor-pointer"
              >
                <strong>Top Pages &amp; Exit Rates (CSV)</strong>
                <span className="material-symbols-outlined text-base">download</span>
              </a>

              <a
                href={`/api/admin/analytics/export?range=${selectedRange}&section=campaigns&format=csv`}
                className="w-full flex items-center justify-between p-3 border border-[#c5c6ce] hover:bg-[#f8f9ff] rounded-lg cursor-pointer"
              >
                <strong>Acquisition Channels &amp; UTMs (CSV)</strong>
                <span className="material-symbols-outlined text-base">download</span>
              </a>

              <a
                href={`/api/admin/analytics/export?range=${selectedRange}&format=json`}
                className="w-full flex items-center justify-between p-3 border border-[#c5c6ce] hover:bg-[#f8f9ff] rounded-lg cursor-pointer"
              >
                <strong>Complete Analytics Snapshot (JSON)</strong>
                <span className="material-symbols-outlined text-base">data_object</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
