'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export const Footer: React.FC = () => {
  const { t, locale } = useTranslation();

  const handleOpenCookieSettings = () => {
    window.dispatchEvent(new CustomEvent('opsvale_open_cookie_preferences'));
  };

  return (
    <footer className="w-full bg-[#041632] text-white border-t border-[#1b2b48] relative z-10 font-mono-data text-xs">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Main 3-Column Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-10 sm:pb-12 border-b border-[#1b2b48]">
          {/* Column 1: Brand & Logistics Node Info */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-5 flex flex-col justify-between">
            <div>
              <Link
                href={`/${locale}`}
                className="font-headline text-2xl font-bold text-white flex items-center gap-2 mb-3 hover:opacity-90 transition-opacity cursor-pointer text-left w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e77114] rounded-sm"
              >
                <span className="material-symbols-outlined text-2xl text-[#e77114]">package</span>
                <span>{t('common.brandName')}</span>
              </Link>
              <p className="font-body text-sm text-[#8393b5] max-w-sm leading-relaxed mb-5">
                {t('common.tagline')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-[#8393b5] bg-[#0b1c36] border border-[#1b2b48] px-3 py-2 rounded-sm w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-mono-data">14 European Logistics Hubs Operational</span>
            </div>
          </div>

          {/* Column 2: Platform & Services */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-3">
            <span className="text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold font-mono-data">
              Platform &amp; Services
            </span>
            <ul className="space-y-1 text-xs text-[#8393b5]">
              <li>
                <Link
                  href={`/${locale}/products`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('nav.products')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/how-it-works`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('nav.howItWorks')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/calculator`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('nav.calculator')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('nav.about')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Compliance Desk */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-4">
            <span className="text-xs text-[#e3c290] uppercase tracking-widest block mb-4 font-semibold font-mono-data">
              Legal &amp; Compliance Desk
            </span>
            <ul className="space-y-1 text-xs text-[#8393b5] mb-6">
              <li>
                <Link
                  href={`/${locale}/imprint`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('legal.imprintTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('legal.privacyTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('legal.termsTitle')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/cookies`}
                  className="hover:text-white transition-colors cursor-pointer py-1.5 inline-flex items-center min-h-[44px] sm:min-h-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e77114] rounded-sm"
                >
                  {t('legal.cookiesTitle')}
                </Link>
              </li>
            </ul>

            {/* Platform & Logistics Operational Node Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#0b1c36] border border-[#1b2b48] text-[11px] text-[#8393b5] font-mono-data">
              <span className="material-symbols-outlined text-[14px] text-[#e3c290]">hub</span>
              <span>Network Node:</span>
              <span className="text-[#e3c290] font-semibold tracking-wide">OPS-VALE-EUR-01</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Simplified, Non-Redundant, Essential Information */}
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#8393b5]">
          <p className="text-center sm:text-left text-[#8393b5] leading-relaxed">
            © 2026 {t('common.brandName')}. {t('common.allRightsReserved')}
          </p>
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="text-[#e3c290] hover:text-[#f3d9b0] hover:underline cursor-pointer inline-flex items-center gap-1.5 py-2 px-3 rounded-sm min-h-[44px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e77114]"
              aria-label={t('consent.customize')}
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>{t('consent.customize')}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

