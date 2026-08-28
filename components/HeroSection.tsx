'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/context';

export const HeroSection: React.FC = () => {
  const { t, locale } = useTranslation();

  return (
    <section className="w-full border-b border-[#c5c6ce] relative overflow-hidden bg-[#eff4ff]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[716px]">
        {/* Left Text Content */}
        <div className="lg:col-span-6 flex flex-col justify-center py-12 lg:py-20 lg:pr-16 relative z-10 lg:border-r border-[#c5c6ce]">
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 bg-[#dce9ff] px-3 py-1.5 w-fit border border-[#c5c6ce] rounded-sm">
            <span className="w-2 h-2 rounded-full bg-[#e77114] animate-pulse"></span>
            <span className="font-mono-data text-xs text-[#041632] uppercase tracking-wider font-semibold">
              {t('hero.badge')}
            </span>
          </div>

          <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-[#041632] mb-6 leading-tight max-w-xl">
            {t('hero.headline')}{' '}
            <span className="text-[#e77114]">{t('hero.headlineHighlight')}</span>
          </h1>

          <p className="font-body text-base text-[#44474d] mb-8 sm:mb-10 max-w-lg leading-relaxed">
            {t('hero.subheadline')}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              href={`/${locale}/calculator`}
              className="w-full sm:w-auto bg-[#e77114] text-white px-8 py-4 font-mono-data text-xs uppercase tracking-widest hover:bg-[#c25e10] transition-colors shadow-[0px_4px_20px_rgba(27,43,72,0.08)] cursor-pointer text-center font-bold rounded-sm"
            >
              {t('hero.primaryCta')}
            </Link>
            <Link
              href={`/${locale}/quote`}
              className="w-full sm:w-auto border-2 border-[#041632] text-[#041632] bg-transparent px-8 py-4 font-mono-data text-xs uppercase tracking-widest hover:bg-[#041632] hover:text-white transition-colors cursor-pointer text-center font-bold rounded-sm"
            >
              {t('hero.secondaryCta')}
            </Link>
          </div>
        </div>

        {/* Right Visual Content */}
        <div className="lg:col-span-6 relative bg-[#cbdbf5] h-full min-h-[380px] sm:min-h-[440px] lg:min-h-full">
          <div className="absolute inset-0 p-4 sm:p-8 flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                src="/images/hero-warehouse.jpg"
                alt="Neatly stacked, premium Kraft paper pizza boxes in a massive, brightly lit modern industrial warehouse."
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover border border-[#c5c6ce] shadow-lg filter contrast-105 rounded-sm"
              />
            </div>
          </div>

          {/* Decorative Overlay Elements */}
          <div className="absolute top-6 sm:top-12 right-6 sm:right-12 bg-white/95 backdrop-blur-sm border border-[#c5c6ce] p-4 shadow-[0px_4px_20px_rgba(27,43,72,0.08)] flex items-center gap-4 rounded-sm font-mono-data">
            <div className="bg-[#dce9ff] p-2.5 rounded-sm flex items-center justify-center">
              <span className="material-symbols-outlined text-[#e77114] text-2xl">local_shipping</span>
            </div>
            <div>
              <p className="text-[11px] text-[#44474d] uppercase font-semibold">14 European Hubs</p>
              <p className="font-body text-sm font-bold text-[#041632]">Active Operations</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
