import React from 'react';
import { getLegalConfig } from '@/lib/legal/config';
import { getDictionary } from '@/lib/i18n/getDictionary';
import { isValidLocale, DEFAULT_LOCALE, Locale } from '@/lib/i18n/config';

// Render at request time so statutory legal/entity details come from the live
// environment (COMPANY_* / LEGAL_* env vars) instead of being baked in at build.
// Without this the page is prerendered and the build-time (placeholder) values stick.
export const dynamic = 'force-dynamic';

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dict = getDictionary(locale);
  const legalConfig = getLegalConfig();

  return (
    <div className="w-full py-12 sm:py-16 max-w-[1000px] mx-auto px-4 sm:px-8 font-mono-data text-xs">
      <div className="mb-10 border-l-4 border-[#e77114] pl-6 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#735a31] uppercase tracking-widest font-semibold text-[11px]">
            Commercial B2B Sourcing Agreement
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
            VERSION {legalConfig.versions.termsVersion}
          </span>
        </div>
        <h1 className="font-headline text-3xl sm:text-4xl font-bold text-[#041632]">
          {dict.legal.termsTitle}
        </h1>
      </div>

      <div className="bg-white border border-[#c5c6ce] rounded-xl p-8 sm:p-10 shadow-sm space-y-8 text-[#44474d] leading-relaxed">
        {/* 1. Scope & B2B Exclusivity */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            1. Scope &amp; Commercial Exclusivity
          </h2>
          <p className="font-body text-xs">
            These Wholesale Supply Terms and Conditions apply exclusively to commercial entities, corporations, partnerships, and registered businesses (B2B) purchasing industrial corrugated pizza packaging through {legalConfig.company.legalName}. Consumer transactions (B2C) are explicitly excluded from this platform.
          </p>
        </section>

        {/* 2. Quotation Validity & Binding Contracts */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            2. Quotation Binding Periods &amp; Contract Formation
          </h2>
          <ul className="list-disc pl-5 space-y-2 font-body text-xs">
            <li>
              <strong>Commercial Proposals:</strong> Official commercial proposals issued via our digital portal are valid for 14 calendar days from the date of issue unless specified otherwise.
            </li>
            <li>
              <strong>Contract Acceptance:</strong> A binding contract of supply is formed when an authorized representative of the buyer accepts the proposal digitally via the portal or submits a signed purchase order referencing the Proposal Reference Code.
            </li>
            <li>
              <strong>Volume Specifications:</strong> Unit pricing is strictly conditioned on meeting the agreed contract batch volumes (MOQ) and production schedule.
            </li>
          </ul>
        </section>

        {/* 3. Incoterms & Delivery Logistics */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            3. Delivery Terms &amp; Logistics (Incoterms 2020)
          </h2>
          <p className="font-body text-xs">
            Unless agreed otherwise in writing in the formal proposal:
          </p>
          <ul className="list-disc pl-5 space-y-2 font-body text-xs">
            <li>
              Deliveries within the European Union are performed on <strong>DDP (Delivered Duty Paid - Incoterms 2020)</strong> terms to the designated buyer logistics depot or branch address.
            </li>
            <li>
              Risk of loss transfers upon physical unloading at the buyer’s designated delivery point.
            </li>
            <li>
              Palletized shipments are delivered on standard Euro-pallets (1200 × 800 mm). Unloading facilities suitable for heavy freight transport (e.g. loading dock or forklift) must be provided by the buyer.
            </li>
          </ul>
        </section>

        {/* 4. Manufacturing Tolerances & Quality Assurance */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            4. Manufacturing Tolerances &amp; Food-Contact Compliance
          </h2>
          <p className="font-body text-xs">
            Standard European corrugation and flexographic tolerances apply:
          </p>
          <ul className="list-disc pl-5 space-y-2 font-body text-xs">
            <li><strong>Quantity Over/Under Run:</strong> ±5% production variance on custom-printed runs due to automated high-speed corrugation setup.</li>
            <li><strong>Dimensional Tolerance:</strong> ±1.5 mm according to FEFCO standard industry norms.</li>
            <li>
              <strong>Food Safety:</strong> All packaging materials supplied conform to EU Regulation (EC) No 1935/2004 and Regulation (EC) No 2023/2006 (Good Manufacturing Practice).
            </li>
            {legalConfig.evidenceFlags.fscCertified && (
              <li>
                <strong>FSC Certification:</strong> Sourced through FSC Chain of Custody certified mills.
              </li>
            )}
          </ul>
        </section>

        {/* 5. Payment Terms & Title Retention */}
        <section className="space-y-3">
          <h2 className="font-headline text-lg font-bold text-[#041632] border-b border-[#c5c6ce] pb-2">
            5. Payment Terms &amp; Retention of Title
          </h2>
          <p className="font-body text-xs">
            Payment terms are specified in the individual proposal (standard terms: Net 30 days upon approved credit). Delivered packaging materials remain the legal property of {legalConfig.company.legalName} until complete invoice settlement has been received.
          </p>
        </section>
      </div>
    </div>
  );
}
