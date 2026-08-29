'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/context';
import { LOCALES, LOCALE_METADATA, Locale } from '@/lib/i18n/config';

export const TopNavBar: React.FC = () => {
  const pathname = usePathname();
  const { t, locale, changeLocale } = useTranslation();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: t('nav.home'), href: `/${locale}` },
    { label: t('nav.products'), href: `/${locale}/products` },
    { label: t('nav.howItWorks'), href: `/${locale}/how-it-works` },
    { label: t('nav.calculator'), href: `/${locale}/calculator` },
    { label: t('nav.about'), href: `/${locale}/about` },
  ];


  // Close language dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <nav className="w-full bg-[#f8f9ff] text-[#041632] sticky top-0 border-b border-[#c5c6ce] z-40 transition-colors">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 sm:gap-6">
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

        {/* Trailing Actions (Desktop & Mobile) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="text-[#44474d] hover:text-[#041632] transition-colors flex items-center gap-1 p-2 rounded hover:bg-[#eff4ff] cursor-pointer font-mono-data text-xs font-bold min-h-[44px] min-w-[44px] justify-center"
              aria-label="Select language"
              aria-expanded={langDropdownOpen}
            >
              <span className="text-base">{LOCALE_METADATA[locale]?.flag || '🌐'}</span>
              <span className="uppercase text-xs">{locale}</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>

            {langDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-[#c5c6ce] rounded-lg shadow-xl py-1 z-50 font-mono-data text-xs animate-in fade-in zoom-in-95 duration-100">
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
                      className={`w-full text-left px-3.5 py-2.5 flex items-center gap-2 hover:bg-[#eff4ff] cursor-pointer transition-colors ${
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

          {/* Primary CTA (Desktop) */}
          <Link
            href={`/${locale}/quote`}
            className="hidden sm:inline-flex items-center justify-center bg-[#e77114] text-white px-5 sm:px-6 py-2.5 sm:py-3 font-mono-data text-xs uppercase tracking-wider hover:bg-[#c25e10] transition-colors shadow-[0px_4px_20px_rgba(27,43,72,0.08)] cursor-pointer font-semibold rounded-sm min-h-[44px]"
          >
            {t('common.requestQuoteCta')}
          </Link>

          {/* Mobile Menu Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#041632] hover:bg-[#eff4ff] cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors border border-transparent hover:border-[#c5c6ce]"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#c5c6ce] bg-[#f8f9ff] px-4 py-6 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <ul className="space-y-1 font-mono-data text-sm">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-[#041632] text-white font-bold'
                        : 'text-[#44474d] hover:bg-[#eff4ff] hover:text-[#041632]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="material-symbols-outlined text-base">
                      {isActive ? 'check' : 'chevron_right'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Mobile CTA */}
          <div className="pt-2">
            <Link
              href={`/${locale}/quote`}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full bg-[#e77114] text-white py-3.5 px-4 font-mono-data text-xs uppercase tracking-wider hover:bg-[#c25e10] transition-colors shadow-md flex items-center justify-center gap-2 font-bold rounded-lg min-h-[48px]"
            >
              <span>{t('common.requestQuoteCta')}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};
