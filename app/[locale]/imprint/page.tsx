import React from 'react';
import { getLegalConfig } from '@/lib/legal/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { isValidLocale, DEFAULT_LOCALE, Locale } from '@/lib/i18n/config';

// Render at request time so statutory legal/entity details come from the live
// environment (COMPANY_* / LEGAL_* env vars) instead of being baked in at build.
// Without this the page is prerendered and the build-time (placeholder) values stick.
export const dynamic = 'force-dynamic';

interface ImprintPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ImprintPage({ params }: ImprintPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const legalConfig = getLegalConfig();

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1000px] mx-auto px-4 sm:px-8 font-mono-data text-xs">
      <div className="mb-10 border-l-4 border-[#e77114] pl-6 py-2">
        <span className="text-[#735a31] uppercase tracking-widest block mb-1 font-semibold text-[11px]">
          Statutory Disclosure (TMG §5 / EU DSA)
        </span>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632]">
          {dict.legal.imprintTitle}
        </h1>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl p-8 sm:p-10 shadow-sm space-y-8 text-[#44474d] leading-relaxed">
        {/* Company Identity */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            {dict.legal.companyInformation}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[#75777e] block">Corporate Legal Entity</span>
              <span className="font-bold text-[#041632] text-sm">{legalConfig.company.legalName}</span>
              <span className="text-[11px] text-gray-500 block">Trading as {legalConfig.company.tradingName}</span>
            </div>
            <div>
              <span className="text-[#75777e] block">{dict.legal.registeredAddress}</span>
              <span className="font-bold text-[#041632]">{legalConfig.company.registeredAddress}</span>
            </div>
          </div>
        </section>

        {/* Commercial Registration & Tax ID */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            Registration &amp; Tax Identifiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-[#75777e] block">{dict.legal.registrationNumber}</span>
              <span className="font-bold text-[#041632]">{legalConfig.company.registrationNumber}</span>
            </div>
            <div>
              <span className="text-[#75777e] block">{dict.legal.vatId}</span>
              <span className="font-bold text-[#041632]">{legalConfig.company.vatId}</span>
            </div>
            <div>
              <span className="text-[#75777e] block">{dict.legal.managingDirector}</span>
              <span className="font-bold text-[#041632]">{legalConfig.company.managingDirector}</span>
            </div>
            <div>
              <span className="text-[#75777e] block">{dict.legal.contactInformation}</span>
              <span className="font-bold text-[#041632]">
                E-Mail: <a href={`mailto:${legalConfig.company.contactEmail}`} className="text-blue-700 underline">{legalConfig.company.contactEmail}</a>
              </span>
              {legalConfig.company.phone && (
                <span className="block text-gray-600">Tel: {legalConfig.company.phone}</span>
              )}
            </div>
          </div>
        </section>

        {/* Online Dispute Resolution (ODR) Statement */}
        <section className="space-y-3 pt-4 border-t border-[#c5c6ce]">
          <h2 className="font-headline text-base font-bold text-[#041632]">
            European Online Dispute Resolution (ODR)
          </h2>
          <p className="font-body text-xs">
            The European Commission provides a platform for online dispute resolution (ODR):{' '}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline font-bold"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Our contact email address can be found above. We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board, as our services are provided exclusively to commercial business entities (B2B).
          </p>
        </section>

        {/* Technical & Commercial Scope */}
        <section className="space-y-2 pt-2 border-t border-[#c5c6ce]">
          <p className="font-body text-[11px] text-[#75777e]">
            {dict.legal.termsNotice}
          </p>
        </section>
      </div>
    </div>
  );
}
