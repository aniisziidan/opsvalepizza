'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminToastContainer } from '@/components/admin/AdminToastContainer';

interface AdminChromeProps {
  children: React.ReactNode;
  newLeadsCount: number;
  draftQuotesCount?: number;
  userName?: string;
  userEmail?: string;
  signOutAction: () => Promise<void>;
}

export const AdminChrome: React.FC<AdminChromeProps> = ({
  children,
  newLeadsCount,
  draftQuotesCount = 0,
  userName = 'Admin',
  userEmail = 'admin@opsvale.com',
  signOutAction,
}) => {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);


  // Compute initials (e.g. "Anis Zidan" -> "AZ")
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin/dashboard' },
    { id: 'visitors', label: 'Visitor Intelligence', icon: 'travel_explore', href: '/admin/visitors' },
    { id: 'analytics', label: 'Pipeline & Sales KPIs', icon: 'monitoring', href: '/admin/analytics' },
    {
      id: 'leads',
      label: 'Leads',
      icon: 'group',
      badge: newLeadsCount > 0 ? `${newLeadsCount}` : undefined,
      href: '/admin/leads',
    },
    { id: 'crm', label: 'CRM Contacts', icon: 'contacts_product', href: '/admin/crm' },
    {
      id: 'quotes',
      label: 'Quotes',
      icon: 'request_quote',
      badge: draftQuotesCount > 0 ? `${draftQuotesCount}` : undefined,
      href: '/admin/quotes',
    },
    { id: 'pricing', label: 'Pricing Engine', icon: 'monetization_on', href: '/admin/pricing' },
    { id: 'logistics', label: 'Logistics Hubs', icon: 'local_shipping', href: '/admin/logistics' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications', href: '/admin/notifications' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings' },
  ];

  const renderNavContent = () => (
    <div className="flex flex-col justify-between h-full overflow-y-auto">
      {/* Top Section */}
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1b2b48] flex items-center justify-between">
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileDrawerOpen(false)}
            className="flex items-center gap-3 cursor-pointer text-left"
          >
            <div className="w-9 h-9 bg-[#e77114] rounded flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-2xl">package</span>
            </div>
            <div>
              <span className="font-headline font-bold text-lg text-white block">OpsVale</span>
              <span className="font-mono-data text-[10px] text-[#8393b5] uppercase tracking-wider block">
                Ops Admin Portal
              </span>
            </div>
          </Link>

          {/* Close button inside mobile drawer */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(false)}
            className="lg:hidden text-[#8393b5] hover:text-white p-1 rounded-lg cursor-pointer"
            aria-label="Close admin menu"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-[#1b2b48] rounded-lg border border-[#4f5e7e]/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#e3c290] text-[#041632] font-headline font-bold flex items-center justify-center text-sm shadow-inner flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <span className="font-headline font-bold text-sm text-white block truncate">{userName}</span>
            <span className="font-mono-data text-[11px] text-[#8393b5] block truncate">{userEmail}</span>
          </div>
        </div>

        {/* New Quote Quick Action */}
        <div className="px-4 mb-4">
          <Link
            href="/quote"
            onClick={() => setMobileDrawerOpen(false)}
            className="w-full bg-[#e77114] hover:bg-[#c25e10] text-white py-2.5 px-4 rounded-lg font-mono-data text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer font-bold shadow-md min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            + New Quote
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg font-mono-data text-xs transition-all duration-150 cursor-pointer min-h-[40px] ${
                  isActive
                    ? 'bg-[#e77114] text-white font-bold shadow-sm'
                    : 'text-[#8393b5] hover:bg-[#1b2b48] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white text-[#e77114]' : 'bg-[#e77114] text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-[#1b2b48] space-y-2 font-mono-data text-xs">
        {/* Switch back to Customer Portal */}
        <Link
          href="/"
          onClick={() => setMobileDrawerOpen(false)}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#e3c290] hover:bg-[#1b2b48] rounded-lg transition-colors cursor-pointer min-h-[36px]"
        >
          <span className="material-symbols-outlined text-lg">storefront</span>
          <span>View Customer Site</span>
        </Link>

        <button
          type="button"
          onClick={() => alert('OpsVale Support Desk: support@opsvale.eu | Priority Phone: +31 10 998 012')}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#8393b5] hover:text-white hover:bg-[#1b2b48] rounded-lg transition-colors cursor-pointer min-h-[36px]"
        >
          <span className="material-symbols-outlined text-lg">help_outline</span>
          <span>Support</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-row w-full selection:bg-[#ffdeac] selection:text-[#281900]">
      {/* Real-time Toast Notifications Stream */}
      <AdminToastContainer />

      {/* Desktop Persistent Sidebar (>= lg) */}
      <aside className="hidden lg:flex w-64 bg-[#041632] text-white flex-shrink-0 border-r border-[#1b2b48] flex-col justify-between h-screen sticky top-0 z-40 overflow-y-auto">
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Overlay & Slide-over Panel (< lg) */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-[#041632] text-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Main Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 border-b border-[#e2e4ef] bg-white shadow-2xs sticky top-0 z-30">
          {/* Left: Mobile Menu Hamburger & Quick Search Trigger */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#041632] hover:bg-[#eff4ff] cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border border-[#c5c6ce]"
              aria-label="Open admin navigation"
            >
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>

            <span className="font-mono-data text-xs text-[#041632] font-bold hidden sm:inline-block">
              OpsVale Executive Portal
            </span>

            {/* Command Palette Trigger */}
            <AdminCommandPalette />
          </div>

          {/* Right: Notifications, User Email & Sign Out */}
          <div className="flex items-center gap-3 sm:gap-4">
            <AdminNotificationBell />
            <div className="h-4 w-px bg-[#e2e4ef]" />
            <span className="font-mono-data text-[11px] text-[#4f5e7e] hidden sm:inline-block truncate max-w-[180px]">
              {userName || userEmail}
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="font-mono-data text-[11px] uppercase tracking-wider text-[#041632] hover:text-[#e77114] border border-[#c5c6ce] rounded-md px-3 py-1.5 transition-colors cursor-pointer min-h-[36px] font-semibold"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* Content Outlet with fluid gutters */}
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
};
