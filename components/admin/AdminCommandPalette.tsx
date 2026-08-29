'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'NAVIGATION' | 'LEADS' | 'QUOTES' | 'ACTIONS';
  icon: string;
  href: string;
  badge?: string;
  badgeColor?: string;
}

const STATIC_NAV_ITEMS: SearchResultItem[] = [
  { id: 'nav-dash', title: 'Operations Dashboard', subtitle: 'Pipeline metrics & KPI overview', category: 'NAVIGATION', icon: 'dashboard', href: '/admin/dashboard' },
  { id: 'nav-leads', title: 'Leads & Accounts', subtitle: 'View inbound B2B quote inquiries', category: 'NAVIGATION', icon: 'group', href: '/admin/leads' },
  { id: 'nav-quotes', title: 'Commercial Quotes', subtitle: 'Manage active proposals & revisions', category: 'NAVIGATION', icon: 'request_quote', href: '/admin/quotes' },
  { id: 'nav-pricing', title: 'Pricing Engine & Matrix', subtitle: 'Landed cost tiers & markup rules', category: 'NAVIGATION', icon: 'monetization_on', href: '/admin/pricing' },
  { id: 'nav-logistics', title: 'European Logistics Hubs', subtitle: 'Freight corridors & hub rates', category: 'NAVIGATION', icon: 'local_shipping', href: '/admin/logistics' },
  { id: 'nav-visitors', title: 'Visitor Intelligence', subtitle: 'Privacy-aware session analytics', category: 'NAVIGATION', icon: 'travel_explore', href: '/admin/visitors' },
  { id: 'nav-analytics', title: 'Sales Analytics & KPIs', subtitle: 'Conversion funnels & velocity', category: 'NAVIGATION', icon: 'monitoring', href: '/admin/analytics' },
  { id: 'nav-notifications', title: 'Notification Center', subtitle: 'Customer activity feed & alerts', category: 'NAVIGATION', icon: 'notifications', href: '/admin/notifications' },
  { id: 'nav-settings', title: 'Platform Governance & Access', subtitle: 'Operator accounts & system security', category: 'NAVIGATION', icon: 'settings', href: '/admin/settings' },
];

const STATIC_ACTIONS: SearchResultItem[] = [
  { id: 'act-site', title: 'Open Public Customer Storefront', subtitle: 'View live customer-facing homepage', category: 'ACTIONS', icon: 'storefront', href: '/en' },
  { id: 'act-calc', title: 'Open Public Savings Calculator', subtitle: 'Test live pricing formula simulator', category: 'ACTIONS', icon: 'calculate', href: '/en/calculator' },
  { id: 'act-excel', title: 'Export Pricing Matrix (.xlsx)', subtitle: 'Download latest bulk spreadsheet', category: 'ACTIONS', icon: 'table_view', href: '/api/admin/pricing/excel/export' },
  { id: 'act-analytics-export', title: 'Export Commercial Telemetry (.csv)', subtitle: 'Download pipeline conversion report', category: 'ACTIONS', icon: 'download', href: '/api/admin/analytics/export?format=csv' },
];

export const AdminCommandPalette: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dynamicResults, setDynamicResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global hotkey handler (Ctrl+K, Cmd+K, /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setDynamicResults([]);
    }
  }, [isOpen]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setDynamicResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const items: SearchResultItem[] = [];

          if (data.leads && Array.isArray(data.leads)) {
            data.leads.forEach((l: any) => {
              items.push({
                id: `lead-${l.id}`,
                title: `${l.leadCode} — ${l.companyName}`,
                subtitle: `${l.contactName} (${l.contactEmail || 'No email'}) • ${l.countryCode || 'EU'}`,
                category: 'LEADS',
                icon: 'corporate_fare',
                href: l.href,
                badge: l.status,
                badgeColor: l.status === 'WON' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800',
              });
            });
          }

          if (data.quotes && Array.isArray(data.quotes)) {
            data.quotes.forEach((q: any) => {
              items.push({
                id: `quote-${q.id}`,
                title: `Quote Rev ${q.revision} — ${q.companyName}`,
                subtitle: `Ref: ${q.leadCode} • €${q.unitPriceEur?.toFixed(4)}/pc`,
                category: 'QUOTES',
                icon: 'request_quote',
                href: q.href,
                badge: q.status,
                badgeColor: q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800',
              });
            });
          }

          setDynamicResults(items);
          setSelectedIndex(0);
        }
      } catch {
        // graceful failure
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter static items by query
  const filteredNav = query.trim()
    ? STATIC_NAV_ITEMS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : STATIC_NAV_ITEMS;

  const filteredActions = query.trim()
    ? STATIC_ACTIONS.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : STATIC_ACTIONS;

  // Flattened all available items
  const allItems = [...dynamicResults, ...filteredNav, ...filteredActions];

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      setIsOpen(false);
      if (item.href.startsWith('/api/')) {
        window.open(item.href, '_blank');
      } else {
        router.push(item.href);
      }
    },
    [router]
  );

  // Keyboard navigation within list
  const handleKeyDownInMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex]);
      }
    }
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Top Header Quick Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f8f9ff] border border-[#c5c6ce] hover:border-[#041632] text-[#4f5e7e] hover:text-[#041632] font-mono-data text-xs transition-colors cursor-pointer"
        title="Open Command Palette (Ctrl+K / Cmd+K)"
        aria-label="Open Command Palette"
      >
        <span className="material-symbols-outlined text-base">search</span>
        <span className="text-xs">Quick Search...</span>
        <kbd className="bg-white border border-[#c5c6ce] text-[#041632] px-1.5 py-0.5 rounded text-[10px] font-bold shadow-2xs">
          Ctrl+K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-[#c5c6ce] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-100"
            onKeyDown={handleKeyDownInMenu}
          >
            {/* Search Input Bar */}
            <div className="p-4 border-b border-[#e2e4ef] flex items-center gap-3 bg-[#f8f9ff]">
              <span className="material-symbols-outlined text-2xl text-[#041632]">search</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads, quote codes, companies, or commands..."
                className="w-full bg-transparent font-body text-base text-[#041632] outline-none placeholder:text-[#8393b5]"
              />
              {isLoading && (
                <span className="material-symbols-outlined text-lg text-[#e77114] animate-spin">
                  sync
                </span>
              )}
              <kbd className="bg-white border border-[#c5c6ce] text-[#75777e] px-1.5 py-0.5 rounded text-[10px] font-mono-data font-semibold">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-4 font-mono-data text-xs">
              {/* Dynamic Leads & Quotes Group */}
              {dynamicResults.length > 0 && (
                <div>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e77114] block">
                    Matching Inquiries &amp; Proposals
                  </span>
                  <div className="mt-1 space-y-1">
                    {dynamicResults.map((item, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={item.id}
                          data-index={idx}
                          onClick={() => handleSelect(item)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#041632] text-white' : 'hover:bg-[#eff4ff] text-[#041632]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`material-symbols-outlined text-xl ${
                                isSelected ? 'text-[#e77114]' : 'text-[#4f5e7e]'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-xs truncate">{item.title}</p>
                              {item.subtitle && (
                                <p
                                  className={`text-[11px] truncate ${
                                    isSelected ? 'text-[#cbd5e1]' : 'text-[#75777e]'
                                  }`}
                                >
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex-shrink-0 ${
                                isSelected ? 'bg-white/20 text-white' : item.badgeColor || 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Shortcuts Group */}
              {filteredNav.length > 0 && (
                <div>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#75777e] block">
                    Navigation Shortcuts
                  </span>
                  <div className="mt-1 space-y-1">
                    {filteredNav.map((item, idx) => {
                      const globalIdx = dynamicResults.length + idx;
                      const isSelected = selectedIndex === globalIdx;
                      return (
                        <div
                          key={item.id}
                          data-index={globalIdx}
                          onClick={() => handleSelect(item)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#041632] text-white' : 'hover:bg-[#eff4ff] text-[#041632]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`material-symbols-outlined text-lg ${
                                isSelected ? 'text-[#e77114]' : 'text-[#4f5e7e]'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-xs truncate">{item.title}</p>
                              {item.subtitle && (
                                <p
                                  className={`text-[10px] truncate ${
                                    isSelected ? 'text-[#cbd5e1]' : 'text-[#75777e]'
                                  }`}
                                >
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`material-symbols-outlined text-sm ${
                              isSelected ? 'text-white' : 'text-[#c5c6ce]'
                            }`}
                          >
                            arrow_forward
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Group */}
              {filteredActions.length > 0 && (
                <div>
                  <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#75777e] block">
                    Quick Actions
                  </span>
                  <div className="mt-1 space-y-1">
                    {filteredActions.map((item, idx) => {
                      const globalIdx = dynamicResults.length + filteredNav.length + idx;
                      const isSelected = selectedIndex === globalIdx;
                      return (
                        <div
                          key={item.id}
                          data-index={globalIdx}
                          onClick={() => handleSelect(item)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#041632] text-white' : 'hover:bg-[#eff4ff] text-[#041632]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`material-symbols-outlined text-lg ${
                                isSelected ? 'text-[#e77114]' : 'text-[#4f5e7e]'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <p className="font-bold text-xs truncate">{item.title}</p>
                              {item.subtitle && (
                                <p
                                  className={`text-[10px] truncate ${
                                    isSelected ? 'text-[#cbd5e1]' : 'text-[#75777e]'
                                  }`}
                                >
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`material-symbols-outlined text-sm ${
                              isSelected ? 'text-white' : 'text-[#c5c6ce]'
                            }`}
                          >
                            open_in_new
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {allItems.length === 0 && !isLoading && (
                <div className="text-center py-12 text-[#75777e]">
                  <span className="material-symbols-outlined text-3xl mb-2 text-[#c5c6ce]">
                    search_off
                  </span>
                  <p className="font-bold">No results found for &ldquo;{query}&rdquo;</p>
                  <p className="text-[11px] mt-1">Try searching by lead code (e.g. OPS-2026), company name, or contact.</p>
                </div>
              )}
            </div>

            {/* Footer Legend */}
            <div className="p-3 bg-[#eff4ff] border-t border-[#e2e4ef] flex items-center justify-between font-mono-data text-[10px] text-[#4f5e7e]">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="bg-white border border-[#c5c6ce] px-1 py-0.5 rounded font-bold">↑↓</kbd> to navigate
                </span>
                <span>
                  <kbd className="bg-white border border-[#c5c6ce] px-1 py-0.5 rounded font-bold">↵</kbd> to select
                </span>
                <span>
                  <kbd className="bg-white border border-[#c5c6ce] px-1 py-0.5 rounded font-bold">esc</kbd> to close
                </span>
              </div>
              <span className="font-semibold text-[#041632]">OpsVale Global Command</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
