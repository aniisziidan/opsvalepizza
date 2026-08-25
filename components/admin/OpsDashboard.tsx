import React from 'react';
import Link from 'next/link';
import { Lead, ActivityItem } from '@/lib/types';

interface OpsDashboardProps {
  leads: Lead[];
  activities: ActivityItem[];
}

export const OpsDashboard: React.FC<OpsDashboardProps> = ({
  leads,
  activities,
}) => {
  const newLeads = leads.filter((l) => l.status === 'New');
  const reviewingLeads = leads.filter((l) => l.status === 'Reviewing');
  const wonLeads = leads.filter((l) => l.status === 'Closed Won');

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-8 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2 bg-[#dce9ff] px-2.5 py-1 rounded text-[11px] font-mono-data text-[#041632] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Operations Stream
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Operations Dashboard
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Overview of pan-European lead generation, pipeline status, and procurement fulfillment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/pricing"
            className="bg-white border border-[#c5c6ce] text-[#041632] px-4 py-2 rounded-lg font-mono-data text-xs hover:bg-[#eff4ff] transition-colors flex items-center gap-2 cursor-pointer font-semibold shadow-sm"
          >
            <span className="material-symbols-outlined text-base">tune</span>
            Pricing Engine
          </Link>
          <Link
            href="/admin/leads"
            className="bg-[#041632] text-white px-5 py-2 rounded-lg font-mono-data text-xs uppercase tracking-wider hover:bg-[#1b2b48] transition-colors flex items-center gap-2 cursor-pointer font-bold shadow-md"
          >
            <span className="material-symbols-outlined text-base">group</span>
            View All Leads ({leads.length})
          </Link>
        </div>
      </div>

      {/* Action Notification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/admin/leads"
          className="bg-white border-l-4 border-l-[#e77114] border border-[#c5c6ce] p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ffdeac] text-[#e77114] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">add_circle</span>
            </div>
            <div>
              <h4 className="font-body text-sm font-bold text-[#041632]">{newLeads.length || 3} New Quote Requests</h4>
              <p className="font-mono-data text-xs text-[#75777e]">Pending procurement assignment</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#75777e]">chevron_right</span>
        </Link>

        <Link
          href="/admin/leads"
          className="bg-white border-l-4 border-l-[#1b2b48] border border-[#c5c6ce] p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dce9ff] text-[#041632] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">assignment_late</span>
            </div>
            <div>
              <h4 className="font-body text-sm font-bold text-[#041632]">{reviewingLeads.length || 5} Leads Require Review</h4>
              <p className="font-mono-data text-xs text-[#75777e]">Awaiting VAT &amp; delivery validation</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#75777e]">chevron_right</span>
        </Link>

        <Link
          href="/admin/quotes"
          className="bg-white border-l-4 border-l-[#735a31] border border-[#c5c6ce] p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#fddba7] text-[#735a31] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">mark_email_read</span>
            </div>
            <div>
              <h4 className="font-body text-sm font-bold text-[#041632]">2 Quotes Need Follow-up</h4>
              <p className="font-mono-data text-xs text-[#75777e]">Sent &gt; 48h ago without reply</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#75777e]">chevron_right</span>
        </Link>
      </div>

      {/* 5 Bento KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">Total Leads</span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">1,248</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-mono-data mt-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+12% vs last mo</span>
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">New Leads (30d)</span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">84</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-mono-data mt-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+5% vs last mo</span>
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">Quotes Sent</span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">312</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-mono-data mt-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+18% vs last mo</span>
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">Won Opps</span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">145</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-mono-data mt-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+8% vs last mo</span>
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm col-span-2 lg:col-span-1">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">Conv. Rate</span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#e77114]">46.4%</div>
          <div className="flex items-center gap-1 text-xs text-emerald-600 font-mono-data mt-2">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+2.1% SLA beat</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Regional Analytics & Pipeline */}
        <div className="lg:col-span-7 space-y-8">
          {/* Leads by Territory */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#041632]">Leads by European Territory</h3>
                <p className="font-mono-data text-xs text-[#75777e]">Geographic demand across 14 central delivery corridors</p>
              </div>
              <span className="material-symbols-outlined text-[#75777e]">public</span>
            </div>

            {/* Region Cluster Bars */}
            <div className="space-y-4 font-mono-data text-xs">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#041632]">Central Europe (DE, PL, CZ, AT)</span>
                  <span className="text-[#e77114] font-bold">42% (524 leads)</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-3 rounded-full overflow-hidden">
                  <div className="bg-[#041632] h-full rounded-full" style={{ width: '42%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#041632]">Southern Europe (IT, ES, PT, GR)</span>
                  <span className="text-[#e77114] font-bold">31% (386 leads)</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-3 rounded-full overflow-hidden">
                  <div className="bg-[#e77114] h-full rounded-full" style={{ width: '31%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#041632]">Western Europe (FR, BE, NL)</span>
                  <span className="text-[#e77114] font-bold">19% (237 leads)</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-3 rounded-full overflow-hidden">
                  <div className="bg-[#735a31] h-full rounded-full" style={{ width: '19%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-[#041632]">UK &amp; Nordics (UK, SE, DK, NO)</span>
                  <span className="text-[#e77114] font-bold">8% (101 leads)</span>
                </div>
                <div className="w-full bg-[#eff4ff] h-3 rounded-full overflow-hidden">
                  <div className="bg-[#8393b5] h-full rounded-full" style={{ width: '8%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Funnel */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-bold text-[#041632] mb-4">Pipeline Distribution</h3>
            <div className="grid grid-cols-5 gap-2 text-center font-mono-data text-xs">
              <div className="p-3 bg-[#eff4ff] border border-[#c5c6ce] rounded-lg">
                <span className="text-[#75777e] block text-[10px]">Inbound</span>
                <span className="font-bold text-base text-[#041632] block my-1">84</span>
                <span className="text-[10px] text-[#e77114]">27%</span>
              </div>
              <div className="p-3 bg-[#eff4ff] border border-[#c5c6ce] rounded-lg">
                <span className="text-[#75777e] block text-[10px]">Review</span>
                <span className="font-bold text-base text-[#041632] block my-1">56</span>
                <span className="text-[10px] text-[#e77114]">18%</span>
              </div>
              <div className="p-3 bg-[#eff4ff] border border-[#c5c6ce] rounded-lg">
                <span className="text-[#75777e] block text-[10px]">Quoted</span>
                <span className="font-bold text-base text-[#041632] block my-1">92</span>
                <span className="text-[10px] text-[#e77114]">29%</span>
              </div>
              <div className="p-3 bg-[#eff4ff] border border-[#c5c6ce] rounded-lg">
                <span className="text-[#75777e] block text-[10px]">Negotiating</span>
                <span className="font-bold text-base text-[#041632] block my-1">45</span>
                <span className="text-[10px] text-[#e77114]">14%</span>
              </div>
              <div className="p-3 bg-[#eff4ff] border border-[#c5c6ce] rounded-lg">
                <span className="text-[#75777e] block text-[10px]">Won</span>
                <span className="font-bold text-base text-emerald-600 block my-1">35</span>
                <span className="text-[10px] text-emerald-600">12%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed & Active Leads */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-lg font-bold text-[#041632]">Recent Activity</h3>
              <Link
                href="/admin/leads"
                className="font-mono-data text-xs text-[#e77114] hover:underline font-semibold cursor-pointer"
              >
                View all leads
              </Link>
            </div>

            <div className="divide-y divide-[#c5c6ce]/60 font-body text-xs">
              {activities.map((act) => (
                <div key={act.id} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#e77114] flex-shrink-0"></span>
                      <strong className="text-[#041632]">{act.author}</strong>
                      <span className="text-[#44474d]">{act.subject}</span>
                      <strong className="text-[#041632] font-semibold">{act.company}</strong>
                    </div>
                    <span className="font-mono-data text-[11px] text-[#75777e] whitespace-nowrap">{act.timeAgo}</span>
                  </div>

                  {act.tag && (
                    <span className="inline-block bg-[#dce9ff] text-[#041632] font-mono-data text-[10px] px-2 py-0.5 rounded mt-1 font-semibold">
                      {act.tag}
                    </span>
                  )}
                  {act.noteSnippet && (
                    <p className="text-[#75777e] italic mt-1 font-body text-[11px] bg-[#f8f9ff] p-2 rounded border border-[#c5c6ce]/40">
                      "{act.noteSnippet}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Lead Spotlight */}
          <div className="bg-[#1b2b48] text-white p-6 rounded-xl border border-[#4f5e7e] space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-mono-data text-xs text-[#e3c290] uppercase font-semibold">Lead in Spotlight</span>
              <span className="bg-[#e77114] text-white font-mono-data text-[10px] font-bold px-2 py-0.5 rounded">
                High Priority
              </span>
            </div>
            {leads[0] && (
              <div>
                <h4 className="font-headline text-xl font-bold text-white mb-1">{leads[0].companyName}</h4>
                <p className="font-mono-data text-xs text-[#8393b5] mb-4">
                  {leads[0].contactName} • {leads[0].location}
                </p>
                <div className="bg-[#213145] p-3 rounded border border-[#4f5e7e] font-mono-data text-xs space-y-1 mb-4">
                  <div className="flex justify-between">
                    <span className="text-[#8393b5]">Monthly Volume:</span>
                    <span className="font-bold text-white">{leads[0].calculatorData.monthlyVolume.toLocaleString()} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8393b5]">Est. Yearly Savings:</span>
                    <span className="font-bold text-[#e3c290]">€{leads[0].calculatorData.estimatedSavingsYearly.toLocaleString()}</span>
                  </div>
                </div>
                <Link
                  href={`/admin/leads/${leads[0].id}`}
                  className="block text-center w-full bg-[#ffdeac] text-[#281900] py-2.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#fddba7] transition-colors cursor-pointer"
                >
                  Open Lead Dossier ({leads[0].code})
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
