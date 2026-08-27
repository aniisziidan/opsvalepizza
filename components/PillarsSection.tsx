'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export const PillarsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section className="w-full bg-[#f8f9ff] py-16 sm:py-20 border-b border-[#c5c6ce]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 md:px-16">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632] mb-4">
            {t('pillars.title')}
          </h2>
          <p className="font-body text-base text-[#44474d] max-w-2xl mx-auto">
            {t('pillars.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#c5c6ce] bg-white rounded-sm overflow-hidden shadow-sm">
          {/* Pillar 1 */}
          <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[#c5c6ce] hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">factory</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">
              {t('pillars.pillar1Title')}
            </h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              {t('pillars.pillar1Desc')}
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="p-8 sm:p-10 border-b md:border-b-0 md:border-r border-[#c5c6ce] hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">verified</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">
              {t('pillars.pillar2Title')}
            </h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              {t('pillars.pillar2Desc')}
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 sm:p-10 hover:bg-[#eff4ff] transition-colors duration-300">
            <div className="w-12 h-12 bg-[#1b2b48] rounded-sm flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-[#eaf1ff] text-2xl">hub</span>
            </div>
            <h3 className="font-headline text-2xl font-bold text-[#041632] mb-3">
              {t('pillars.pillar3Title')}
            </h3>
            <p className="font-body text-sm sm:text-base text-[#44474d] leading-relaxed">
              {t('pillars.pillar3Desc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
