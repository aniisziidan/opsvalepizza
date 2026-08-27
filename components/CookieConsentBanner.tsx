'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getClientConsent,
  saveClientConsent,
} from '@/lib/consent/consentManager';
import {
  CookieConsentRecord,
  CURRENT_CONSENT_VERSION,
  DEFAULT_CONSENT_STATE,
} from '@/lib/consent/types';
import { useTranslation } from '@/lib/i18n/context';

export const CookieConsentBanner: React.FC = () => {
  const { t, locale } = useTranslation();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Preference switches
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferences, setPreferences] = useState(false);

  useEffect(() => {
    const existing = getClientConsent();
    if (!existing) {
      setShowBanner(true);
    } else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      setPreferences(existing.preferences);
    }

    const handleOpenModal = () => {
      const current = getClientConsent() || DEFAULT_CONSENT_STATE;
      setAnalytics(current.analytics);
      setMarketing(current.marketing);
      setPreferences(current.preferences);
      setShowModal(true);
    };

    window.addEventListener('opsvale_open_cookie_preferences', handleOpenModal);
    return () => {
      window.removeEventListener('opsvale_open_cookie_preferences', handleOpenModal);
    };
  }, []);

  const handleAcceptAll = () => {
    const record: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    };
    saveClientConsent(record);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleEssentialOnly = () => {
    const record: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false,
    };
    saveClientConsent(record);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSaveCustomPreferences = () => {
    const record: CookieConsentRecord = {
      version: CURRENT_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      necessary: true,
      analytics,
      marketing,
      preferences,
    };
    saveClientConsent(record);
    setShowBanner(false);
    setShowModal(false);
  };

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && !showModal && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 bg-transparent pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="max-w-4xl mx-auto bg-[#041632] text-white p-6 rounded-2xl shadow-2xl border border-[#4f5e7e] pointer-events-auto font-mono-data text-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-[#e77114]">cookie</span>
                <h4 className="font-headline text-base font-bold text-white">
                  {t('consent.bannerTitle')}
                </h4>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8393b5]">
                <Link href={`/${locale}/privacy`} className="hover:text-white underline">
                  {t('legal.privacyTitle')}
                </Link>
                <span>•</span>
                <Link href={`/${locale}/cookies`} className="hover:text-white underline">
                  {t('legal.cookiesTitle')}
                </Link>
              </div>
            </div>

            <p className="font-body text-xs text-[#8393b5] leading-relaxed">
              {t('consent.bannerDesc')}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-4 py-2 border border-[#4f5e7e] hover:border-white text-[#d7e2ff] rounded-lg transition-colors cursor-pointer"
              >
                {t('consent.customize')}
              </button>
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-4 py-2 bg-[#1b2b48] hover:bg-[#25395f] text-white border border-[#4f5e7e] rounded-lg font-bold transition-colors cursor-pointer"
              >
                {t('consent.essentialOnly')}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 bg-[#e77114] hover:bg-[#c25e10] text-white rounded-lg font-bold shadow-md transition-colors cursor-pointer"
              >
                {t('consent.acceptAll')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Granular Preferences Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-[#c5c6ce] font-mono-data text-xs space-y-6 animate-in fade-in zoom-in-95 duration-150 text-[#041632]">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl text-[#e77114]">tune</span>
                <h3 className="font-headline text-lg font-bold text-[#041632]">
                  {t('legal.cookieSettings')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="font-body text-xs text-[#44474d] leading-relaxed">
              {t('consent.bannerDesc')}
            </p>

            <div className="space-y-4 divide-y divide-[#c5c6ce]/60">
              {/* Necessary */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#041632]">{t('consent.categoryNecessary')}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      REQUIRED
                    </span>
                  </div>
                  <p className="font-body text-[11px] text-[#75777e]">
                    {t('consent.categoryNecessaryDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="mt-1 w-4 h-4 rounded text-[#e77114] cursor-not-allowed opacity-60"
                />
              </div>

              {/* Analytics */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-[#041632]">{t('consent.categoryAnalytics')}</span>
                  <p className="font-body text-[11px] text-[#75777e]">
                    {t('consent.categoryAnalyticsDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#e77114] cursor-pointer"
                />
              </div>

              {/* Marketing */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-[#041632]">{t('consent.categoryMarketing')}</span>
                  <p className="font-body text-[11px] text-[#75777e]">
                    {t('consent.categoryMarketingDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#e77114] cursor-pointer"
                />
              </div>

              {/* Preferences */}
              <div className="pt-3 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-[#041632]">{t('consent.categoryPreferences')}</span>
                  <p className="font-body text-[11px] text-[#75777e]">
                    {t('consent.categoryPreferencesDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences}
                  onChange={(e) => setPreferences(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#e77114] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-[#c5c6ce]">
              <button
                type="button"
                onClick={handleEssentialOnly}
                className="px-4 py-2 border border-[#c5c6ce] hover:bg-gray-50 rounded-lg text-gray-700 font-semibold cursor-pointer"
              >
                {t('consent.essentialOnly')}
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 bg-[#1b2b48] hover:bg-[#041632] text-white rounded-lg font-bold cursor-pointer transition-colors"
                >
                  {t('consent.acceptAll')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomPreferences}
                  className="px-5 py-2 bg-[#e77114] hover:bg-[#c25e10] text-white rounded-lg font-bold shadow-md cursor-pointer transition-colors"
                >
                  {t('consent.savePreferences')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
