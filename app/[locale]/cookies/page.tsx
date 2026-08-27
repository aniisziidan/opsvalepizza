'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export default function CookiesPage() {
  const { t } = useTranslation();

  const handleOpenPreferences = () => {
    window.dispatchEvent(new CustomEvent('opsvale_open_cookie_preferences'));
  };

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1000px] mx-auto px-4 sm:px-8 font-mono-data text-xs">
      <div className="mb-10 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="text-[#735a31] uppercase tracking-widest block mb-1 font-semibold text-[11px]">
          ePrivacy &amp; GDPR Disclosure
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632]">
          {t('legal.cookiesTitle')}
        </h1>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl p-8 sm:p-10 shadow-sm space-y-8 text-[#44474d] leading-relaxed">
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            Overview of Cookie Technologies
          </h2>
          <p className="font-body text-xs">
            This platform uses first-party cookies to provide security, language preferences, session authentication, and quote management. In compliance with the European ePrivacy Directive and GDPR, non-essential cookies are blocked by default and require your explicit consent.
          </p>
          <div className="pt-2">
            <button
              onClick={handleOpenPreferences}
              className="bg-[#1b2b48] hover:bg-[#041632] text-white px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer shadow-sm"
            >
              {t('legal.cookieSettings')}
            </button>
          </div>
        </section>

        {/* Detailed Table of Cookies */}
        <section className="space-y-4">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            Cookies Deployed on OpsVale
          </h2>

          <div className="overflow-x-auto border border-[#c5c6ce] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9ff] border-b border-[#c5c6ce] text-[#75777e] uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Cookie Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Lifespan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c6ce]/50 font-body text-xs">
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#041632]">opsvale_consent_v1</td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-800 font-bold">Strictly Necessary</td>
                  <td className="py-2.5 px-3">Stores your consent choices and category preferences.</td>
                  <td className="py-2.5 px-3 font-mono">1 Year</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#041632]">NEXT_LOCALE</td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-800 font-bold">Strictly Necessary</td>
                  <td className="py-2.5 px-3">Remembers your chosen display language across visits.</td>
                  <td className="py-2.5 px-3 font-mono">1 Year</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#041632]">authjs.session-token</td>
                  <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-800 font-bold">Strictly Necessary</td>
                  <td className="py-2.5 px-3">Secures administrator login sessions on the operations portal.</td>
                  <td className="py-2.5 px-3 font-mono">Session / 24h</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 pt-4 border-t border-[#c5c6ce]">
          <h2 className="font-headline text-base font-bold text-[#041632]">
            Managing &amp; Withdrawing Consent
          </h2>
          <p className="font-body text-xs">
            You may adjust or withdraw your cookie consent at any time by clicking the &quot;Cookie Settings&quot; link in the footer or utilizing the settings button above. Changes take effect immediately.
          </p>
        </section>
      </div>
    </div>
  );
}
