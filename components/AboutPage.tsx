'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export const AboutPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          {t('about.title')}
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-3">
          {t('about.title')}
        </h1>
        <p className="font-body text-base text-[#44474d] max-w-3xl leading-relaxed">
          {t('about.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
        <div className="space-y-6 font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
          <p>
            {t('about.missionDesc')}
          </p>
          <p>
            {t('about.networkDesc')}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 font-mono-data text-xs">
            <div className="p-4 bg-white border border-[#c5c6ce] rounded-lg">
              <span className="text-[#e77114] font-headline text-2xl font-bold block mb-1">99.8%</span>
              <span className="text-[#041632] font-semibold">{t('hero.statSlaLabel')}</span>
            </div>
            <div className="p-4 bg-white border border-[#c5c6ce] rounded-lg">
              <span className="text-[#e77114] font-headline text-2xl font-bold block mb-1">14 Hubs</span>
              <span className="text-[#041632] font-semibold">{t('hero.statHubsLabel')}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1b2b48] text-white p-6 sm:p-8 rounded-xl border border-[#4f5e7e] space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-[#e3c290]">verified</span>
            <h2 className="font-headline text-xl font-bold">{t('legal.foodContactEuClaim')}</h2>
          </div>
          <p className="font-body text-sm text-[#8393b5] leading-relaxed">
            All cardboard materials sourced through OpsVale are manufactured compliant with EU Directive 94/62/EC and EC 1935/2004 on food-contact packaging.
          </p>
          <ul className="space-y-3 font-mono-data text-xs text-[#dce9ff]">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>100% Recyclable post-consumer paper fiber</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>Non-toxic water-soluble print pigments</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#e3c290]">check_circle</span>
              <span>Zero PFAS / forever chemicals added</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
