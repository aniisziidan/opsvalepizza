'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardStats } from '@/lib/admin/queries';
import { LEAD_STATUS_LABEL, LEAD_STATUS_STYLE, LeadStatus } from '@/lib/types';
import { timeAgo, formatNumber } from '@/lib/admin/formatters';

interface OpsDashboardProps {
  stats: DashboardStats;
}

export const OpsDashboard: React.FC<OpsDashboardProps> = ({ stats }) => {
  const { totalLeads, byStatus, recentActivities } = stats;

  const newCount = byStatus.NEW || 0;
  const reviewingCount = byStatus.REVIEWING || 0;
  const quotesPreparedCount = byStatus.QUOTE_PREPARED || 0;
  const quotesSentCount = byStatus.QUOTE_SENT || 0;
  const negotiatingCount = byStatus.NEGOTIATING || 0;
  const wonCount = byStatus.WON || 0;
  const lostCount = byStatus.LOST || 0;
  const needInfoCount = byStatus.NEED_MORE_INFO || 0;

  const winRate =
    totalLeads > 0 ? ((wonCount / totalLeads) * 100).toFixed(1) : '0.0';

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

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-8 bg-[#f8f9ff]">
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
            Real-time pipeline overview, inbound lead volume, and procurement activity log.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
            View All Leads ({formatNumber(totalLeads)})
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
              <h4 className="font-body text-sm font-bold text-[#041632]">
                {newCount} New Inbound Leads
              </h4>
              <p className="font-mono-data text-xs text-[#75777e]">
                Pending initial qualification
              </p>
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
              <h4 className="font-body text-sm font-bold text-[#041632]">
                {reviewingCount + needInfoCount} Leads In Review
              </h4>
              <p className="font-mono-data text-xs text-[#75777e]">
                Specs validation &amp; pricing review
              </p>
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
              <h4 className="font-body text-sm font-bold text-[#041632]">
                {quotesSentCount + negotiatingCount} Active Quotes
              </h4>
              <p className="font-mono-data text-xs text-[#75777e]">
                In client review or negotiation
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#75777e]">chevron_right</span>
        </Link>
      </div>

      {/* 5 Bento KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
            Total Leads
          </span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            {formatNumber(totalLeads)}
          </div>
          <div className="text-[11px] text-[#75777e] font-mono-data mt-2">
            All registered accounts
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
            New Leads
          </span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            {formatNumber(newCount)}
          </div>
          <div className="text-[11px] text-[#735a31] font-mono-data mt-2">
            Awaiting triage
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
            Quotes Prepared/Sent
          </span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            {formatNumber(quotesPreparedCount + quotesSentCount)}
          </div>
          <div className="text-[11px] text-[#041632] font-mono-data mt-2">
            Formal offers issued
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
            Closed Won
          </span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-emerald-700">
            {formatNumber(wonCount)}
          </div>
          <div className="text-[11px] text-emerald-600 font-mono-data mt-2">
            Supply contracts secured
          </div>
        </div>

        <div className="bg-white border border-[#c5c6ce] p-5 rounded-xl shadow-sm col-span-2 lg:col-span-1">
          <span className="font-mono-data text-xs text-[#75777e] uppercase block mb-1 font-semibold">
            Win Rate
          </span>
          <div className="font-headline text-2xl sm:text-3xl font-bold text-[#e77114]">
            {winRate}%
          </div>
          <div className="text-[11px] text-[#75777e] font-mono-data mt-2">
            {wonCount} won / {totalLeads} total
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Full Pipeline Breakdown */}
        <div className="lg:col-span-7 space-y-8">
          {/* Complete 8-Status Pipeline Grid */}
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-headline text-lg font-bold text-[#041632]">
                  Pipeline Distribution (All 8 Statuses)
                </h3>
                <p className="font-mono-data text-xs text-[#75777e]">
                  Active lead stages across the full procurement lifecycle
                </p>
              </div>
              <span className="material-symbols-outlined text-[#75777e]">stacked_bar_chart</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allStatuses.map((status) => {
                const count = byStatus[status] || 0;
                const percentage =
                  totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(0) : '0';

                return (
                  <div
                    key={status}
                    className="p-3 bg-[#f8f9ff] border border-[#c5c6ce]/70 rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono-data text-[10px] uppercase font-bold text-[#75777e] block truncate">
                        {LEAD_STATUS_LABEL[status]}
                      </span>
                      <span className="font-headline text-xl font-bold text-[#041632] block my-1">
                        {count}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#c5c6ce]/40 font-mono-data text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${LEAD_STATUS_STYLE[status]}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                Recent Lead Activity
              </h3>
              <Link
                href="/admin/leads"
                className="font-mono-data text-xs text-[#e77114] hover:underline font-semibold cursor-pointer"
              >
                View all leads
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-[#75777e] font-mono-data text-xs bg-[#f8f9ff] rounded-lg border border-dashed border-[#c5c6ce]">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[#c5c6ce]/60 font-body text-xs">
                {recentActivities.map((act) => (
                  <div key={act.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#e77114] flex-shrink-0"></span>
                        <strong className="text-[#041632]">
                          {act.authorName || 'System'}
                        </strong>
                        <Link
                          href={`/admin/leads/${act.leadId}`}
                          className="font-mono-data text-[#041632] hover:text-[#e77114] font-bold"
                        >
                          {act.leadCode}
                        </Link>
                        <span className="text-[#75777e] truncate max-w-[120px]">
                          ({act.companyName})
                        </span>
                      </div>
                      <span className="font-mono-data text-[11px] text-[#75777e] whitespace-nowrap">
                        {timeAgo(act.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#44474d] bg-[#f8f9ff] p-2 rounded border border-[#c5c6ce]/40 font-mono-data text-[11px]">
                      {act.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
