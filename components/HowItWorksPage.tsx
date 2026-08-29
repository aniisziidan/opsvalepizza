'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/context';

export const HowItWorksPage: React.FC = () => {
  const { t, locale } = useTranslation();

  const steps = [
    {
      step: '01',
      title: t('howItWorks.step1Title'),
      desc: t('howItWorks.step1Desc'),
      icon: 'calculate',
    },
    {
      step: '02',
      title: t('howItWorks.step2Title'),
      desc: t('howItWorks.step2Desc'),
      icon: 'inventory_2',
    },
    {
      step: '03',
      title: t('howItWorks.step3Title'),
      desc: t('howItWorks.step3Desc'),
      icon: 'hub',
    },
    {
      step: '04',
      title: t('howItWorks.step4Title'),
      desc: t('howItWorks.step4Desc'),
      icon: 'local_shipping',
    },
  ];

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-12 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          {t('howItWorks.title')}
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-3">
          {t('howItWorks.title')}
        </h1>
        <p className="font-body text-base text-[#44474d] max-w-3xl leading-relaxed">
          {t('howItWorks.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {steps.map((s) => (
          <div
            key={s.step}
            className="bg-white border border-[#c5c6ce] rounded-xl p-6 sm:p-8 flex flex-col justify-between hover:border-[#041632] transition-colors relative"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="font-headline text-3xl font-black text-[#e77114]">{s.step}</span>
                <span className="material-symbols-outlined text-2xl text-[#1b2b48]">{s.icon}</span>
              </div>
              <h2 className="font-headline text-lg font-bold text-[#041632] mb-3">{s.title}</h2>
              <p className="font-body text-xs sm:text-sm text-[#44474d] leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#eff4ff] border border-[#c5c6ce] p-6 sm:p-10 md:p-12 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 sm:gap-8">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#041632] mb-2">{t('calculator.title')}</h2>
          <p className="font-body text-sm text-[#44474d]">{t('calculator.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full md:w-auto">
          <Link
            href={`/${locale}/calculator`}
            className="w-full sm:w-auto text-center bg-[#e77114] text-white px-6 py-3.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#c25e10] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            {t('common.calculateSavingsCta')}
          </Link>
          <Link
            href={`/${locale}/quote`}
            className="w-full sm:w-auto text-center bg-[#041632] text-white px-6 py-3.5 rounded-lg font-mono-data text-xs uppercase font-bold tracking-wider hover:bg-[#1b2b48] transition-colors cursor-pointer min-h-[44px] flex items-center justify-center"
          >
            {t('common.requestQuoteCta')}
          </Link>
        </div>
      </div>
    </div>
  );
};
