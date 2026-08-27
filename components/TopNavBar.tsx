'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { LOCALES, LOCALE_METADATA, Locale } from '@/lib/i18n/config';

export const TopNavBar: React.FC = () => {
  const pathname = usePathname();
  const { t, locale, changeLocale } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const navItems = [
    { label: t('nav.home'), href: `/${locale}` },
    { label: t('nav.products'), href: `/${locale}/products` },
    { label: t('nav.howItWorks'), href: `/${locale}/how-it-works` },
    { label: t('nav.calculator'), href: `/${locale}/calculator` },
    { label: t('nav.about'), href: `/${locale}/about` },
  ];

  return (
    <nav className="bg-[#f8f9ff] text-[#041632] sticky top-0 border-b border-[#c5c6ce] z-40 transition-colors">
      <div className="flex justify-between items-center w-full px-4 sm:px-8 md:px-16 max-w-[1440px] mx-auto h-20">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link
            href={`/${locale}`}
            className="font-headline text-2xl sm:text-3xl font-bold text-[#041632] flex items-center gap-2 hover:opacity-90 transition-opacity text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-3xl text-[#e77114]">package</span>
            {t('common.brandName')}
          </Link>
        </div>

        {/* Navigation Links (Desktop) */}
        <ul className="hidden md:flex items-center gap-6 lg:gap-8 font-mono-data text-xs tracking-wider">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`cursor-pointer transition-all duration-200 py-1.5 px-2.5 rounded text-xs ${
                    isActive
                      ? 'text-[#041632] font-bold border-b-2 border-[#041632] opacity-100'
                      : 'text-[#44474d] hover:text-[#041632] hover:bg-[#eff4ff]'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Trailing Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Admin Switcher Badge for easy access to Ops portal */}
          <Link
            href="/admin/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 bg-[#1b2b48] text-[#d7e2ff] hover:bg-[#041632] px-3 py-2 rounded text-xs font-mono-data transition-colors cursor-pointer border border-[#8393b5]/30"
            title="Switch to Internal Operations Portal"
          >
            <span className="material-symbols-outlined text-[16px] text-[#e3c290]">shield_person</span>
            <span>{t('common.opsPortal')}</span>
          </Link>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-1.5 p-2 rounded hover:bg-[#eff4ff] cursor-pointer font-mono-data text-xs font-bold"
              aria-label="Select language"
            >
              <span className="text-base">{LOCALE_METADATA[locale]?.flag || '🌐'}</span>
              <span className="uppercase">{locale}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white border border-[#c5c6ce] rounded-lg shadow-xl py-1 z-50 font-mono-data text-xs animate-in fade-in zoom-in-95 duration-100">
                {LOCALES.map((l: Locale) => {
                  const meta = LOCALE_METADATA[l];
                  const isSelected = locale === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        changeLocale(l);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#eff4ff] cursor-pointer transition-colors ${
                        isSelected ? 'font-bold text-[#e77114] bg-[#f8f9ff]' : 'text-[#44474d]'
                      }`}
                    >
                      <span className="text-base">{meta.flag}</span>
                      <span>{meta.nativeName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <Link
            href={`/${locale}/quote`}
            className="bg-[#e77114] text-white px-5 sm:px-6 py-2.5 sm:py-3 font-mono-data text-xs uppercase tracking-wider hover:bg-[#c25e10] transition-colors shadow-[0px_4px_20px_rgba(27,43,72,0.08)] cursor-pointer font-semibold rounded-sm"
          >
            {t('common.requestQuoteCta')}
          </Link>
        </div>
      </div>

      {/* Mobile nav bar row */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-t border-[#c5c6ce]/50 bg-[#eff4ff]/60 overflow-x-auto gap-2 font-mono-data text-xs">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap px-2.5 py-1 rounded text-[11px] ${
              pathname === item.href
                ? 'bg-[#041632] text-white font-bold'
                : 'text-[#44474d] hover:text-[#041632]'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/admin/dashboard"
          className="whitespace-nowrap px-2.5 py-1 rounded text-[11px] bg-[#1b2b48] text-[#e3c290] font-bold"
        >
          {t('common.opsPortal')}
        </Link>
      </div>
    </nav>
  );
};
